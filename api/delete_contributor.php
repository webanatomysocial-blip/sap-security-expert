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

            // 2. Perform Full Delete on Contributor Profile
            $deleteStmt = $pdo->prepare("DELETE FROM contributors WHERE id = ?");
            $deleteStmt->execute([$id]);
 
            // 3. Fully delete the linked dashboard user if exists
            $userStmt = $pdo->prepare("DELETE FROM users WHERE LOWER(email) = LOWER(?)");
            $userStmt->execute([$contributor['email']]);

            // 4. Fully delete member
            $memberStmt = $pdo->prepare("DELETE FROM members WHERE LOWER(email) = LOWER(?)");
            $memberStmt->execute([$contributor['email']]);
 
            echo json_encode(['status' => 'success', 'message' => 'Contributor fully deleted.']);
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
