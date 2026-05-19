#!/usr/bin/env bash
#
# Manually restore the previous release that deploy.sh archived to
# NGINX_DIR.prev. Use this when a problem surfaces some time after a
# deploy (the in-script health check only catches immediate failures).

set -Eeuo pipefail

NGINX_DIR="${NGINX_DIR:-/var/www/html/portfolio}"
BACKUP_DIR="${NGINX_DIR}.prev"

case "${NGINX_DIR}" in
  ""|"/"|"/*"|"."|"./*")
    echo "FATAL: NGINX_DIR is unsafe: '${NGINX_DIR}'" >&2
    exit 1
    ;;
esac

log()  { printf "[rollback] %s\n" "$*"; }
fail() { printf "[rollback] FAIL: %s\n" "$*" >&2; exit 1; }

[[ -d "$BACKUP_DIR" ]] || fail "No backup directory at $BACKUP_DIR — nothing to roll back to."

log "Rolling $NGINX_DIR back to the contents of $BACKUP_DIR"

# Stash the current (broken) release as .failed so it's not lost, in case
# you want to inspect it before the next deploy overwrites it.
FAILED_DIR="${NGINX_DIR}.failed"
sudo rm -rf "$FAILED_DIR"
if [[ -d "$NGINX_DIR" ]]; then
  sudo mv "$NGINX_DIR" "$FAILED_DIR"
fi

sudo mv "$BACKUP_DIR" "$NGINX_DIR"
sudo systemctl reload nginx

log "Rollback complete. Bad release preserved at $FAILED_DIR for inspection."
