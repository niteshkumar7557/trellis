#!/usr/bin/env bash
# ON THE SERVER: runs one version of Trellis (docs/aws.md §6 "A deploy").
#
#   sudo /opt/trellis/deploy.sh <tag>     e.g. deploy.sh 3f9c2ab
#
# The tag is the git commit the images were built from (deploy/release.sh pushes them).
# Going back to the previous version is the same command with the previous tag.
set -euo pipefail
# Session Manager runs commands with a short PATH; the AWS CLI is a snap, in /snap/bin.
export PATH="$PATH:/snap/bin" AWS_REGION=ap-southeast-2

TAG=${1:?usage: deploy.sh <tag>}
cd /opt/trellis

# 1. Fresh secrets, then remember which tag is running, so a plain `docker compose up`
#    later (after a reboot, say) starts the same version.
./env-from-ssm.sh
sed -i '/^TAG=/d' .env
echo "TAG=${TAG}" >> .env
source <(grep '^REGISTRY=' .env)

# 2. Sign in to ECR with the server's role (a 12-hour token; nothing stored for long).
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin "$REGISTRY"

# 3. Pull first, so the site keeps running during the download; then restart only what
#    changed. Compose runs migrate (and waits for it) before the new API starts.
docker compose pull --quiet
docker compose up -d --remove-orphans

# 4. Wait for the API's health check. A deploy that never gets healthy says so loudly.
for _ in $(seq 1 30); do
  status=$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q api)" 2>/dev/null || echo starting)
  if [[ "$status" == healthy ]]; then
    echo "Trellis ${TAG} is up."
    docker image prune -f >/dev/null # old images would slowly fill the 30 GB disk
    exit 0
  fi
  sleep 2
done
echo "The API is not healthy after 60 seconds. Look at: docker compose logs api migrate" >&2
exit 1
