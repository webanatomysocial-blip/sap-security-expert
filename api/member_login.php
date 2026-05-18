<?php
/**
 * api/member_login.php
 * POST — Member authentication. Only approved members can log in.
 */
require_once 'db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

$input    = json_decode(file_get_contents('php://input'), true) ?? [];
$email    = trim($input['email']    ?? '');
$password = $input['password'] ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Email/Username and password are required.']);
    exit;
}

try {
    // ── 1. Discover the Account (Separate Lookups for Stability) ────────────
    $member = null;
    $user = null;
    $contributor = null;

    // Search by Member email or username
    $stmt = $pdo->prepare("SELECT * FROM members WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1");
    $stmt->execute([$email, $email]);
    $member = $stmt->fetch();

    // Search by User email or username
    $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1");
    $stmt->execute([$email, $email]);
    $user = $stmt->fetch();

    // If still no contributor found, try by contributor email
    $stmt = $pdo->prepare("SELECT * FROM contributors WHERE LOWER(email) = LOWER(?) LIMIT 1");
    $stmt->execute([$email]);
    $contributor = $stmt->fetch();

    // Cross-link if possible
    if ($user && !$contributor && $user['contributor_id']) {
        $stmt = $pdo->prepare("SELECT * FROM contributors WHERE id = ?");
        $stmt->execute([$user['contributor_id']]);
        $contributor = $stmt->fetch();
    }
    if ($member && !$contributor) {
        $stmt = $pdo->prepare("SELECT * FROM contributors WHERE LOWER(email) = LOWER(?)");
        $stmt->execute([$member['email']]);
        $contributor = $stmt->fetch();
    }

    // ── EXTRA REFINEMENT: Resolve actual email for member lookup ─────────────
    // If we only found a user/contributor (maybe because they logged in with username),
    // check if a member ALREADY exists for their absolute email address.
    if (!$member && ($user || $contributor)) {
        $resolvedEmail = ($user ? $user['email'] : null) ?: ($contributor ? $contributor['email'] : null);
        if ($resolvedEmail && strtolower($resolvedEmail) !== strtolower($email)) {
            $stmt = $pdo->prepare("SELECT * FROM members WHERE LOWER(email) = LOWER(?) LIMIT 1");
            $stmt->execute([$resolvedEmail]);
            $member = $stmt->fetch();
        }
    }

    if (!$member && !$user && !$contributor) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Invalid email/username or password.']);
        exit;
    }

    // ── BLOCK ADMIN ACCOUNTS ──────────────────────────────────────────────
    // Admins must use the admin login page, not the member portal.
    // This also prevents ghost member records from being created for admins.
    if ($user && $user['role'] === 'admin') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Admin accounts must log in via the Admin Login page.']);
        exit;
    }

    // ── 2. Password Verification ──────────────────────────────────────────
    $passwordHash = ($member ? $member['password_hash'] : null) ?: ($user ? $user['password'] : null);
    
    if (!$passwordHash || !password_verify($password, $passwordHash)) {
        // Double check fallback if they used username for an account that only has email hash in members
        $isValid = false;
        if ($user && password_verify($password, $user['password'])) $isValid = true;
        if ($member && password_verify($password, $member['password_hash'])) $isValid = true;

        if (!$isValid) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Invalid email/username or password.']);
            exit;
        }
    }

    // ── 3. Lazy Migration ──────────────────────────────────────────────────
    // Only migrate non-admin contributors/users into the members table.
    if (!$member && (!$user || $user['role'] !== 'admin')) {
        $newEmail = ($user ? $user['email'] : null) ?: ($contributor ? $contributor['email'] : $email);
        $newName = ($contributor ? $contributor['full_name'] : null) ?: ($user ? $user['username'] : 'Member');
        
        $pdo->prepare("INSERT INTO members (name, email, password_hash, status, approved_at) VALUES (?, ?, ?, 'approved', CURRENT_TIMESTAMP)")
            ->execute([$newName, $newEmail, $passwordHash]);
        
        $newMemberId = $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM members WHERE id = ?");
        $stmt->execute([$newMemberId]);
        $member = $stmt->fetch();
    }


    // ── 4. Account Status Check ─────────────────────────────────────────────
    // Block deactivated (soft-deleted) accounts
    if (($member && $member['is_deleted'] == 1) || ($member && $member['status'] === 'deleted')) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'This account has been deactivated.']);
        exit;
    }

    if ($member['status'] === 'pending') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Your account is pending approval.']);
        exit;
    }

    // ── 5. Setup Sessions ──────────────────────────────────────────────────
    if (session_status() === PHP_SESSION_NONE) {
        $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        // Backward compatible positional arguments for older PHP versions if needed
        session_set_cookie_params(0, '/', '', $secure, true); 
        session_start();
    }
    session_regenerate_id(true);

    $_SESSION['member_logged_in'] = true;
    $_SESSION['member_id'] = $member['id'];
    $_SESSION['member_email'] = $member['email'];
    $_SESSION['member_name'] = $member['name'];

    $isContributor = false;
    $adminData = null;
    $permissions = [];

    if ($user && $user['is_active'] == 1) {
        $isContributor = true;
        $_SESSION['admin_id'] = $user['id'];
        $_SESSION['admin_user'] = $user['username'];
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['role'] = $user['role'];
        $_SESSION['is_active'] = 1;

        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        $permStmt = $pdo->prepare("SELECT * FROM user_permissions WHERE user_id = ?");
        $permStmt->execute([$user['id']]);
        $perms = $permStmt->fetch();
        if ($perms) {
            $permissions = [
                'can_manage_blogs' => (bool)$perms['can_manage_blogs'],
                'can_review_blogs' => (bool)($perms['can_review_blogs'] ?? 0),
                'can_manage_comments' => (bool)($perms['can_manage_comments'] ?? 0),
            ];
        }
        $_SESSION['permissions'] = $permissions;
        $adminData = ['id' => $user['id'], 'username' => $user['username'], 'role' => $user['role']];
    }

    echo json_encode([
        'status' => 'success',
        'is_contributor' => $isContributor,
        'csrf_token' => $_SESSION['csrf_token'] ?? null,
        'admin_user' => $adminData,
        'permissions' => $permissions,
        'member' => [
            'id' => $member['id'],
            'name' => $member['name'],
            'email' => $member['email'],
            'profile_image' => $member['profile_image'] ?? null
        ]
    ]);

} catch (Exception $e) {
    error_log('[member_login] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Login technical error. Please try again.']);
}
?>