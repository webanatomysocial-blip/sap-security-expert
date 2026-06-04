<?php
/**
 * api/admin_members.php
 * Admin-only endpoint for managing member registrations.
 *
 * GET  /admin/members?status=all|pending|approved|rejected
 * POST /admin/members  { action: approve|reject|delete, id: <member_id> }
 */
require_once 'auth_check.php';
require_once 'permission_check.php';

header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) session_start();

$isLoggedIn = !empty($_SESSION['admin_logged_in']);
$role       = $_SESSION['role'] ?? 'guest';

if (!$isLoggedIn || $role !== 'admin') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Admin access required.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $status = $_GET['status'] ?? 'all';

        if ($status === 'all') {
            $stmt = $pdo->prepare("SELECT id, name, phone, email, location, company_name, job_role, profile_image, status, rejection_reason, created_at, approved_at, is_deleted, deleted_at, deletion_ip, deletion_method, deletion_confirmation_method FROM members WHERE is_deleted = 0 ORDER BY created_at DESC");
            $stmt->execute();
        } else {
            $stmt = $pdo->prepare("SELECT id, name, phone, email, location, company_name, job_role, profile_image, status, rejection_reason, created_at, approved_at, is_deleted, deleted_at, deletion_ip, deletion_method, deletion_confirmation_method FROM members WHERE status = ? ORDER BY created_at DESC");
            $stmt->execute([$status]);
        }

        $members = $stmt->fetchAll();
        echo json_encode(['status' => 'success', 'members' => $members]);
        exit;
    }

    if ($method === 'POST') {
        $input  = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $input['action'] ?? '';
        $id     = (int)($input['id'] ?? 0);
        $reason = $input['rejection_reason'] ?? null;

        if (!$id || !in_array($action, ['approve', 'reject', 'delete'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid action or ID.']);
            exit;
        }

        if ($action === 'approve') {
            $stmt = $pdo->prepare("UPDATE members SET status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$id]);

            // Sync to contributors
            $stmtUser = $pdo->prepare("SELECT email, name FROM members WHERE id = ?");
            $stmtUser->execute([$id]);
            $member = $stmtUser->fetch();
            if ($member) {
                $pdo->prepare("UPDATE contributors SET status = 'approved' WHERE LOWER(email) = LOWER(?)")
                    ->execute([$member['email']]);

                require_once 'services/NotificationService.php';
                $ns = new NotificationService();
                $ns->notifyMemberApproved($member['email'], $member['name'], [
                    'username' => $member['email']
                ]);
            }

            echo json_encode(['status' => 'success', 'message' => 'Member approved successfully.']);
        } elseif ($action === 'reject') {
            if ($reason) {
                $stmt = $pdo->prepare("UPDATE members SET status = 'rejected', rejection_reason = ? WHERE id = ?");
                $stmt->execute([$reason, $id]);
            } else {
                $stmt = $pdo->prepare("UPDATE members SET status = 'rejected' WHERE id = ?");
                $stmt->execute([$id]);
            }

            // Sync to contributors
            $stmtUser = $pdo->prepare("SELECT email, name FROM members WHERE id = ?");
            $stmtUser->execute([$id]);
            $member = $stmtUser->fetch();
            if ($member) {
                $pdo->prepare("UPDATE contributors SET status = 'rejected', rejection_reason = ? WHERE LOWER(email) = LOWER(?)")
                    ->execute([$reason, $member['email']]);

                require_once 'services/NotificationService.php';
                $ns = new NotificationService();
                $ns->notifyMemberRejected($member['email'], $member['name'], $reason ?: 'No reason provided.');
            }

            echo json_encode(['status' => 'success', 'message' => 'Member rejected.']);
        } elseif ($action === 'delete') {
            $stmtUser = $pdo->prepare("SELECT email FROM members WHERE id = ?");
            $stmtUser->execute([$id]);
            $memberEmail = $stmtUser->fetchColumn();

            if ($memberEmail) {
                // 1. Fully delete member
                $stmt = $pdo->prepare("DELETE FROM members WHERE id = ?");
                $stmt->execute([$id]);

                // 2. Fully delete contributor profile
                $pdo->prepare("DELETE FROM contributors WHERE LOWER(email) = LOWER(?)")
                    ->execute([$memberEmail]);

                // 3. Fully delete dashboard user
                $pdo->prepare("DELETE FROM users WHERE LOWER(email) = LOWER(?)")
                    ->execute([$memberEmail]);
            }
            
            echo json_encode(['status' => 'success', 'message' => 'Member fully deleted.']);
        }
        exit;
    }

    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);

} catch (Exception $e) {
    error_log('[admin_members] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
}
?>
