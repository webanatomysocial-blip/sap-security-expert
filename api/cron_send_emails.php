<?php
// api/cron_send_emails.php
// Cron script to process queued emails at a maximum rate of 12 per minute.
// Should be run every minute via system cron or terminal scheduler.

// Prevent unauthorized browser execution
if (php_sapi_name() !== 'cli') {
    // If running via a web hook, require a secret key defined in .env
    require_once __DIR__ . '/db.php';
    $cronSecret = getenv('CRON_SECRET') ?: 'default_cron_secret';
    $passedSecret = $_GET['secret'] ?? '';
    
    if (empty($passedSecret) || $passedSecret !== $cronSecret) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode([
            "status" => "error",
            "message" => "Access denied. CLI only or authorized secret key trigger."
        ]);
        exit;
    }
} else {
    // Loaded via CLI, load DB config
    require_once __DIR__ . '/db.php';
}

require_once __DIR__ . '/services/MailService.php';

// Prevent concurrent runs using flock
$lockFile = sys_get_temp_dir() . '/sap_email_cron.lock';
$lockHandle = fopen($lockFile, 'c+');
if (!$lockHandle) {
    die("Cannot open lock file.");
}

if (!flock($lockHandle, LOCK_EX | LOCK_NB)) {
    die("Another instance of the email cron is already running.");
}

// Write current process ID to lock file for tracking
ftruncate($lockHandle, 0);
rewind($lockHandle);
fwrite($lockHandle, (string) getmypid());

$mailService = MailService::getInstance();

try {
    // 1. Ensure any new approved/published blogs are correctly queued first
    $mailService->queuePendingBlogNotifications();

    // 2. Fetch up to 12 pending emails from the queue
    $stmt = $pdo->prepare("SELECT * FROM email_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 12");
    $stmt->execute();
    $queuedEmails = $stmt->fetchAll();

    if (empty($queuedEmails)) {
        echo "No pending emails in queue.\n";
        flock($lockHandle, LOCK_UN);
        fclose($lockHandle);
        exit;
    }

    echo "Found " . count($queuedEmails) . " pending emails. Sending at a rate of 12 per minute (5-second intervals)...\n";

    $count = 0;
    foreach ($queuedEmails as $index => $email) {
        // Respect rate limits: sleep 5 seconds between consecutive sends
        if ($index > 0) {
            sleep(5);
        }

        $id = $email['id'];
        $recipient = $email['recipient'];
        $subject = $email['subject'];
        $body = $email['body'];

        // Mark as sending/processing to avoid duplicate takes
        $stmtUpdate = $pdo->prepare("UPDATE email_queue SET status = 'sending', attempts = attempts + 1 WHERE id = ?");
        $stmtUpdate->execute([$id]);

        $success = $mailService->sendDirect($recipient, $subject, $body);

        if ($success) {
            $stmtSuccess = $pdo->prepare("UPDATE email_queue SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmtSuccess->execute([$id]);
            echo "Successfully sent email to $recipient\n";
            $count++;
        } else {
            $stmtFail = $pdo->prepare("UPDATE email_queue SET status = 'failed', error_message = ? WHERE id = ?");
            $stmtFail->execute(["Mail send failed. Check logs in email_logs/mail.log.", $id]);
            echo "Failed to send email to $recipient\n";
        }
    }

    echo "Cron execution complete. Sent $count emails.\n";

} catch (Exception $e) {
    error_log("Error in email cron: " . $e->getMessage());
    echo "ERROR: " . $e->getMessage() . "\n";
} finally {
    flock($lockHandle, LOCK_UN);
    fclose($lockHandle);
}
