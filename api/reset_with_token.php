<?php
// api/reset_with_token.php
require_once 'db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');
$token = trim($input['token'] ?? '');
$newPassword = $input['password'] ?? '';

if (!$email || !$token || strlen($newPassword) < 8) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid data. Password must be at least 8 characters.']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT token_hash, expires_at FROM password_resets WHERE email = ?");
    $stmt->execute([$email]);
    $record = $stmt->fetch();

    if (!$record || strtotime($record['expires_at']) < time()) {
        throw new Exception("Reset link expired or invalid.");
    }

    if (!hash_equals($record['token_hash'], hash('sha256', $token))) {
        throw new Exception("Invalid reset link.");
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // 1. Update users table (Dashboard/Admin/Contributor)
    $stmtUser = $pdo->prepare("UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)");
    $stmtUser->execute([$hash, $email]);
    $userUpdated = $stmtUser->rowCount() > 0;

    // 2. Update members table (Frontend/Member)
    $stmtMem = $pdo->prepare("UPDATE members SET password_hash = ? WHERE LOWER(email) = LOWER(?)");
    $stmtMem->execute([$hash, $email]);
    $memUpdated = $stmtMem->rowCount() > 0;

    if (!$userUpdated && !$memUpdated) {
        throw new Exception("Account not found.");
    }

    // Delete token
    $pdo->prepare("DELETE FROM password_resets WHERE email = ?")->execute([$email]);

    echo json_encode(['status' => 'success', 'message' => 'Password reset successfully. You can now log in.']);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
