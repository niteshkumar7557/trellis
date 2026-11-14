#!/usr/bin/env bash
# ON THE SERVER: one backup of Postgres to S3 (docs/aws.md §7). Run nightly by
# trellis-backup.timer; by hand: sudo /opt/trellis/backup.sh
#
# What is backed up: Postgres, i.e. every account and every student's record. Not Neo4j
# (rebuilt from git by seed-graph) and not Caddy's certificate (re-issued).
# The bucket deletes each backup after 14 days: the promise that "Delete everything" is
# gone from backups within 14 days (design.md §11) depends on that rule.
set -euo pipefail
export PATH="$PATH:/snap/bin" AWS_REGION=ap-southeast-2

cd /opt/trellis
source <(grep -E '^(POSTGRES_USER|POSTGRES_DB)=' .env)
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET="trellis-backups-${ACCOUNT}"
NAME="postgres/${POSTGRES_DB}-$(date -u +%Y-%m-%dT%H%MZ).dump"

# 1. Dump to a file first, not straight into S3: if pg_dump fails half-way, a streamed
#    upload could still leave a cut-off file in the bucket that looks like a backup.
#    -Fc: the custom format, compressed, restorable table by table with pg_restore.
tmp=$(mktemp /tmp/trellis-backup.XXXX.dump)
trap 'rm -f "$tmp"' EXIT
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$tmp"

# 2. A dump that pg_restore can't read is not a backup. Check before uploading.
docker compose exec -T db pg_restore --list < "$tmp" > /dev/null

# 3. Upload. The bucket is encrypted and private; the role may only write to it.
aws s3 cp --only-show-errors "$tmp" "s3://${BUCKET}/${NAME}"
echo "Backed up $(du -h "$tmp" | cut -f1) to s3://${BUCKET}/${NAME}"
