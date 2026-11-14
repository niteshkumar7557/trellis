#!/usr/bin/env bash
# ON THE LAPTOP: build, push and deploy the current commit (docs/aws.md §6).
#
#   ./deploy/release.sh            from the repo root, on a clean, committed tree
#
# Steps, each printed as it runs:
#   1. the AWS account check (aws.md §2): stop unless it is the Trellis account
#   2. build both images for linux/arm64 (the server is a Graviton t4g.small)
#   3. push them to ECR, tagged with the commit's short hash
#   4. copy deploy/ to /opt/trellis and run deploy.sh <tag> there, through Session
#      Manager (no SSH)
#   5. clear CloudFront's cache, so visitors get the new pages and not last week's
set -euo pipefail

export AWS_PROFILE=trellis
REGION=ap-southeast-2
ACCOUNT_EXPECTED=631603562964
SITE=trellis.niteshkumar.xyz
step() { printf '\n== %s\n' "$*"; }

cd "$(git rev-parse --show-toplevel)"

step "1. Account check"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
if [[ "$ACCOUNT" != "$ACCOUNT_EXPECTED" ]]; then
  echo "Signed in to $ACCOUNT, not the Trellis account $ACCOUNT_EXPECTED. Run: aws login --profile trellis" >&2
  exit 1
fi
# An image must be exactly one commit. Uncommitted changes would ship code that no tag
# describes, and "what is running?" would have no answer.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Commit or stash your changes first: the tag must describe exactly what ships." >&2
  exit 1
fi
TAG=$(git rev-parse --short HEAD)
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
echo "Releasing ${TAG} to ${REGISTRY}"

step "2. Build (linux/arm64)"
docker build --platform linux/arm64 -f backend/Dockerfile -t "${REGISTRY}/trellis/backend:${TAG}" .
docker build --platform linux/arm64 -f frontend/Dockerfile \
  --build-arg NEXT_PUBLIC_GOOGLE_SIGNIN=on \
  -t "${REGISTRY}/trellis/frontend:${TAG}" .

step "3. Push to ECR"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"
docker push "${REGISTRY}/trellis/backend:${TAG}"
docker push "${REGISTRY}/trellis/frontend:${TAG}"

step "4. Deploy on the server"
# Found by its Name tag, so no instance id has to be kept up to date here.
INSTANCE=$(aws ec2 describe-instances --region "$REGION" \
  --filters Name=tag:Name,Values=trellis-prod Name=instance-state-name,Values=running \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
[[ "$INSTANCE" == i-* ]] || { echo "No running instance named trellis-prod." >&2; exit 1; }
# The files in deploy/ travel with the command, base64-encoded (a few KB), so the server
# always runs the compose file and Caddyfile of THIS commit. No git checkout on the server.
PARAMS=$(python3 - "$TAG" <<'PY'
import base64, json, sys
tag = sys.argv[1]
cmds = ["set -e", "mkdir -p /opt/trellis", "chmod 700 /opt/trellis"]
files = ["docker-compose.yml", "Caddyfile", "deploy.sh", "env-from-ssm.sh", "backup.sh", "restore-test.sh",
         "trellis-backup.service", "trellis-backup.timer"]
for name in files:
    data = base64.b64encode(open(f"deploy/{name}", "rb").read()).decode()
    cmds.append(f"echo {data} | base64 -d > /opt/trellis/{name}")
cmds += [
    "chmod 700 /opt/trellis/*.sh",
    # The nightly backup timer: (re)installed every release, so it always matches git.
    "cp /opt/trellis/trellis-backup.service /opt/trellis/trellis-backup.timer /etc/systemd/system/",
    "systemctl daemon-reload",
    "systemctl enable --now trellis-backup.timer",
    f"/opt/trellis/deploy.sh {tag}",
]
print(json.dumps({"commands": cmds}))
PY
)
CMD=$(aws ssm send-command --region "$REGION" --instance-ids "$INSTANCE" \
  --document-name AWS-RunShellScript --comment "deploy ${TAG}" \
  --parameters "$PARAMS" --timeout-seconds 900 \
  --query Command.CommandId --output text)
# Poll until it finishes, up to 10 minutes: the first deploy pulls both images (~500 MB).
# (aws ssm wait gives up after ~100 s, which is too short for that.)
for _ in $(seq 1 120); do
  STATUS=$(aws ssm get-command-invocation --region "$REGION" --command-id "$CMD" --instance-id "$INSTANCE" \
    --query Status --output text 2>/dev/null || echo Pending)
  [[ "$STATUS" == Pending || "$STATUS" == InProgress || "$STATUS" == Delayed ]] || break
  sleep 5
done
aws ssm get-command-invocation --region "$REGION" --command-id "$CMD" --instance-id "$INSTANCE" \
  --query '[StandardOutputContent,StandardErrorContent]' --output text
[[ "$STATUS" == Success ]] || { echo "The deploy did not succeed ($STATUS). The old version may still be running." >&2; exit 1; }

step "5. Clear CloudFront's cache"
# Pages are cached at the edges for up to a year (aws.md §4); after a deploy they would
# point at JavaScript files the new server no longer has. "/*" counts as ONE path, and
# the first 1,000 paths a month are free.
DIST=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Aliases.Items, '${SITE}')].Id | [0]" --output text)
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" --query Invalidation.Id --output text

echo
echo "Done: https://${SITE} runs ${TAG}. Check https://${SITE}/api/health"
