#!/usr/bin/env sh
# Daily PostgreSQL backup for the cloud stack.
# Usage:
#   BACKUP_DIR=/var/backups/talaltechno ./scripts/backup-postgres.sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.cloud.yml}"
ENV_FILE="${ENV_FILE:-.env.cloud}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_DIR/talaltechno-$STAMP.dump.gz"

echo "→ Backing up database to $TARGET"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  | gzip -9 > "$TARGET"

# Fail loudly if the dump is suspiciously small.
SIZE="$(wc -c < "$TARGET" | tr -d ' ')"
if [ "$SIZE" -lt 1024 ]; then
  echo "✖ Backup is too small ($SIZE bytes). Check the database container." >&2
  exit 1
fi

find "$BACKUP_DIR" -name 'talaltechno-*.dump.gz' -mtime +"$RETENTION_DAYS" -delete
echo "✔ Backup complete ($SIZE bytes). Retention: $RETENTION_DAYS days."
