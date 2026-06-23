'use strict';
/**
 * PM2 ecosystem config for SAP Security Expert.
 * Target: AWS Lightsail, Debian 12, Node 18.20.4
 *
 * Start production server:
 *   pm2 start ecosystem.config.cjs --env production
 *
 * Reload without downtime (after git pull + npm run build):
 *   pm2 reload ecosystem.config.cjs --env production
 *
 * Save process list (persists across reboots after startup hook is set):
 *   pm2 save
 *
 * Register PM2 to auto-start on reboot (run ONCE, then execute printed sudo cmd):
 *   pm2 startup
 */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'sap-security-expert',
      script: 'start.cjs',

      // Single instance — start.cjs runs both Next.js + Express in one process.
      // Do NOT use cluster mode; Next.js does not support it in unified mode.
      instances: 1,
      exec_mode: 'fork',

      // Cap V8 old-generation heap at 512 MB. Without this flag Node.js 18
      // defaults to ~1.5× physical RAM and would exhaust the 1 GB instance.
      // --optimize-for-size trades a small throughput cost for lower heap overhead.
      node_args: '--max-old-space-size=512 --optimize-for-size',

      watch: false,
      // Restart if RSS climbs above 600 MB — acts as a safety net for native/
      // buffer memory that lives outside the V8 heap.
      max_memory_restart: '600M',
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Logs written relative to APP_DIR.
      // Ensure APP_DIR/logs/ exists and is writable before starting PM2.
      error_file: path.join(__dirname, 'logs', 'pm2-error.log'),
      out_file:   path.join(__dirname, 'logs', 'pm2-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
