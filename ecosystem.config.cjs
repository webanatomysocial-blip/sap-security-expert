'use strict';
/**
 * PM2 ecosystem config for SAP Security Expert.
 *
 * Start production server:
 *   pm2 start ecosystem.config.cjs --env production
 *
 * Reload without downtime (after git pull + build):
 *   pm2 reload ecosystem.config.cjs --env production
 *
 * Save PM2 process list so it survives reboots:
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: 'sap-security-expert',
      script: 'start.cjs',

      // Single instance — start.cjs runs both Next.js + Express in one process.
      // Do NOT use cluster mode; Next.js does not support it in unified mode.
      instances: 1,
      exec_mode: 'fork',

      watch: false,
      max_memory_restart: '600M',
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      error_file: '/var/log/sap/error.log',
      out_file: '/var/log/sap/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
