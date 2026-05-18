<?php
// api/delete_account.php
require_once 'db.php';
require_once 'services/OTPService.php';
require_once 'services/NotificationService.php';

header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 1. Verify authentication
$memberId = $_SESSION['member_id'] ?? null;
$memberEmail = $_SESSION['member_email'] ?? null;
$memberName = $_SESSION['member_name'] ?? null;

// Fallback for contributors logged in via admin session
if (!$memberId && isset($_SESSION['admin_id'])) {
    $adminId = $_SESSION['admin_id'];
    $stmt = $pdo->prepare("SELECT email, full_name, username FROM users WHERE id = ?");
    $stmt->execute([$adminId]);
    $u = $stmt->fetch();
    if ($u) {
        $memberEmail = $u['email'];
        $memberName = $u['full_name'] ?: $u['username'];
        
        // Also try to find the corresponding member record
        $stmt = $pdo->prepare("SELECT id FROM members WHERE LOWER(email) = LOWER(?)");
        $stmt->execute([$memberEmail]);
        $memberId = $stmt->fetchColumn();
    }
}

if (!$memberEmail) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Please log in again.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$otp = trim($input['otp'] ?? '');

if (!$otp) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Verification code is required.']);
    exit;
}

try {
    $otpService = new OTPService();
    $notificationService = new NotificationService();

    // 2. Verify OTP
    try {
        $otpService->verifyOTP($memberEmail, $otp, 'delete_account');
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        exit;
    }

    // 3. Perform Deletion in a Transaction
    $pdo->beginTransaction();

    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $timestamp = date('Y-m-d H:i:s');
    
    error_log("[delete_account] Processing deletion for: $memberEmail");

    // Check if user is a contributor
    $stmtCheck = $pdo->prepare("SELECT id FROM contributors WHERE LOWER(email) = LOWER(?) AND is_deleted = 0");
    $stmtCheck->execute([$memberEmail]);
    $isContributor = $stmtCheck->fetchColumn();

    if ($isContributor) {
        // CASE: Contributor - Downgrade to regular member
        
        $randomId = mt_rand(100000, 999999);
        $deletedEmail = "deleted_user_" . $randomId . "_" . $memberEmail;

        // 1. Anonymize and deactivate contributor profile
        $stmtContributors = $pdo->prepare("
            UPDATE contributors 
            SET email = ?,
                is_deleted = 1,
                deleted_at = ?,
                deletion_ip = ?,
                deletion_method = 'UI',
                deletion_confirmation_method = 'OTP',
                status = 'deleted'
            WHERE LOWER(email) = LOWER(?)
        ");
        $stmtContributors->execute([$deletedEmail, $timestamp, $ip, $memberEmail]);

        // 2. Anonymize and deactivate dashboard login
        $stmtUsers = $pdo->prepare("
            UPDATE users 
            SET email = ?,
                username = ?,
                is_active = 0, 
                is_deleted = 1, 
                deleted_at = ?, 
                deletion_ip = ? 
            WHERE LOWER(email) = LOWER(?)
        ");
        $stmtUsers->execute([$deletedEmail, $deletedEmail, $timestamp, $ip, $memberEmail]);

        // 3. Keep members record ACTIVE (do not set is_deleted = 1 and do NOT anonymize)
        // This allows them to still log in as a regular member.
        
        $message = 'Your contributor account has been removed. You are now a regular member.';
    } else {
        // CASE: Regular Member - Full soft-delete
        
        $randomId = mt_rand(100000, 999999);
        $deletedEmail = "deleted_user_" . $randomId . "_" . $memberEmail;

        // Update members table (Anonymize email and username but keep other details)
        $stmtMembers = $pdo->prepare("
            UPDATE members 
            SET email = ?, 
                username = ?,
                is_deleted = 1,
                deleted_at = ?,
                deletion_ip = ?,
                deletion_method = 'UI',
                deletion_confirmation_method = 'OTP',
                status = 'deleted'
            WHERE (id > 0 AND id = ?) OR LOWER(email) = LOWER(?)
        ");
        $stmtMembers->execute([$deletedEmail, $deletedEmail, $timestamp, $ip, $memberId ?? 0, $memberEmail]);

        // Update users table (Anonymize email but keep other details)
        $stmtUsers = $pdo->prepare("
            UPDATE users 
            SET is_active = 0, 
                is_deleted = 1, 
                username = ?, 
                email = ?, 
                deleted_at = ?, 
                deletion_ip = ? 
            WHERE LOWER(email) = LOWER(?)
        ");
        $stmtUsers->execute([$deletedEmail, $deletedEmail, $timestamp, $ip, $memberEmail]);

        $message = 'Your account has been permanently deleted.';
    }

    $pdo->commit();

    // 4. Send Confirmation Email (to the original email before session is cleared)
    try {
        $notificationService->notifyAccountDeleted($memberEmail, $memberName);
    } catch (Exception $e) {
        error_log("[delete_account] Email notification failed: " . $e->getMessage());
    }

    // 5. Destroy Session ONLY if it was a full deletion
    // If they were downgraded to a member, they can stay logged in?
    // Actually, it's safer to log them out so they re-login with their member session.
    session_destroy();
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }

    echo json_encode([
        'status' => 'success', 
        'message' => $message
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[delete_account] Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'An error occurred during account deletion.']);
}
?>
