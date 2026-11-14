#!/usr/bin/env bash
# ON THE SERVER: writes /opt/trellis/.env from Parameter Store (docs/aws.md §6).
#
# Every parameter under /trellis/prod/ becomes one line, named after the last part of its
# path:  /trellis/prod/JWT_SECRET  →  JWT_SECRET=...
# The server's role may read that path and nothing else, so no AWS keys are needed.
#
# Why a file at all: docker compose reads .env to fill in docker-compose.yml. Why from
# Parameter Store and not typed by hand: the secrets live in one audited place, and a
# rebuilt server gets them back with one command.
set -euo pipefail
# Session Manager runs commands with a short PATH; the AWS CLI is a snap, in /snap/bin.
export PATH="$PATH:/snap/bin" AWS_REGION=ap-southeast-2

cd /opt/trellis
REGION=ap-southeast-2
# The registry the images come from: this account's ECR in Sydney. Not a secret.
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

# umask 077: the file is created readable by its owner only, never for a moment by everyone.
umask 077
tmp=$(mktemp .env.XXXX)
{
  echo "# Written by env-from-ssm.sh on $(date -u +%FT%TZ). Edit Parameter Store, not this file."
  echo "REGISTRY=${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
  echo "POSTGRES_USER=trellis"
  echo "POSTGRES_DB=trellisdb"
  echo "SITE_ADDRESS=origin.trellis.niteshkumar.xyz"
  # Name<TAB>Value per line, decrypted. --recursive is not used: the path is flat.
  aws ssm get-parameters-by-path --region "$REGION" --path /trellis/prod/ --with-decryption \
    --query 'Parameters[].[Name,Value]' --output text |
    while IFS=$'\t' read -r name value; do echo "${name##*/}=${value}"; done
} > "$tmp"

# Keep the deployed TAG, which deploy.sh adds; the parameters don't know it.
if [[ -f .env ]] && grep -q '^TAG=' .env; then grep '^TAG=' .env >> "$tmp"; fi

# Refuse to replace a working file with one that is missing a secret.
for key in POSTGRES_PASSWORD JWT_SECRET NEO4J_PASSWORD ORIGIN_VERIFY; do
  grep -q "^${key}=." "$tmp" || { rm -f "$tmp"; echo "Missing /trellis/prod/${key} in Parameter Store." >&2; exit 1; }
done
mv "$tmp" .env
echo "Wrote /opt/trellis/.env ($(grep -c '=' .env) values)."
