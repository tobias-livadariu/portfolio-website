#!/usr/bin/env bash
#
# Deploy portfolio-v3 to Nginx.
#
# Steps: fast-forward the repo on BRANCH, install deps deterministically
# (npm ci), build, then atomically swap the built dist into NGINX_DIR while
# keeping the previous release at NGINX_DIR.prev for rollback. Reloads
# Nginx (no restart) and runs a 200-status health check; if the check
# fails the previous release is restored automatically.
#
# Environment overrides (all optional):
#   BRANCH       git branch to deploy (default: main)
#   NGINX_DIR    target directory served by Nginx (default: /var/www/html/portfolio)
#   HEALTH_URL   URL to hit after deploy (default: https://tobias-livadariu.online/portfolio/)
#   SKIP_HEALTH  if set to "1", skip the health check + auto-rollback step

set -Eeuo pipefail

# ---- Paths / config ------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
NGINX_DIR="${NGINX_DIR:-/var/www/html/portfolio}"
BRANCH="${BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-https://tobias-livadariu.online/portfolio/}"
STAGE_DIR="${NGINX_DIR}.new"
BACKUP_DIR="${NGINX_DIR}.prev"

# ---- Safety guards -------------------------------------------------------

# Refuse to operate on a NGINX_DIR that could expand to disaster.
case "${NGINX_DIR}" in
  ""|"/"|"/*"|"."|"./*")
    echo "FATAL: NGINX_DIR is unsafe: '${NGINX_DIR}'" >&2
    exit 1
    ;;
esac

log()  { printf "[deploy] %s\n" "$*"; }
fail() { printf "[deploy] FAIL: %s\n" "$*" >&2; exit 1; }

# ---- 1. Sync repo --------------------------------------------------------

cd "$APP_DIR"
log "Repo: $APP_DIR  Branch: $BRANCH"
git fetch --prune origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

# Record what we're deploying so it's visible in `systemctl status` /
# journal output and inside the served bundle.
COMMIT_SHA="$(git rev-parse --short HEAD)"
log "Deploying commit $COMMIT_SHA"

# ---- 2. Deterministic install -------------------------------------------

log "Installing dependencies (npm ci)..."
npm ci --prefer-offline --no-audit --no-fund

# ---- 3. Build ------------------------------------------------------------

log "Building..."
rm -rf dist
npm run build

[[ -f dist/index.html ]] || fail "dist/index.html missing after build."
[[ -s dist/index.html ]] || fail "dist/index.html is empty after build."

# ---- 4. Stage new release ------------------------------------------------

log "Staging new release at $STAGE_DIR"
sudo rm -rf "$STAGE_DIR"
sudo mkdir -p "$STAGE_DIR"
# `cp -a dist/.` preserves attributes and copies hidden files at the root.
sudo cp -a dist/. "$STAGE_DIR"/
# Sanity-check the stage before we swap.
[[ -f "$STAGE_DIR/index.html" ]] || fail "Stage missing index.html — refusing to swap."

# ---- 5. Atomic swap ------------------------------------------------------
#
# Move the current live dir aside, then move the staged dir into place.
# The two `mv` calls happen on the same filesystem so the window where
# NGINX_DIR doesn't exist is microseconds, not the duration of a copy.

if [[ -d "$NGINX_DIR" ]]; then
  log "Archiving previous release to $BACKUP_DIR"
  sudo rm -rf "$BACKUP_DIR"
  sudo mv "$NGINX_DIR" "$BACKUP_DIR"
fi
sudo mv "$STAGE_DIR" "$NGINX_DIR"

# Reload (not restart) — drops zero in-flight connections.
log "Reloading Nginx..."
sudo systemctl reload nginx

# ---- 6. Health check + auto-rollback ------------------------------------

if [[ "${SKIP_HEALTH:-0}" == "1" ]]; then
  log "SKIP_HEALTH=1 — skipping health check."
  log "Deploy complete. Commit $COMMIT_SHA live at $HEALTH_URL"
  exit 0
fi

log "Health check: $HEALTH_URL"
if curl -fsSL --max-time 15 -o /dev/null "$HEALTH_URL"; then
  log "Deploy complete. Commit $COMMIT_SHA live at $HEALTH_URL"
  exit 0
fi

# Rollback path.
log "Health check FAILED — rolling back to previous release."
if [[ -d "$BACKUP_DIR" ]]; then
  sudo rm -rf "$NGINX_DIR"
  sudo mv "$BACKUP_DIR" "$NGINX_DIR"
  sudo systemctl reload nginx
  fail "Rolled back to previous release. New build NOT live."
fi
fail "Health check failed AND no backup to roll back to."
