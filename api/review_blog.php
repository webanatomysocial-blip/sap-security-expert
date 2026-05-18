<?php
/**
 * api/review_blog.php
 * PUT /api/admin/blogs/{id}/review
 * STRICTLY admin-only — contributors cannot approve or reject.
 *
 * Hardening: requireAdmin() called first, before any other check.
 */
require_once 'db.php';
require_once 'auth_check.php';     // session + is_active + CSRF guard (PUT covered)
require_once 'permission_check.php';
require_once 'services/AuditService.php';

$audit = new AuditService($pdo);

header('Content-Type: application/json');

// Use can_review_blogs permission check
checkPermission('can_review_blogs');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Accept id from URL path or query param
$id = $_GET['id'] ?? null;
$input = json_decode(file_get_contents('php://input'), true) ?? [];
if (!$id)
    $id = $input['id'] ?? null;
$action = strtolower(trim($input['action'] ?? ''));

if (!$id || !in_array($action, ['approve', 'reject', 'save_as_draft'], true)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => '"id" and "action" (approve|reject|save_as_draft) are required']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, submission_status, title, slug, category FROM blogs WHERE id = ?");
    $stmt->execute([$id]);
    $blog = $stmt->fetch();

    if (!$blog) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Blog not found']);
        exit;
    }

    if ($action === 'approve') {
        if ($blog['submission_status'] === 'edited') {
            $stmt = $pdo->prepare(
                "UPDATE blogs SET 
                    title = COALESCE(draft_title, title),
                    excerpt = COALESCE(draft_excerpt, excerpt),
                    content = COALESCE(draft_content, content),
                    image = COALESCE(draft_image, image),
                    category = COALESCE(draft_category, category),
                    faqs = COALESCE(draft_faqs, faqs),
                    meta_title = COALESCE(draft_meta_title, meta_title),
                    meta_description = COALESCE(draft_meta_description, meta_description),
                    meta_keywords = COALESCE(draft_meta_keywords, meta_keywords),
                    cta_title = COALESCE(draft_cta_title, cta_title),
                    cta_description = COALESCE(draft_cta_description, cta_description),
                    cta_button_text = COALESCE(draft_cta_button_text, cta_button_text),
                    cta_button_link = COALESCE(draft_cta_button_link, cta_button_link),
                    draft_title = NULL, draft_excerpt = NULL, draft_content = NULL,
                    draft_image = NULL, draft_category = NULL, draft_faqs = NULL,
                    draft_meta_title = NULL, draft_meta_description = NULL, draft_meta_keywords = NULL,
                    draft_cta_title = NULL, draft_cta_description = NULL, 
                    draft_cta_button_text = NULL, draft_cta_button_link = NULL,
                    submission_status = 'approved', 
                    status = 'approved',
                    rejection_feedback = NULL
                WHERE id = ?"
            );
            $stmt->execute([$id]);
        } else {
            $stmt = $pdo->prepare(
                "UPDATE blogs SET submission_status = 'approved', status = 'approved', rejection_feedback = NULL WHERE id = ?"
            );
            $stmt->execute([$id]);
        }

        $audit->log($_SESSION['admin_id'], 'blog_approve', 'blog', $id, "Status: " . $blog['submission_status']);

        // Notify Author
        $stmtAuthor = $pdo->prepare("
            SELECT c.email 
            FROM contributors c 
            JOIN users u ON c.id = u.contributor_id
            JOIN blogs b ON u.id = b.author_id 
            WHERE b.id = ?
        ");
        $stmtAuthor->execute([$id]);
        $author = $stmtAuthor->fetch();
        if ($author) {
            require_once 'services/NotificationService.php';
            $ns = new NotificationService();
            $siteUrl = rtrim(getenv('SITE_URL') ?: 'https://sapsecurityexpert.com', '/');
            $categorySlug = strtolower(str_replace(' ', '-', $blog['category'] ?? 'others'));
            $postUrl = "$siteUrl/$categorySlug/{$blog['slug']}";

            $ns->notifyBlogApproved($author['email'], $blog['title'], $postUrl);
        }

        // Trigger immediate queuing for member notifications
        try {
            require_once 'services/MailService.php';
            MailService::getInstance()->queuePendingBlogNotifications();
        } catch (Exception $e) {
            error_log("Error in instant queuing: " . $e->getMessage());
        }

        echo json_encode(['status' => 'success', 'message' => 'Blog approved and published']);
    } elseif ($action === 'save_as_draft') {
        $feedback = trim($input['rejection_reason'] ?? ''); // Use same field for feedback

        $stmt = $pdo->prepare(
            "UPDATE blogs SET submission_status = 'draft', status = 'draft', rejection_feedback = ? WHERE id = ?"
        );
        $stmt->execute([$feedback, $id]);

        $audit->log($_SESSION['admin_id'], 'blog_draft', 'blog', $id, "Admin moved back to draft. Feedback: " . $feedback);

        // Notify Author
        $stmtAuthor = $pdo->prepare("
            SELECT c.email 
            FROM contributors c 
            JOIN users u ON c.id = u.contributor_id
            JOIN blogs b ON u.id = b.author_id 
            WHERE b.id = ?
        ");
        $stmtAuthor->execute([$id]);
        $author = $stmtAuthor->fetch();
        if ($author) {
            require_once 'services/NotificationService.php';
            $ns = new NotificationService();
            $ns->notifyBlogMovedToDraft($author['email'], $blog['title'], $feedback);
        }

        echo json_encode(['status' => 'success', 'message' => 'Blog moved to draft and author notified.']);
    } else {
        // Handle Reject
        $rejection_reason = trim($input['rejection_reason'] ?? '');
        if (empty($rejection_reason)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Rejection reason is mandatory']);
            exit;
        }

        if ($blog['submission_status'] === 'edited') {
            // If they reject an edit, we move the whole blog to rejected so they can fix the rejected edit
            $stmt = $pdo->prepare(
                "UPDATE blogs SET submission_status = 'rejected', rejection_feedback = ? WHERE id = ?"
            );
            $stmt->execute([$rejection_reason, $id]);
            echo json_encode(['status' => 'success', 'message' => 'Blog edit rejected. Contributor can now fix and resubmit.']);
        } else {
            $stmt = $pdo->prepare(
                "UPDATE blogs SET submission_status = 'rejected', status = 'rejected', rejection_feedback = ? WHERE id = ?"
            );
            $stmt->execute([$rejection_reason, $id]);
            echo json_encode(['status' => 'success', 'message' => 'Blog rejected.']);
        }

        // Notify Author
        $stmtAuthor = $pdo->prepare("
            SELECT c.email 
            FROM contributors c 
            JOIN users u ON c.id = u.contributor_id
            JOIN blogs b ON u.id = b.author_id 
            WHERE b.id = ?
        ");
        $stmtAuthor->execute([$id]);
        $author = $stmtAuthor->fetch();
        if ($author) {
            require_once 'services/NotificationService.php';
            $ns = new NotificationService();
            $ns->notifyBlogRejected($author['email'], $blog['title'], $rejection_reason);
        }

        $audit->log($_SESSION['admin_id'], 'blog_reject', 'blog', $id, "Reason: " . $rejection_reason);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error: ' . $e->getMessage()]);
}
?>