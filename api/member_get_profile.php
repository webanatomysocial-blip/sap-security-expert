<?php
/**
 * api/member_get_profile.php
 * GET — Returns the latest profile data for the logged-in member.
 */
require_once 'db.php';

header("Content-Type: application/json");

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['member_logged_in']) || $_SESSION['member_logged_in'] !== true || !isset($_SESSION['member_email'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

try {
    $email = $_SESSION['member_email'];
    $stmt = $pdo->prepare("SELECT id, name, email, username, phone, location, profile_image, company_name, job_role FROM members WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $member = $stmt->fetch();

    if (!$member) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Member not found']);
        exit;
    }

    echo json_encode([
        'status' => 'success',
        'member' => $member
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error']);
}
?>
