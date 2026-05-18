<?php
// api/send_otp.php
require_once 'db.php';
require_once 'services/OTPService.php';
require_once 'services/MailService.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$email = trim($input['email'] ?? '');
$type  = trim($input['type'] ?? 'signup');

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Valid email is required.']);
    exit;
}

$otpService = new OTPService();
$mailService = MailService::getInstance();

// 1. If it's for signup, check if email is already registered
if ($type === 'signup') {
    $check = $pdo->prepare("SELECT id, status FROM members WHERE email = ? LIMIT 1");
    $check->execute([$email]);
    $existing = $check->fetch();

    if ($existing) {
        if ($existing['status'] === 'approved') {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'This email is already registered. Please log in.']);
        } elseif ($existing['status'] === 'pending') {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'Your signup request is already pending admin approval.']);
        } else {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'This account has been rejected or disabled. Contact support.']);
        }
        exit;
    }
}

// 2. If it's for reset or delete, check if email exists
if ($type === 'reset' || $type === 'delete_account') {
    $check = $pdo->prepare("SELECT id FROM members WHERE email = ? AND is_deleted = 0 LIMIT 1");
    $check->execute([$email]);
    if (!$check->fetch()) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'No active account found with this email address.']);
        exit;
    }
}

$code = '';
try {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $code = $otpService->generateOTP($email, $type, $ip);
    
    $subject = "Verification Code";
    $template = "member/otp_verification";

    if ($type === 'reset') {
        $subject = "Password Reset Verification Code";
    } elseif ($type === 'delete_account') {
        $subject = "Account Deletion Verification Code";
        $template = "member/account_deletion_otp";
    }
    
    // Fetch name for personalization
    $nameStmt = $pdo->prepare("SELECT name FROM members WHERE email = ? LIMIT 1");
    $nameStmt->execute([$email]);
    $name = $nameStmt->fetchColumn() ?: 'Member';

    $success = $mailService->send($email, $subject, $template, [
        'name' => $name,
        'code' => $code,
        'year' => date('Y')
    ]);

    if ($success) {
        echo json_encode(['status' => 'success', 'message' => 'Verification code sent to your email.']);
    } else {
        throw new Exception("Failed to send verification email. Please contact support.");
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
