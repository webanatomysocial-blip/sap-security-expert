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