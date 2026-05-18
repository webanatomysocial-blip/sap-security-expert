<?php
/**
 * api/member_signup.php
 * POST — Public member registration. Status starts as 'pending'.
 * Admin must approve before the member can log in.
 */
require_once 'db.php';
require_once 'services/OTPService.php';
require_once 'services/NotificationService.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

$input    = json_decode(file_get_contents('php://input'), true) ?? [];
$name     = trim($input['name']     ?? '');
$phone    = trim($input['phone']    ?? '');
$email    = trim($input['email']    ?? '');
$location = trim($input['location'] ?? '');
$company  = trim($input['company_name'] ?? '');
$role     = trim($input['job_role'] ?? '');
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

// Basic validation
if (!$name || !$email || !$password) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Name, email and password are required.']);
    exit;
}

// 1. Verify OTP first
$otpService = new OTPService();
if (!$otpService->isVerified($email, 'signup')) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Email not verified. Please verify your email with OTP first.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Please enter a valid email address.']);
    exit;
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Password must be at least 8 characters.']);
    exit;
}

try {
    // Check duplicate email
    $check = $pdo->prepare("SELECT id, status FROM members WHERE email = ? LIMIT 1");
    $check->execute([$email]);
    $existing = $check->fetch();

    if ($existing) {
        if ($existing['status'] === 'pending') {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'Your signup request is already on our waitlist and pending admin approval.']);
        } elseif ($existing['status'] === 'approved') {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'This email is already registered. Please log in.']);
        } else {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'This email was previously rejected. Contact the administrator.']);
        }
        exit;
    }

    // 1. Check if this is an existing contributor/admin in the users table
    $userCheck = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1");
    $userCheck->execute([$email]);
    if ($userCheck->fetch()) {
        http_response_code(409);
        echo json_encode(['status' => 'error', 'message' => 'You already have a contributor account with this email. Please Go to the Login page and use your existing credentials.']);
        exit;
    }

    // 2. Check duplicate username or generate fallback
    if (!$username) {
        $username = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $name));
    }
    
    // Ensure username is globally unique (check both members and users tables)
    $isUnique = false;
    $tempUsername = $username;
    $attempts = 0;
    while (!$isUnique && $attempts < 5) {
        $uCheck1 = $pdo->prepare("SELECT id FROM members WHERE LOWER(username) = LOWER(?) LIMIT 1");
        $uCheck1->execute([$tempUsername]);
        
        $uCheck2 = $pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1");
        $uCheck2->execute([$tempUsername]);
        
        if ($uCheck1->fetch() || $uCheck2->fetch()) {
            $tempUsername = $username . rand(100, 999);
            $attempts++;
        } else {
            $isUnique = true;
            $username = $tempUsername;
        }
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("
        INSERT INTO members (name, phone, email, username, location, company_name, job_role, password_hash, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    ");
    $stmt->execute([$name, $phone, $email, $username, $location, $company, $role, $hash]);

    // 2. Send Notifications
    $notificationService = new NotificationService();
    $notificationService->notifyMemberSignupSubmitted($email, $name);

    echo json_encode([
        'status'  => 'success',
        'message' => 'You have been added to our community waitlist! An admin will review your profile and approve your membership shortly.',
    ]);

} catch (Exception $e) {
    error_log('[member_signup] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
}
?>
