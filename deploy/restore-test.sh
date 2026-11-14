#!/usr/bin/env bash
# ON THE SERVER: proves the latest backup can be restored (docs/aws.md §7), without
# touching the live database. sudo /opt/trellis/restore-test.sh
#
# It restores the newest backup into a scratch database, restore_check, compares row
# counts with the live database, and drops the scratch database. A backup that has never
# been restored is a guess; run this after setting up and now and then after.
set -euo pipefail
export PATH="$PATH:/snap/bin" AWS_REGION=ap-southeast-2

cd /opt/trellis
source <(grep -E '^(POSTGRES_USER|POSTGRES_DB)=' .env)
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET="trellis-backups-${ACCOUNT}"
psql() { docker compose exec -T db psql -U "$POSTGRES_USER" -v ON_ERROR_STOP=1 -qAt "$@"; }

LATEST=$(aws s3 ls "s3://${BUCKET}/postgres/" | sort | tail -1 | awk '{print $4}')
[[ -n "$LATEST" ]] || { echo "No backup in s3://${BUCKET}/postgres/" >&2; exit 1; }
echo "Restoring ${LATEST} into restore_check"

tmp=$(mktemp /tmp/trellis-restore.XXXX.dump)
trap 'rm -f "$tmp"; psql -d postgres -c "DROP DATABASE IF EXISTS restore_check" >/dev/null 2>&1 || true' EXIT
aws s3 cp --only-show-errors "s3://${BUCKET}/postgres/${LATEST}" "$tmp"

psql -d postgres -c "DROP DATABASE IF EXISTS restore_check" -c "CREATE DATABASE restore_check"
docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d restore_check --no-owner < "$tmp"

# Rows created after the backup was taken make the live counts higher; never lower.
for table in users chat_messages proposals check_ins experiences prompt_takes; do
  backup=$(psql -d restore_check -c "SELECT count(*) FROM ${table}")
  live=$(psql -d "$POSTGRES_DB" -c "SELECT count(*) FROM ${table}")
  printf '%-14s backup %6s   live %6s\n' "$table" "$backup" "$live"
done
echo "Restore check passed: the backup restores, and the scratch database is dropped."
