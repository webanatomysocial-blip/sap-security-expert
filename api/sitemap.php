<?php
/**
 * api/sitemap.php - Dynamic XML Sitemap Generator
 */
require_once 'db.php';

header("Content-Type: application/xml; charset=utf-8");

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
$host = $_SERVER['HTTP_HOST'] ?? 'sapsecurityexpert.com';
$domain = getenv('SITE_URL') ?: ($protocol . $host);

echo '<?xml version="1.0" encoding="UTF-8"?>';
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

// 1. Static Pages
$staticPages = [
    '',
    '/blogs',
    '/sap-security',
    '/sap-s4hana-security',
    '/sap-fiori-security',
    '/sap-btp-security',
    '/sap-public-cloud',
    '/sap-sac-security',
    '/sap-cis',
    '/sap-successfactors-security',
    '/sap-access-control',
    '/sap-process-control',
    '/sap-iag',
    '/sap-grc',
    '/sap-cybersecurity',

    '/product-reviews',
    '/podcasts',
    '/videos',
    '/expert-recommendations',
    '/contact-us',
    '/privacy-policy',
    '/terms-conditions'
];

foreach ($staticPages as $page) {
    echo '<url>';
    echo '<loc>' . $domain . $page . '</loc>';
    echo '<changefreq>weekly</changefreq>';
    echo '<priority>0.8</priority>';
    echo '</url>';
}

try {
    // 2. Dynamic Blogs (Approved & Published)
    $stmt = $pdo->prepare("SELECT slug, category, created_at FROM blogs WHERE status IN ('approved', 'published') AND date <= ?");
    $stmt->execute([date('Y-m-d H:i:s')]);
    $blogs = $stmt->fetchAll();

    foreach ($blogs as $blog) {
        echo '<url>';
        echo '<loc>' . $domain . '/' . $blog['category'] . '/' . $blog['slug'] . '</loc>';
        echo '<lastmod>' . date('Y-m-d', strtotime($blog['created_at'])) . '</lastmod>';
        echo '<changefreq>monthly</changefreq>';
        echo '<priority>0.7</priority>';
        echo '</url>';
    }

    // 3. Announcements
    $stmt = $pdo->prepare("SELECT id, date FROM announcements WHERE status IN ('approved', 'active', 'published') AND date <= ?");
    $stmt->execute([date('Y-m-d H:i:s')]);
    $anns = $stmt->fetchAll();

    foreach ($anns as $ann) {
        echo '<url>';
        echo '<loc>' . $domain . '/announcements#' . $ann['id'] . '</loc>';
        echo '<lastmod>' . date('Y-m-d', strtotime($ann['date'])) . '</lastmod>';
        echo '<changefreq>monthly</changefreq>';
        echo '<priority>0.5</priority>';
        echo '</url>';
    }

} catch (Exception $e) {
    // Fail silently in XML or add error comment
    echo '<!-- Error: ' . htmlspecialchars($e->getMessage()) . ' -->';
}

echo '</urlset>';
?>