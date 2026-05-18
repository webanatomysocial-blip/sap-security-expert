<?php
// api/update_contributor_status.php
require_once 'db.php';
require_once 'auth_check.php';
require_once 'permission_check.php';
requireAdmin();

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['id']) || !isset($data['status'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid input"]);
    exit;
}

$id = $data['id'];
$status = $data['status']; // 'approved', 'rejected', 'pending'
$reason = $data['rejection_reason'] ?? null;

try {
    $stmt = $pdo->prepare("UPDATE contributors SET status = ?, rejection_reason = ? WHERE id = ?");
    $stmt->execute([$status, $reason, $id]);

    // Send email notification based on status
    $stmtUser = $pdo->prepare("
        SELECT c.full_name, c.email, c.image, u.id as user_obj_id, u.username, u.password, u.profile_image 
        FROM contributors c 
        LEFT JOIN users u ON c.id = u.contributor_id 
        WHERE c.id = ?
    ");
    $stmtUser->execute([$id]);
    $userRow = $stmtUser->fetch();

    if ($userRow) {
        $userEmail = $userRow['email'];
        $fullName = $userRow['full_name'];

        // --- NEW: Sync to members table ---
        $memberStmt = $pdo->prepare("SELECT id FROM members WHERE LOWER(email) = LOWER(?) LIMIT 1");
        $memberStmt->execute([$userEmail]);
        $member = $memberStmt->fetch();

        if ($status === 'approved') {
            $plainPassword = null;
            $username = $userRow['username'];

            // 1. Ensure User account exists in 'users' table (Contributor Dashboard)
            if (!$userRow['user_obj_id']) {
                $plainPassword = bin2hex(random_bytes(8));
                $passwordHash = password_hash($plainPassword, PASSWORD_BCRYPT);
                
                // Generate a unique username (compatible with members)
                $baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $fullName));
                if (empty($baseUsername)) {
                    $baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode('@', $userEmail)[0]));
                }
                
                $username = $baseUsername;
                $isUnique = false;
                $tries = 0;
                while (!$isUnique && $tries < 10) {
                    $uCheck1 = $pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1");
                    $uCheck1->execute([$username]);
                    
                    $uCheck2 = $pdo->prepare("SELECT id FROM members WHERE LOWER(username) = LOWER(?) LIMIT 1");
                    $uCheck2->execute([$username]);
                    
                    if ($uCheck1->fetch() || $uCheck2->fetch()) {
                        $username = $baseUsername . rand(100, 999);
                        $tries++;
                    } else {
                        $isUnique = true;
                    }
                }

                $stmtInsertUser = $pdo->prepare("
                    INSERT INTO users (username, password, role, contributor_id, email, full_name, profile_image, is_active)
                    VALUES (?, ?, 'contributor', ?, ?, ?, ?, 1)
                ");
                $stmtInsertUser->execute([$username, $passwordHash, $id, $userEmail, $fullName, $userRow['image']]);
                $newUserId = $pdo->lastInsertId();

                // Assign default permissions (manage blogs)
                $pdo->prepare("
                    INSERT INTO user_permissions (user_id, can_manage_blogs, can_manage_ads, can_manage_comments, can_manage_announcements, can_review_blogs)
                    VALUES (?, 1, 0, 0, 0, 0)
                ")->execute([$newUserId]);
            }

            // 2. Ensure Member account exists in 'members' table (Frontend)
            if ($member) {
                // Update existing member to approved
                $pdo->prepare("UPDATE members SET status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE id = ?")
                    ->execute([$member['id']]);
            } else {
                // Create new approved member record
                if (!$plainPassword) {
                    $plainPassword = bin2hex(random_bytes(8));
                    $passwordHash = password_hash($plainPassword, PASSWORD_BCRYPT);
                } else {
                    // Use the same password generated for the user account above
                    $passwordHash = password_hash($plainPassword, PASSWORD_BCRYPT);
                }
                
                $profileImage = $userRow['profile_image'] ?: $userRow['image'];
                $pdo->prepare("INSERT INTO members (name, email, status, approved_at, password_hash, profile_image) VALUES (?, ?, 'approved', CURRENT_TIMESTAMP, ?, ?)")
                    ->execute([$fullName, $userEmail, $passwordHash, $profileImage]);
            }

            require_once 'services/NotificationService.php';
            $ns = new NotificationService();
            $credentials = [
                'username' => $username ?: $userEmail,
                'password' => $plainPassword ?? 'Use your existing account password'
            ];
            $ns->notifyContributorApproved($userEmail, $fullName, $credentials);

        } elseif ($status === 'rejected') {
            // NOTE: We do NOT update the member status to 'rejected' here.
            // If they were already an approved member, they should remain an approved member.
            // Rejecting their contributor application only affects their contributor status.
            require_once 'services/NotificationService.php';
            $ns = new NotificationService();
            $ns->notifyContributorRejected($userEmail, $fullName, $reason ?: 'Does not meet our current requirements.');
        }
    }

    echo json_encode(["status" => "success", "message" => "Status updated successfully and user linked"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
