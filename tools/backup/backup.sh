#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL must be set" >&2
  exit 1
fi

if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
  echo "BACKUP_ENCRYPTION_KEY must be set" >&2
  exit 1
fi

if [[ -z "${BACKUP_BUCKET_URL:-}" ]]; then
  echo "BACKUP_BUCKET_URL must be set" >&2
  exit 1
fi

DATE="$(date +%F_%H-%M)"
TARGET_PATH="${BACKUP_BUCKET_URL%/}/db_${DATE}.sql.enc"

pg_dump "${DATABASE_URL}" \
  | openssl enc -aes-256-cbc -pbkdf2 -k "${BACKUP_ENCRYPTION_KEY}" \
  | aws s3 cp - "${TARGET_PATH}"

echo "Validated: backup uploaded ${DATE}"
