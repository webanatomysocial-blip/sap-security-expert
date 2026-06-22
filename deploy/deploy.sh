#!/usr/bin/env bash
# =============================================================================
# SAP Security Expert — redeploy / update script
# Run this on the EC2 server every time you push new code.
#
# Usage:  ./deploy/deploy.sh
#         ./deploy/deploy.sh main   (to specify a branch)
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
npm run build

echo "[deploy] Reloading PM2 (zero-downtime)..."
pm2 reload ecosystem.config.cjs --env production

echo "[deploy] Done — checking app status:"
pm2 status sap-security-expert
