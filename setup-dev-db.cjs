#!/usr/bin/env node
'use strict';
/**
 * setup-dev-db.cjs
 * Imports sapsecurity_expert.sql (MySQL dump) into server/database.sqlite
 * for local development. Run once: node setup-dev-db.cjs
 */
const fs = require('fs');
const path = require('path');

let Database;
try {
  Database = require('better-sqlite3');
} catch {
  Database = require(path.join(__dirname, 'server/node_modules/better-sqlite3'));
}

const DUMP_FILE = path.join(__dirname, 'sapsecurity_expert.sql');
const DB_PATH   = path.join(__dirname, 'server/database.sqlite');

if (!fs.existsSync(DUMP_FILE)) {
  console.error('ERROR: sapsecurity_expert.sql not found at project root');
  process.exit(1);
}

// ── Parse statements (handles strings so we don't split on `;` inside quotes) ─
function splitStatements(sql) {
  const stmts = [];
  let buf = '';
  let inStr = false;
  let strChar = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (inStr) {
      if (c === '\\' && i + 1 < sql.length) {
        buf += c + sql[++i];
      } else if (c === strChar) {
        buf += c;
        inStr = false;
      } else {
        buf += c;
      }
      i++;
      continue;
    }
    if (c === "'" || c === '"') { inStr = true; strChar = c; buf += c; i++; continue; }
    if (c === '-' && sql[i+1] === '-') { while (i < sql.length && sql[i] !== '\n') i++; continue; }
    if (c === '/' && sql[i+1] === '*') {
      i += 2;
      while (i < sql.length - 1 && !(sql[i] === '*' && sql[i+1] === '/')) i++;
      i += 2; continue;
    }
    if (c === ';') { const s = buf.trim(); if (s) stmts.push(s); buf = ''; i++; continue; }
    buf += c; i++;
  }
  const last = buf.trim();
  if (last) stmts.push(last);
  return stmts;
}

const raw  = fs.readFileSync(DUMP_FILE, 'utf8');
const stmts = splitStatements(raw);
console.log(`Parsed ${stmts.length} statements from dump`);

// ── Collect PK / AUTO_INCREMENT from ALTER TABLE statements ──────────────────
const primaryKeys   = {};  // tableName → pkCol
const autoIncrements = new Set();

for (const s of stmts) {
  if (!/^ALTER\s+TABLE/i.test(s)) continue;
  const tbl = (s.match(/^ALTER\s+TABLE\s+`?(\w+)`?/i) || [])[1];
  if (!tbl) continue;
  const pkM = s.match(/ADD\s+PRIMARY\s+KEY\s+\(`?(\w+)`?\)/i);
  if (pkM) primaryKeys[tbl] = pkM[1];
  if (/AUTO_INCREMENT/i.test(s)) autoIncrements.add(tbl);
}

// ── Conversion helpers ───────────────────────────────────────────────────────
// Keep backtick identifiers as double-quoted identifiers so reserved words
// like "timestamp" in column names survive type-keyword replacements.
const unbt = s => s.replace(/`([^`]*)`/g, '"$1"');

function convertTypes(s) {
  return s
    // Integer types — with or without (N), with or without unsigned
    .replace(/\b(tiny|small|medium|big)?int\b\s*(?:\(\d+\))?\s*(unsigned\b\s*)?/gi, 'INTEGER ')
    .replace(/\bvarchar\s*\(\d+\)/gi, 'TEXT')
    .replace(/\b(long|medium|tiny)?text\b/gi, 'TEXT')
    .replace(/\bdecimal\s*\([^)]+\)/gi, 'REAL')
    .replace(/\b(double|float)\b/gi, 'REAL')
    // Only replace "timestamp" when used as a TYPE (preceded by space/comma/paren),
    // not when it is a quoted column name (which now looks like "timestamp").
    .replace(/(?<=[\s,(])timestamp\b/gi, 'DATETIME')
    .replace(/\bcurrent_timestamp\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/\s+CHARACTER\s+SET\s+\w+/gi, '')
    .replace(/\s+COLLATE\s+[\w_]+/gi, '')
    .replace(/\bAUTO_INCREMENT\b/gi, 'AUTOINCREMENT')
    // Normalise extra spaces introduced by the int→INTEGER replacements
    .replace(/INTEGER {2,}/g, 'INTEGER ');
}

function convertCreate(stmt) {
  const nm = (stmt.match(/^CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?(\w+)`?/i) || [])[1];
  if (!nm) return null;

  let sql = unbt(stmt);

  // Strip table options after the closing paren
  sql = sql.replace(/\)\s*ENGINE[\s\S]*/i, ')');

  // Remove KEY / UNIQUE KEY table-constraint lines
  sql = sql.replace(/^\s*(?:UNIQUE\s+)?KEY\s+\w+\s*\([^)]+\)\s*,?\s*\n?/gim, '');

  // Remove PRIMARY KEY table constraint line — we'll re-add it correctly
  sql = sql.replace(/^\s*PRIMARY\s+KEY\s*\([^)]+\)\s*,?\s*\n?/gim, '');

  // Convert types
  sql = convertTypes(sql);

  // Fix inline AUTO_INCREMENT PRIMARY KEY (email_queue style)
  sql = sql.replace(/\bINTEGER\s+AUTOINCREMENT\s+PRIMARY\s+KEY\b/gi,
    'INTEGER PRIMARY KEY AUTOINCREMENT');

  // Attach PRIMARY KEY to the right column
  const pkCol = primaryKeys[nm];
  if (pkCol) {
    if (autoIncrements.has(nm)) {
      // INTEGER PK with auto-increment: modify column directly
      sql = sql.replace(
        new RegExp(`(\\b${pkCol}\\b)\\s+INTEGER(?:\\s+NOT\\s+NULL)?`, 'i'),
        `$1 INTEGER PRIMARY KEY AUTOINCREMENT`
      );
    } else {
      // Any other PK: add table constraint before closing paren
      sql = sql.replace(/\)\s*$/, `,\n  PRIMARY KEY (${pkCol})\n)`);
    }
  }

  // Fix trailing comma before )
  sql = sql.replace(/,(\s*\n\s*\))/g, '$1');

  return sql;
}

