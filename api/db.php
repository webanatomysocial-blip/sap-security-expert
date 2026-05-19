<?php
// api/db.php - MySQL/MariaDB Connection for cPanel
// Optimized for SAP Security Expert Platform
// Enable errors for easier debugging
if (true) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}

// 1. Headers for API and CORS
if (!headers_sent()) {
    // ── Security Response Headers ─────────────────────────────────────────────
    // These protect against common browser-level attacks regardless of endpoint.
    header('X-Content-Type-Options: nosniff');                   // Prevent MIME sniffing
    header('X-Frame-Options: SAMEORIGIN');                       // Prevent clickjacking
    header('X-XSS-Protection: 1; mode=block');                  // Legacy XSS filter (IE/old Chrome)
    header('Referrer-Policy: strict-origin-when-cross-origin'); // Limit referrer info leakage

    // ── CORS Whitelist ────────────────────────────────────────────────────────
    $domain = getenv('SITE_URL') ?: 'https://sapsecurityexpert.com';
    $allowedOrigins = [
        $domain,
        str_replace('https://', 'https://www.', $domain),
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://localhost:8000',
        'http://127.0.0.1:8000'
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token");

    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

require_once __DIR__ . '/utils.php';

// 2. Load Environment Variables (Simple Implementation for cPanel compatibility)
function loadEnv($path)
{
    if (!file_exists($path))
        return [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0)
            continue;
        if (strpos($line, '=') === false)
            continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        // Strip surrounding quotes if present
        if (preg_match('/^"(.+)"$/', $value, $matches) || preg_match('/^\'(.+)\'$/', $value, $matches)) {
            $value = $matches[1];
        }
        $env[$name] = $value;
        putenv("$name=$value");
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
    return $env;
}

$envFile = __DIR__ . '/.env';
$config = loadEnv($envFile);

// 3. Database Credentials (Fallback to cPanel typical defaults)
$connection = $config['DB_CONNECTION'] ?? 'mysql'; // Default to mysql

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    if ($connection === 'sqlite') {
        // SQLite Connection
        $dbPath = __DIR__ . '/database.sqlite';
        $dsn = "sqlite:$dbPath";
        $pdo = new PDO($dsn, null, null, $options);
        // Enable foreign keys for SQLite
        $pdo->exec("PRAGMA foreign_keys = ON;");
    } else {
        // MySQL Connection (Existing Logic)
        $host = $config['DB_HOST'] ?? 'localhost';
        $db = $config['DB_NAME'] ?? '';
        $user = $config['DB_USER'] ?? '';
        $pass = $config['DB_PASS'] ?? '';
        $charset = $config['DB_CHARSET'] ?? 'utf8mb4';

        if (empty($db)) {
            throw new Exception("Database configuration missing. Please check api/.env");
        }
        $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
        $pdo = new PDO($dsn, $user, $pass, $options);
    }
} catch (PDOException $e) {
    // If not connected, give a clear message for debugging
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Connection failed: " . $e->getMessage(),
        "hint" => "Ensure your database credentials are correct in api/.env"
    ]);
    exit;
} catch (Exception $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    exit;
}
// 4. Passive Auto-Publish Hook (flock-protected: prevents concurrent execution)
// Automatically transitions 'scheduled' items when their publish_date arrives.
// flock() ensures only ONE PHP process runs the UPDATE at a time.
try {
    $autoPublishLock = sys_get_temp_dir() . '/sap_autopublish.lock';
    // 'c+' = create if not exists, open for read+write, do NOT truncate
    $lockHandle = @fopen($autoPublishLock, 'c+');
    if ($lockHandle) {
        // Non-blocking exclusive lock — if another process is running this, skip gracefully.
        if (flock($lockHandle, LOCK_EX | LOCK_NB)) {
            $lastRun = @fread($lockHandle, 20); // @-suppress in case file was just created
            $shouldRun = empty(trim($lastRun)) || (time() - (int) trim($lastRun)) >= 60;
            if ($shouldRun) {
                ftruncate($lockHandle, 0);
                rewind($lockHandle);
                fwrite($lockHandle, (string) time());
                $now = gmdate('Y-m-d H:i:s');
                $pdo->prepare("UPDATE blogs SET status = 'published' WHERE status = 'scheduled' AND publish_date <= ?")
                    ->execute([$now]);
                $pdo->prepare("UPDATE announcements SET status = 'active' WHERE status = 'scheduled' AND publish_date <= ?")
                    ->execute([$now]);

            }
            flock($lockHandle, LOCK_UN);
        }
        fclose($lockHandle);
    }
} catch (Exception $e) {
    // Fail silently — this is a background task; do not break the main request.
    error_log("Auto-publish error: " . $e->getMessage());
}
?>