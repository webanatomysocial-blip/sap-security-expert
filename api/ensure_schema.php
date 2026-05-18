<?php
/**
 * api/ensure_schema.php
 * Comprehensive script to ensure all required tables exist in the database (SQLite).
 */
require_once 'db.php';

echo "Standardizing Database Schema...\n";

try {
    // 1. Members
    $pdo->exec("CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT NOT NULL UNIQUE,
        username TEXT,
        location TEXT,
        company_name TEXT,
        job_role TEXT,
        password_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at DATETIME
    )");
    echo "- Table 'members' verified.\n";

    // 2. Verification Codes (OTPs)
    $pdo->exec("CREATE TABLE IF NOT EXISTS verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'signup',
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        ip_address TEXT,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    echo "- Table 'verification_codes' verified.\n";

    // 3. Email Logs
    $pdo->exec("CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    echo "- Table 'email_logs' verified.\n";

    // 4. Comments
    $pdo->exec("CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id TEXT NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        user_name TEXT NOT NULL,
        email TEXT,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        edited_at DATETIME,
        original_text TEXT
    )");
    echo "- Table 'comments' verified.\n";

    // 5. Blogs Enhancements (is_members_only)
    // Check if column exists
    $stmt = $pdo->query("PRAGMA table_info(blogs)");
    $cols = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'name');
    if (!in_array('is_members_only', $cols)) {
        $pdo->exec("ALTER TABLE blogs ADD COLUMN is_members_only INTEGER DEFAULT 0");
        echo "- Column 'is_members_only' added to 'blogs'.\n";
    }

    echo "Schema update complete locally.\n";
} catch (Exception $e) {
    echo "ERROR during schema update: " . $e->getMessage() . "\n";
}