function convertInsert(stmt) {
  let sql = unbt(stmt);
  sql = sql.replace(/^INSERT\s+IGNORE\b/i, 'INSERT OR IGNORE');
  sql = sql.replace(/\bcurrent_timestamp\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP');
  // MySQL escapes \' inside strings → SQLite uses ''
  // We do a careful character-by-character pass only inside string literals
  sql = fixStringEscapes(sql);
  return sql;
}

function fixStringEscapes(sql) {
  let out = '';
  let inStr = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (!inStr) {
      out += c;
      if (c === "'") inStr = true;
      continue;
    }
    // inside single-quoted string
    if (c === '\\' && i + 1 < sql.length) {
      const next = sql[i + 1];
      if (next === "'") { out += "''"; i++; }        // \' → ''
      else if (next === '\\') { out += '\\'; i++; }  // \\ → \
      else if (next === 'n') { out += '\\n'; i++; }  // keep \n as-is (2 chars)
      else if (next === 'r') { out += '\\r'; i++; }
      else if (next === 't') { out += '\\t'; i++; }
      else { out += c; }                              // other escapes: keep
      continue;
    }
    if (c === "'") inStr = false;
    out += c;
  }
  return out;
}

// ── Execute ──────────────────────────────────────────────────────────────────
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('Removed existing database.sqlite');
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

let tables = 0, inserts = 0, errs = 0;

db.exec('BEGIN');
for (const stmt of stmts) {
  if (/^(SET|START\s+TRANSACTION|COMMIT|LOCK\s+TABLES|UNLOCK\s+TABLES)/i.test(stmt)) continue;
  if (stmt.startsWith('/*!')) continue;
  if (/^ALTER\s+TABLE/i.test(stmt)) continue;

  if (/^CREATE\s+TABLE/i.test(stmt)) {
    const sql = convertCreate(stmt);
    if (!sql) continue;
    try { db.exec(sql); tables++; }
    catch (e) { console.error(`[CREATE ERR] ${stmt.slice(0,80)}\n  ${e.message}`); errs++; }
    continue;
  }

  if (/^INSERT\s+(IGNORE\s+)?INTO/i.test(stmt)) {
    const sql = convertInsert(stmt);
    try { db.exec(sql); inserts++; }
    catch (e) { console.error(`[INSERT ERR] ${stmt.slice(0,80)}\n  ${e.message}`); errs++; }
    continue;
  }
}
db.exec('COMMIT');
db.pragma('foreign_keys = ON');
db.close();

console.log(`\nDone!`);
console.log(`  Tables created : ${tables}`);
console.log(`  INSERT batches : ${inserts}`);
console.log(`  Errors         : ${errs}`);
console.log(`  DB             : ${DB_PATH}`);
if (errs === 0) console.log('\nAll good — now run: npm run api:dev');
else console.log('\nCheck errors above before running the dev server');
