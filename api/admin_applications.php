<?php
require_once 'db.php';
require_once 'auth_check.php';
require_once 'permission_check.php';
requireAdmin();

header('Content-Type: application/json');

try {
    $stmt = $pdo->query("SELECT id, full_name AS name, email, linkedin, country, organization, designation, role, expertise, other_expertise, years_experience, short_bio, contribution_types, proposed_topics, contributed_elsewhere, previous_work_links, preferred_frequency, primary_motivation, weekly_time, volunteer_events, product_evaluation, personal_website, twitter_handle, image AS profile_image, status, created_at, is_deleted, deleted_at, deletion_ip, deletion_method, deletion_confirmation_method FROM contributors ORDER BY created_at DESC");
    $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($applications);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
