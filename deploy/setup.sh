#!/usr/bin/env bash
# =============================================================================
# SAP Security Expert — AWS EC2 one-time server setup
# Run this ONCE on a fresh Ubuntu 22.04 LTS instance.
#
# Before running:
#   chmod +x deploy/setup.sh
#   ./deploy/setup.sh your-domain.com
# =============================================================================
set -euo pipefail

DOMAIN="${1:-sap.webanatomy.in}"
APP_DIR="/var/www/sap-security-expert"
LOG_DIR="/var/log/sap"
REPO="https://github.com/webanatomysocial/sap-security-expert-new.git"  # update if private

echo "========================================================"
echo "  SAP Security Expert — EC2 Setup"
echo "  Domain : $DOMAIN"
echo "  App dir: $APP_DIR"
echo "========================================================"

# ── 1. System updates ─────────────────────────────────────────────────────────
echo "[1/10] Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# ── 2. Node.js 20 LTS ─────────────────────────────────────────────────────────
echo "[2/10] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v

# ── 3. PM2 ────────────────────────────────────────────────────────────────────
echo "[3/10] Installing PM2..."
sudo npm install -g pm2

# ── 4. Nginx ──────────────────────────────────────────────────────────────────
echo "[4/10] Installing Nginx..."
sudo apt-get install -y nginx

# ── 5. Certbot ────────────────────────────────────────────────────────────────
echo "[5/10] Installing Certbot..."
sudo apt-get install -y certbot python3-certbot-nginx

# ── 6. Directories ────────────────────────────────────────────────────────────
echo "[6/10] Creating directories..."
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER:$USER" "$APP_DIR"
sudo mkdir -p "$LOG_DIR"
sudo chown -R "$USER:$USER" "$LOG_DIR"

# ── 7. Clone repository ───────────────────────────────────────────────────────
echo "[7/10] Cloning repository..."
# If you have a private repo, set up an SSH deploy key first:
#   ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""
#   cat ~/.ssh/deploy_key.pub   # add this as a Deploy Key in GitHub repo settings
git clone "$REPO" "$APP_DIR"

echo ""
echo "========================================================"
echo "  IMPORTANT — Configure server/.env before continuing"
echo "========================================================"
echo ""
echo "Edit $APP_DIR/server/.env and fill in:"
echo "  DB_HOST        = <your RDS endpoint>"
echo "  DB_NAME        = sap_security_expert"
echo "  DB_USER        = <your RDS username>"
echo "  DB_PASS        = <your RDS password>"
echo "  SESSION_SECRET = <generate: openssl rand -hex 32>"
echo "  SITE_URL       = https://$DOMAIN"
echo "  CANONICAL_URL  = https://$DOMAIN"
echo "  SMTP_HOST/USER/PASS/FROM = <your SMTP credentials>"
echo "  RAZORPAY_KEY_ID / KEY_SECRET / WEBHOOK_SECRET"
echo ""
echo "Run this to create the file:"
echo "  cp $APP_DIR/server/.env.example $APP_DIR/server/.env"
echo "  nano $APP_DIR/server/.env"
echo ""
read -p "Press ENTER once server/.env is configured..."

# ── 8. Install dependencies & build ──────────────────────────────────────────
echo "[8/10] Installing dependencies and building..."
cd "$APP_DIR"
npm install
npm run build

# ── 9. Nginx config ───────────────────────────────────────────────────────────
echo "[9/10] Configuring Nginx..."
sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/sap-security-expert
sudo sed -i "s/DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/sap-security-expert

# Disable default site, enable ours
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/sap-security-expert /etc/nginx/sites-enabled/sap-security-expert

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

# ── 10. PM2 + startup ────────────────────────────────────────────────────────
echo "[10/10] Starting app with PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.cjs --env production
pm2 save

# Register PM2 to start on system reboot
sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | sudo bash

echo ""
echo "========================================================"
echo "  App is running! Next steps:"
echo "========================================================"
echo ""
echo "1. Point DNS: create a single A record for $DOMAIN → <EC2 Elastic IP>"
echo ""
echo "2. Once DNS propagates, get SSL cert:"
echo "   sudo certbot --nginx -d $DOMAIN"
echo ""
echo "3. Import your MySQL schema on RDS:"
echo "   mysql -h <RDS_ENDPOINT> -u <USER> -p <DB_NAME> < server/migrations/schema.sql"
echo "   (or use mysqldump export from Hostinger)"
echo ""
echo "4. Check logs:"
echo "   pm2 logs sap-security-expert"
echo "   tail -f $LOG_DIR/error.log"
echo ""
echo "Done!"
