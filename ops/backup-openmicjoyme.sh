#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="/srv/openmicjoyme"
BACKUP_DIR="/srv/backups/openmicjoyme"
RETENTION=7

timestamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

archive="${BACKUP_DIR}/openmicjoyme-${timestamp}.tar.gz"

tar \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.angular' \
  -czf "$archive" \
  -C /srv \
  "$(basename "$SOURCE_DIR")"

echo "Created ${archive}"

old_backups=$(ls -1t ${BACKUP_DIR}/openmicjoyme-*.tar.gz 2>/dev/null | tail -n +$((RETENTION + 1)) || true)
if [[ -n "${old_backups}" ]]; then
  echo "${old_backups}" | xargs -r rm -f
fi
