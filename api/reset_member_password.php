<?php
/**
 * api/reset_member_password.php
 * POST /api/admin/reset-member-password
 * Admin-only: generate new random password for a member
 */
require_once 'db.php';
require_once 'auth_check.php';
require_once 'permission_check.php';

header('Content-Type: application/json');

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$memberId = (int)($input['member_id'] ?? 0);

if (!$memberId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'member_id is required']);
    exit;
}

try {
    // Verify member exists
    $stmt = $pdo->prepare("SELECT id, email, name FROM members WHERE id = ?");
    $stmt->execute([$memberId]);
    $member = $stmt->fetch();

    if (!$member) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Member not found']);
        exit;
    }

    // Generate a strong random password: Sap@XXXX (8 chars min, mixed)
    $suffix  = strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
    $newPass = 'Sap@' . $suffix;

    $hashed = password_hash($newPass, PASSWORD_BCRYPT);
    
    $pdo->beginTransaction();

    // 1. Update members table
    $stmt = $pdo->prepare("UPDATE members SET password_hash = ? WHERE id = ?");
    $stmt->execute([$hashed, $memberId]);

    // 2. Sync to users table if same email exists
    if (!empty($member['email'])) {
        $stmtSync = $pdo->prepare("UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)");
        $stmtSync->execute([$hashed, $member['email']]);
    }

    $pdo->commit();

    echo json_encode([
        'status'      => 'success',
        'message'     => 'Password reset successfully',
        'new_password'=> $newPass,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
