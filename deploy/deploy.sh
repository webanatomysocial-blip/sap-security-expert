#!/usr/bin/env bash
# =============================================================================
# SAP Security Expert — Lightsail redeploy script
# Run this on the Lightsail server after every git push.
#
# Usage:
#   ./deploy/deploy.sh           (defaults to main branch)
#   ./deploy/deploy.sh main
# =============================================================================
set -euo pipefail

APP_DIR="/var/www/sap-security-expert"
BRANCH="${1:-main}"

echo "[deploy] Pulling branch: $BRANCH"
cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "[deploy] Installing/updating dependencies..."
npm install --prefer-offline

echo "[deploy] Building Next.js..."
# Export NEXT_PUBLIC vars so the client bundle gets the correct domain
export $(grep -E '^NEXT_PUBLIC_' server/.env | xargs)
npm run build

echo "[deploy] Reloading PM2 (zero-downtime)..."
pm2 reload ecosystem.config.cjs --env production

echo "[deploy] Status:"
pm2 status sap-security-expert
