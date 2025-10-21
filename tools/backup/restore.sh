#!/usr/bin/env bash
set -euo pipefail

FILE="${1:-}"

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

if [[ -z "${FILE}" ]]; then
  echo "Usage: restore.sh <filename>" >&2
  exit 1
fi

SOURCE_PATH="${BACKUP_BUCKET_URL%/}/${FILE}"

aws s3 cp "${SOURCE_PATH}" - \
  | openssl enc -d -aes-256-cbc -pbkdf2 -k "${BACKUP_ENCRYPTION_KEY}" \
  | psql "${DATABASE_URL}"

echo "Validated: restore complete from ${FILE}"
