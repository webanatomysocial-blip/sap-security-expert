<?php
// api/services/MailService.php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Search for vendor/autoload.php in common locations
$autoloadPaths = [
    __DIR__ . '/../../vendor/autoload.php', // Standard: root/vendor/
    __DIR__ . '/../vendor/autoload.php',    // api/vendor/
    dirname(__DIR__, 2) . '/vendor/autoload.php' // absolute root/vendor/
];

$found = false;
foreach ($autoloadPaths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $found = true;
        break;
    }
}

if (!$found) {
    // If not found, log a specific error to help the user
    error_log("MailService Error: vendor/autoload.php not found. Did you upload the 'vendor' folder to the server?");
    // Don't die immediately to let other parts of the system potentially work, 
    // but PHPMailer calls will fail with a Class Not Found error.
}

require_once __DIR__ . '/../db.php';

class MailService
{
    private static $instance = null;
    private $mailer;
    private $pdo;

    private function __construct()
    {
        global $pdo;
        $this->pdo = $pdo;
        $this->mailer = new PHPMailer(true);

        // SMTP Settings
        $this->mailer->isSMTP();
        $this->mailer->Host = getenv('SMTP_HOST');
        $this->mailer->SMTPAuth = true;
        $this->mailer->Username = getenv('SMTP_USER');
        $this->mailer->Password = getenv('SMTP_PASS');
        $this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $this->mailer->Port = getenv('SMTP_PORT');

        $this->mailer->setFrom(getenv('SMTP_FROM'), getenv('SMTP_FROM_NAME'));
        $this->mailer->isHTML(true);
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Send email using a template
     */
    public function send($to, $subject, $templatePath, $data = [])
    {
        $fullTemplatePath = __DIR__ . '/../templates/' . $templatePath . '.html';
        $status = 'failed';
        $error = null;

        // Auto-inject site URL and domain
        if (!isset($data['site_url'])) {
            $siteUrl = getenv('SITE_URL') ?: 'https://sapsecurityexpert.com/';
            $siteUrl = rtrim($siteUrl, '/');
            $data['site_url'] = $siteUrl;

            // Extract domain for display if not set
            if (!isset($data['site_domain'])) {
                $domain = parse_url($siteUrl, PHP_URL_HOST) ?: 'sapsecurityexpert.com';
                $data['site_domain'] = $domain;
            }
        }

        try {
            if (!file_exists($fullTemplatePath)) {
                throw new \Exception("Template $templatePath not found at $fullTemplatePath");
            }

            $body = file_get_contents($fullTemplatePath);
            foreach ($data as $key => $value) {
                // Using regex to handle both {{key}} and {{ key }} formats
                $pattern = '/\{\{\s*' . preg_quote($key, '/') . '\s*\}\}/';
                $body = preg_replace($pattern, (string) $value, $body);
            }

            $this->mailer->clearAddresses();
            $this->mailer->addAddress($to);
            $this->mailer->Subject = $subject;
            $this->mailer->Body = $body;
            $this->mailer->AltBody = strip_tags($body);

            $this->mailer->send();
            $status = 'sent';
            $this->logToFile("Mail sent to $to: $subject");
            return true;
        } catch (\Exception $e) {
            $error = $this->mailer->ErrorInfo ?: $e->getMessage();
            $this->logToFile("Mail Error to $to: " . $error);
            return false;
        } finally {
            $this->logToDb($to, $subject, $status, $error);
        }
    }

    /**
     * Send email with raw HTML body directly
     */
    public function sendDirect($to, $subject, $body)
    {
        $status = 'failed';
        $error = null;

        try {
            $this->mailer->clearAddresses();
            $this->mailer->addAddress($to);
            $this->mailer->Subject = $subject;
            $this->mailer->Body = $body;
            $this->mailer->AltBody = strip_tags($body);

            $this->mailer->send();
            $status = 'sent';
            $this->logToFile("Direct mail sent to $to: $subject");
            return true;
        } catch (Exception $e) {
            $error = $this->mailer->ErrorInfo ?: $e->getMessage();
            $this->logToFile("Direct mail Error to $to: " . $error);
            return false;
        } finally {
            $this->logToDb($to, $subject, $status, $error);
        }
    }

    /**
     * Scan for newly approved or published articles that haven't been queued for members yet,
     * and queue them for all active members.
     */
    public function queuePendingBlogNotifications()
    {
        // 1. Ensure DB schema (email_queue table and blogs.is_queued_for_members)
        $this->ensureQueueSchema();

        // 2. Fetch all blogs that are approved/published but not yet queued
        try {
            $stmt = $this->pdo->prepare("SELECT id, title, slug, author, category FROM blogs WHERE status IN ('approved', 'published') AND (is_queued_for_members IS NULL OR is_queued_for_members = 0)");
            $stmt->execute();
            $blogs = $stmt->fetchAll();
        } catch (Exception $e) {
            $this->logToFile("Error fetching unqueued blogs: " . $e->getMessage());
            return;
        }

        if (empty($blogs)) {
            return;
        }

        // 3. Fetch all active members
        try {
            $stmt = $this->pdo->prepare("SELECT name, email FROM members WHERE status = 'approved' AND is_deleted = 0");
            $stmt->execute();
            $members = $stmt->fetchAll();
        } catch (Exception $e) {
            $this->logToFile("Error fetching active members: " . $e->getMessage());
            return;
        }

        if (empty($members)) {
            // Even if there are no members, mark blogs as queued so we don't keep querying them
            foreach ($blogs as $blog) {
                $this->markBlogAsQueued($blog['id']);
            }
            return;
        }

        $siteUrl = getenv('SITE_URL') ?: 'https://sapsecurityexpert.com';
        $siteUrl = rtrim($siteUrl, '/');

        // 4. Queue emails for each blog and member
        foreach ($blogs as $blog) {
            $categorySlug = strtolower(str_replace(' ', '-', $blog['category'] ?? 'others'));
            $postUrl = "$siteUrl/$categorySlug/{$blog['slug']}";
            $authorName = $blog['author'] ?: 'Editorial team';

            // Load the HTML template content
            $templatePath = __DIR__ . '/../templates/member/new_article.html';
            $body = '';
            if (file_exists($templatePath)) {
                $body = file_get_contents($templatePath);
                // Replace placeholders
                $body = str_replace(
                    ['{{article_title}}', '{{author_name}}', '{{article_url}}', '{{site_url}}', '{{site_domain}}'],
                    [$blog['title'], $authorName, $postUrl, $siteUrl, parse_url($siteUrl, PHP_URL_HOST) ?: 'sapsecurityexpert.com'],
                    $body
                );
            } else {
                // Fallback basic HTML body if template is missing
                $body = "<p>Hi Expert,</p>"
                    . "<p>A new article has been published on SAP Security Expert: <strong>" . htmlspecialchars($blog['title']) . "</strong> by <strong>" . htmlspecialchars($authorName) . "</strong></p>"
                    . "<p>You can read the article here: <a href=\"" . htmlspecialchars($postUrl) . "\">" . htmlspecialchars($postUrl) . "</a></p>"
                    . "<p>Please take a few minutes to review it and share it across your professional network or relevant channels wherever possible. Also, leave your views/comments after reading the article which will help others too.</p>"
                    . "<p>Your support helps us improve the reach and visibility of our thought leadership content.</p>"
                    . "<p>Thank you for your continued support.</p>"
                    . "<p>Best Regards,<br>Editorial team - SAP Security Expert</p>";
            }

            $subject = "New Article: " . $blog['title'];

            $this->pdo->beginTransaction();
            try {
                // Insert into queue
                $stmtQueue = $this->pdo->prepare("INSERT INTO email_queue (recipient, subject, body, status, created_at) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)");
                foreach ($members as $member) {
                    $stmtQueue->execute([$member['email'], $subject, $body]);
                }

                // Mark blog as queued
                $stmtMark = $this->pdo->prepare("UPDATE blogs SET is_queued_for_members = 1 WHERE id = ?");
                $stmtMark->execute([$blog['id']]);

                $this->pdo->commit();
                $this->logToFile("Queued " . count($members) . " member notifications for blog ID: " . $blog['id']);
            } catch (Exception $e) {
                $this->pdo->rollBack();
                $this->logToFile("Transaction failed for queuing blog ID " . $blog['id'] . ": " . $e->getMessage());
            }
        }
    }

    private function markBlogAsQueued($blogId)
    {
        try {
            $stmt = $this->pdo->prepare("UPDATE blogs SET is_queued_for_members = 1 WHERE id = ?");
            $stmt->execute([$blogId]);
        } catch (Exception $e) {
            $this->logToFile("Error marking blog $blogId as queued: " . $e->getMessage());
        }
    }

    private function ensureQueueSchema()
    {
        try {
            $driver = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
            
            if ($driver === 'sqlite') {
                // SQLite schema
                $this->pdo->exec("CREATE TABLE IF NOT EXISTS email_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recipient TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    body TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    attempts INTEGER NOT NULL DEFAULT 0,
                    error_message TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    sent_at DATETIME DEFAULT NULL
                )");
                
                // Add column to blogs if not exists
                $stmt = $this->pdo->query("PRAGMA table_info(blogs)");
                $cols = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'name');
                if (!in_array('is_queued_for_members', $cols)) {
                    $this->pdo->exec("ALTER TABLE blogs ADD COLUMN is_queued_for_members INTEGER DEFAULT 0");
                }
            } else {
                // MySQL schema
                $this->pdo->exec("CREATE TABLE IF NOT EXISTS email_queue (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    recipient VARCHAR(255) NOT NULL,
                    subject VARCHAR(255) NOT NULL,
                    body TEXT NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    attempts INT NOT NULL DEFAULT 0,
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    sent_at TIMESTAMP NULL DEFAULT NULL
                )");
                
                // Add column to blogs if not exists
                $stmt = $this->pdo->prepare("SHOW COLUMNS FROM blogs LIKE 'is_queued_for_members'");
                $stmt->execute();
                if (!$stmt->fetch()) {
                    $this->pdo->exec("ALTER TABLE blogs ADD COLUMN is_queued_for_members TINYINT DEFAULT 0");
                }
            }
        } catch (Exception $e) {
            $this->logToFile("Schema ensuring failed: " . $e->getMessage());
        }
    }

    private function logToFile($message)
    {
        $logFile = __DIR__ . '/../logs/mail.log';
        if (!is_dir(dirname($logFile))) {
            mkdir(dirname($logFile), 0777, true);
        }
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . $message . PHP_EOL, FILE_APPEND);
    }

    private function logToDb($recipient, $subject, $status, $error)
    {
        try {
            $stmt = $this->pdo->prepare("INSERT INTO email_logs (recipient, subject, status, error_message, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)");
            $stmt->execute([$recipient, $subject, $status, $error]);
        } catch (\Exception $e) {
            $this->logToFile("DB Log Error: " . $e->getMessage());
        }
    }
}
?>