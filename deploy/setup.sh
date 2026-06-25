#!/usr/bin/env bash
# =============================================================================
# SAP Security Expert — AWS Lightsail one-time server setup
# Target: Debian 12, Node 18.20.4, PM2, MariaDB 10.11, Nginx
# Domain: http://dev.sapsecurityexpert.com
#
# Usage (as root or sudo-capable user):
#   chmod +x deploy/setup.sh
#   sudo ./deploy/setup.sh
# =============================================================================
set -euo pipefail

APP_DIR="/var/www/sap-security-expert"
DOMAIN="dev.sapsecurityexpert.com"
NODE_USER="${SUDO_USER:-$(whoami)}"

echo "================================================================"
echo "  SAP Security Expert — Lightsail Setup"
echo "  App dir : $APP_DIR"
echo "  Domain  : $DOMAIN"
echo "  User    : $NODE_USER"
echo "================================================================"

# ── 1. System updates ─────────────────────────────────────────────────────────
echo "[1/8] Updating system packages..."
apt-get update -y && apt-get upgrade -y

# ── 2. Create app directory ───────────────────────────────────────────────────
echo "[2/8] Creating app directory..."
mkdir -p "$APP_DIR"
chown -R "$NODE_USER:$NODE_USER" "$APP_DIR"

# ── 3. Clone repository ───────────────────────────────────────────────────────
echo "[3/8] Cloning repository..."
sudo -u "$NODE_USER" git clone \
  https://github.com/webanatomysocial/sap-security-expert-new.git "$APP_DIR"

# ── 4. Create runtime directories ─────────────────────────────────────────────
echo "[4/8] Creating runtime directories..."
sudo -u "$NODE_USER" mkdir -p "$APP_DIR/logs"
sudo -u "$NODE_USER" mkdir -p "$APP_DIR/public/uploads/blogs"
sudo -u "$NODE_USER" mkdir -p "$APP_DIR/public/uploads/ads"
sudo -u "$NODE_USER" mkdir -p "$APP_DIR/public/uploads/profiles"
sudo -u "$NODE_USER" mkdir -p "$APP_DIR/public/uploads/contributors"
sudo -u "$NODE_USER" mkdir -p "$APP_DIR/cache"
chmod -R 755 "$APP_DIR/public/uploads" "$APP_DIR/cache" "$APP_DIR/logs"

# ── 5. Configure environment ──────────────────────────────────────────────────
echo "[5/8] Configuring server/.env ..."
sudo -u "$NODE_USER" cp "$APP_DIR/server/.env.example" "$APP_DIR/server/.env"
echo ""
echo "================================================================"
echo "  IMPORTANT: Edit server/.env before continuing"
echo "================================================================"
echo "  nano $APP_DIR/server/.env"
echo ""
echo "  Required values:"
echo "    DB_CONNECTION=mysql"
echo "    DB_HOST=127.0.0.1"
echo "    DB_PORT=3306"
echo "    DB_NAME=<database>"
echo "    DB_USER=<user>"
echo "    DB_PASS=<password>"
echo "    SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 2>/dev/null || echo '<64-char-hex>')"
echo "    SITE_URL=https://$DOMAIN"
echo "    CANONICAL_URL=https://$DOMAIN"
echo "    NEXT_PUBLIC_SITE_URL=https://$DOMAIN"
echo "    SMTP_HOST / SMTP_USER / SMTP_PASS / SMTP_FROM / SMTP_FROM_NAME"
echo "    RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET"
echo "    CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo '<32-char-hex>')"
echo ""
read -p "Press ENTER once server/.env is fully configured..."

# ── 6. Install dependencies & build ──────────────────────────────────────────
echo "[6/8] Installing dependencies and building..."
cd "$APP_DIR"
# Export NEXT_PUBLIC vars so they are baked into the Next.js client bundle
export $(grep -E '^NEXT_PUBLIC_' server/.env | xargs)
sudo -u "$NODE_USER" npm install
sudo -u "$NODE_USER" -E npm run build

# ── 7. Configure Nginx ────────────────────────────────────────────────────────
echo "[7/8] Configuring Nginx..."
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/sap-security-expert
sed -i "s/DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/sap-security-expert
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/sap-security-expert \
        /etc/nginx/sites-enabled/sap-security-expert
nginx -t
systemctl enable nginx
systemctl restart nginx

# ── 8. Start with PM2 ────────────────────────────────────────────────────────
echo "[8/8] Starting app with PM2..."
cd "$APP_DIR"
sudo -u "$NODE_USER" pm2 start ecosystem.config.cjs --env production
sudo -u "$NODE_USER" pm2 save
sudo -u "$NODE_USER" pm2 startup

echo ""
echo "================================================================"
echo "  COPY and RUN the 'sudo env PATH=...' command printed above."
echo "  That registers PM2 to start automatically after a reboot."
echo "================================================================"
echo ""
echo "Next steps:"
echo "  1. Import database:   mysql -u root -p <DB_NAME> < dump.sql"
echo "  2. Copy uploads:      rsync -av /old-server/public/uploads/ $APP_DIR/public/uploads/"
echo "  3. Get SSL cert:      sudo certbot --nginx -d $DOMAIN"
echo "  4. Health check:      curl http://127.0.0.1:3000/api/health"
echo ""
