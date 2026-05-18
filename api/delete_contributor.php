<?php
require_once 'db.php';
require_once 'auth_check.php';
require_once 'permission_check.php';
requireAdmin();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? null;

    if (!$id) {
        echo json_encode(['status' => 'error', 'message' => 'Missing ID']);
        exit;
    }

    try {
        // 1. Check if contributor exists
        $stmt = $pdo->prepare("SELECT id, email FROM contributors WHERE id = ?");
        $stmt->execute([$id]);
        $contributor = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($contributor) {
            $randomId = mt_rand(100000, 999999);
            $deletedEmail = "deleted_user_" . $randomId . "_" . $contributor['email'];

            // 2. Perform Soft Delete on Contributor Profile
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $deleteStmt = $pdo->prepare("
                UPDATE contributors 
                SET email = ?,
                    is_deleted = 1, 
                    status = 'deleted',
                    deleted_at = CURRENT_TIMESTAMP,
                    deletion_ip = ?,
                    deletion_method = 'admin_action',
                    deletion_confirmation_method = 'admin_confirmed'
                WHERE id = ?
            ");
            $deleteStmt->execute([$deletedEmail, $ipAddress, $id]);

            // 3. Deactivate and Anonymize the linked dashboard user if exists
            // NOTE: We do NOT delete the record from the 'members' table. 
            // This ensures they remain a regular member of the community.
            $userStmt = $pdo->prepare("
                UPDATE users 
                SET email = ?,
                    username = ?,
                    is_deleted = 1,
                    is_active = 0,
                    deleted_at = CURRENT_TIMESTAMP,
                    deletion_ip = ?,
                    deletion_method = 'admin_action',
                    deletion_confirmation_method = 'admin_confirmed'
                WHERE LOWER(email) = LOWER(?)
            ");
            $userStmt->execute([$deletedEmail, $deletedEmail, $ipAddress, $contributor['email']]);

            echo json_encode(['status' => 'success', 'message' => 'Contributor removed. The user remains an active regular member.']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Contributor not found']);
        }

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
}
?>
