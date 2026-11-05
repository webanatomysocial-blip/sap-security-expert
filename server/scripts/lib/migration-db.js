'use strict';
// Opens the database for a migration or inventory script.
//
// Deliberately does NOT require ../db on MySQL/MariaDB: db.js runs ensureMySQLTables() when it
// loads, and that performs ALTER TABLE / DROP INDEX on the server. A dry run must never change a
// database, so the scripts use one direct connection here instead.
// SQLite (local development only) keeps using db.js.
async function openMigrationDb() {
  if ((process.env.DB_CONNECTION || '') === 'sqlite') {
    const { poolExec, isSQLite } = require('../../db');
    return { db: poolExec, isSQLite: true, close: async () => {} };
  }
  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || '',
    charset: process.env.DB_CHARSET || 'utf8mb4',
    timezone: '+00:00',
  });
  return { db: conn, isSQLite: false, close: () => conn.end() };
}
module.exports = { openMigrationDb };
