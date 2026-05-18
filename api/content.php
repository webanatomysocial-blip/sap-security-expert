<?php
/**
 * api/content.php — Public Content API for AI Crawlers & Bots
 *
 * Usage:
 *   /api/content.php?slug=your-article-slug
 *   /api/content.php?slug=your-article-slug&format=json   (returns JSON)
 *   /api/content.php?slug=your-article-slug&format=html   (returns clean HTML, default)
 *
 * Returns the full, server-rendered content for a blog post without any
 * JavaScript dependency. This endpoint is designed for AI tools and crawlers.
 */
require_once __DIR__ . '/db.php';

// No caching — always serve fresh content
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$slug = trim($_GET['slug'] ?? '');
$format = strtolower(trim($_GET['format'] ?? 'html'));

if (empty($slug)) {
    http_response_code(400);
    if ($format === 'json') {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Missing required parameter: slug']);
    } else {
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Error: Missing required parameter: slug';
    }
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT
            title, meta_title, meta_description, meta_keywords,
            content, excerpt, author, date, slug, category, image,
            faqs, is_members_only, created_at, updated_at
        FROM blogs
        WHERE slug = ? AND status IN ('approved', 'published')
        LIMIT 1
    ");
    $stmt->execute([$slug]);
    $blog = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    http_response_code(500);
    if ($format === 'json') {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Database error', 'message' => $e->getMessage()]);
    } else {
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Error: Failed to query database.';
    }
    exit;
}

if (!$blog) {
    http_response_code(404);
    if ($format === 'json') {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Article not found', 'slug' => $slug]);
    } else {
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Error: Article not found for slug: ' . htmlspecialchars($slug);
    }
    exit;
}

// --- Members-only gate ---
if (!empty($blog['is_members_only']) && (int)$blog['is_members_only'] === 1) {
    http_response_code(403);
    if ($format === 'json') {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'error' => 'Members only',
            'message' => 'This article requires a membership to read.',
            'title' => $blog['meta_title'] ?: $blog['title'],
            'excerpt' => $blog['excerpt'] ?? '',
        ]);
    } else {
        header('Content-Type: text/plain; charset=utf-8');
        echo "This article is for members only.\n\nTitle: " . ($blog['meta_title'] ?: $blog['title']) . "\n\nExcerpt: " . ($blog['excerpt'] ?? '');
    }
    exit;
}

$title       = $blog['meta_title'] ?: $blog['title'];
$description = $blog['meta_description'] ?: ($blog['excerpt'] ?? '');
$content     = $blog['content'] ?? '';
$author      = $blog['author'] ?? 'SAP Security Expert';
$date        = $blog['date'] ?? ($blog['created_at'] ?? '');
$category    = $blog['category'] ?? '';
$keywords    = $blog['meta_keywords'] ?? '';

// --- JSON Output ---
if ($format === 'json') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'slug'        => $slug,
        'title'       => $title,
        'description' => $description,
        'author'      => $author,
        'date'        => $date,
        'category'    => $category,
        'keywords'    => $keywords,
        'content'     => $content,
        'faqs'        => json_decode($blog['faqs'] ?? '[]', true),
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// --- HTML Output (default) ---
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, follow">
    <title><?= htmlspecialchars($title) ?> | SAP Security Expert</title>
    <style>
        body { font-family: Georgia, serif; line-height: 1.7; max-width: 820px; margin: 40px auto; padding: 0 20px; color: #222; }
        h1 { font-size: 2em; margin-bottom: 8px; }
        .meta { color: #666; font-size: 0.9em; margin-bottom: 24px; }
        .meta span { margin-right: 16px; }
        .content img { max-width: 100%; height: auto; }
        .content h2 { margin-top: 2em; }
        .content pre { background: #f4f4f4; padding: 16px; overflow-x: auto; border-radius: 4px; }
        .content code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
        hr { border: none; border-top: 1px solid #ddd; margin: 32px 0; }
        .footer-note { color: #888; font-size: 0.85em; }
    </style>
</head>
<body>
    <header>
        <p><a href="https://sapsecurityexpert.com">← SAP Security Expert</a></p>
    </header>

    <article>
        <h1><?= htmlspecialchars($title) ?></h1>
        <div class="meta">
            <?php if ($author): ?><span><strong>By:</strong> <?= htmlspecialchars($author) ?></span><?php endif; ?>
            <?php if ($date): ?><span><strong>Published:</strong> <?= htmlspecialchars(date('F j, Y', strtotime($date))) ?></span><?php endif; ?>
            <?php if ($category): ?><span><strong>Category:</strong> <?= htmlspecialchars($category) ?></span><?php endif; ?>
        </div>

        <?php if (!empty($description)): ?>
        <p><em><?= htmlspecialchars($description) ?></em></p>
        <hr>
        <?php endif; ?>

        <div class="content">
            <?= $content ?>
        </div>

        <?php
        $faqs = json_decode($blog['faqs'] ?? '[]', true);
        if (is_array($faqs) && count($faqs) > 0):
        ?>
        <hr>
        <section class="faqs">
            <h2>Frequently Asked Questions</h2>
            <?php foreach ($faqs as $faq): ?>
            <h3><?= htmlspecialchars($faq['question'] ?? '') ?></h3>
            <p><?= htmlspecialchars($faq['answer'] ?? '') ?></p>
            <?php endforeach; ?>
        </section>
        <?php endif; ?>
    </article>

    <hr>
    <p class="footer-note">
        This is a static content view for accessibility and AI reading tools.
        <a href="https://sapsecurityexpert.com/<?= htmlspecialchars($category) ?>/<?= htmlspecialchars($slug) ?>">View the full interactive article</a> on SAP Security Expert.
    </p>
</body>
</html>
