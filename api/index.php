<?php
// api/index.php - Central Router for SAP Security Expert
// Directs /api requests to the appropriate handlers

require_once 'db.php';

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('/\/api(\/.*)$/', $requestUri, $matches)) {
    $path = $matches[1];
} else {
    $path = $requestUri;
}
$method = $_SERVER['REQUEST_METHOD'];

// 0. Upload Handlers
if ($path === '/upload_blog_image.php' || $path === '/upload-blog-image') {
    require __DIR__ . '/upload_blog_image.php';
    exit;
}
if ($path === '/upload_ad_image.php' || $path === '/upload-ad-image') {
    require __DIR__ . '/upload_ad_image.php';
    exit;
}

// 0b. Plagiarism Check
if ($path === '/check_plagiarism.php' || $path === '/check-plagiarism') {
    require __DIR__ . '/check_plagiarism.php';
    exit;
}

// 1. Posts API (Standardized)
if (preg_match('/^\/posts(\/([^\/]+))?/', $path, $matches)) {
    $resourceId = $matches[2] ?? null;
    if ($resourceId) {
        $_GET['id']   = $resourceId;
        $_GET['slug'] = $resourceId;
    }
    require __DIR__ . '/manage_blogs.php';
    exit;
}

// 2. Auth & Profile API
if ($path === '/login') {
    require __DIR__ . '/login.php';
    exit;
}
if ($path === '/admin/profile') {
    require __DIR__ . '/get_profile.php';
    exit;
}
if ($path === '/admin/authors') {
    require __DIR__ . '/get_authors.php';
    exit;
}
if ($path === '/admin/profile/update') {
    require __DIR__ . '/update_profile.php';
    exit;
}
if ($path === '/admin/reset-password') {
    require __DIR__ . '/reset_password.php';
    exit;
}

// 3. Contributor Login Management (Admin)
if ($path === '/admin/contributor-login') {
    require __DIR__ . '/get_contributor_login.php';
    exit;
}
if ($path === '/admin/create-contributor-login') {
    require __DIR__ . '/create_contributor_login.php';
    exit;
}
if ($path === '/admin/update-contributor-access') {
    require __DIR__ . '/update_contributor_access.php';
    exit;
}

// 4. Blog Review Workflow (Admin)
if (preg_match('/^\/admin\/blogs\/([^\/]+)\/review$/', $path, $matches)) {
    $_GET['id'] = $matches[1];
    require __DIR__ . '/review_blog.php';
    exit;
}
// Pending / Blog Review list (both paths supported)
if ($path === '/admin/blogs/pending' || $path === '/admin/blog-review') {
    require __DIR__ . '/get_pending_blogs.php';
    exit;
}
// Admin: reset contributor password
if ($path === '/admin/reset-contributor-password') {
    require __DIR__ . '/reset_contributor_password.php';
    exit;
}

// 5. Comments API
if ($path === '/comments') {
    require __DIR__ . '/save_comment.php';
    exit;
}
if ($path === '/admin/comments') {
    require __DIR__ . '/manage_comments.php';
    exit;
}

// 6. Contributors API
if ($path === '/contributors/apply') {
    require __DIR__ . '/apply_contributor.php';
    exit;
}
if ($path === '/contributors/approved') {
    require __DIR__ . '/get_approved_contributors.php';
    exit;
}
if (preg_match('/^\/contributors\/profile\/([0-9]+)$/', $path, $matches)) {
    $_GET['id'] = $matches[1];
    require __DIR__ . '/get_contributor_profile.php';
    exit;
}
if ($path === '/admin/contributors') {
    if ($method === 'POST') {
        require __DIR__ . '/update_contributor_status.php';
    } else {
        require __DIR__ . '/admin_applications.php';
    }
    exit;
}

// 7. Ads & Announcements
if ($path === '/ads' || $path === '/admin/ads') {
    require __DIR__ . '/manage_ads.php';
    exit;
}
if ($path === '/ads/click') {
    require __DIR__ . '/ads_click.php';
    exit;
}
if ($path === '/announcements' || $path === '/admin/announcements') {
    require __DIR__ . '/manage_announcements.php';
    exit;
}
if (preg_match('/^\/admin\/announcements\/([^\/]+)\/review$/', $path, $matches)) {
    $_GET['id'] = $matches[1];
    require __DIR__ . '/review_announcement.php';
    exit;
}

// 8. Community Stats
if ($path === '/stats/community') {
    require __DIR__ . '/get_community_stats.php';
    exit;
}
if ($path === '/admin/stats') {
    require __DIR__ . '/admin_stats.php';
    exit;
}
if ($path === '/contributor/stats') {
    require __DIR__ . '/contributor_stats.php';
    exit;
}

// 9. Views API
if ($path === '/views') {
    require __DIR__ . '/save_view.php';
    exit;
}

// 11. Members (public) API
if ($path === '/member/signup') {
    require __DIR__ . '/member_signup.php';
    exit;
}
if ($path === '/member/login') {
    require __DIR__ . '/member_login.php';
    exit;
}
if ($path === '/member/profile') {
    require __DIR__ . '/member_get_profile.php';
    exit;
}
if ($path === '/member/profile/update') {
    require __DIR__ . '/member_update_profile.php';
    exit;
}

// 12. Admin Members Management
if ($path === '/admin/members') {
    require __DIR__ . '/admin_members.php';
    exit;
}

if ($path === '/admin/reset-member-password') {
    require __DIR__ . '/reset_member_password.php';
    exit;
}

if ($path === '/admin/toggle-exclusive') {
    require __DIR__ . '/toggle_exclusive_content.php';
    exit;
}

// 404 Fallback
http_response_code(404);
echo json_encode(["status" => "error", "message" => "Endpoint not found: $path"]);
?>
