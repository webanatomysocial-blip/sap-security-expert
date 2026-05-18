<?php
// Function to ensure absolute URL
if (!function_exists('getAbsoluteUrl')) {
    function getAbsoluteUrl($path, $baseUrl)
    {
        if (strpos($path, 'http') === 0)
            return $path;
        return rtrim($baseUrl, '/') . '/' . ltrim($path, '/');
    }
}

if (!function_exists('getOptimizedOgImage')) {
    function getOptimizedOgImage($url)
    {
        return $url;
    }
}

$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
$host = $_SERVER['HTTP_HOST'] ?? 'sapsecurityexpert.com';
$baseUrl = $protocol . $host;

// ============================================================
// PLAINTEXT / AI CRAWLER MODE
// When ?plaintext=1 is appended to any article URL, bypass the
// React SPA entirely and serve a clean, server-rendered HTML page.
// Example: /sap-grc/my-article-slug?plaintext=1
// This is the preferred URL for AI tools to read full content.
// ============================================================
if (isset($_GET['plaintext']) && $_GET['plaintext'] === '1') {
    // Extract slug from path: /category/slug or /blogs/slug
    $segments = explode('/', trim($path, '/'));
    $slug = '';
    if (count($segments) >= 2) {
        $slug = end($segments); // last segment is always the slug
    } elseif (count($segments) === 1 && !empty($segments[0])) {
        $slug = $segments[0];
    }
    if (!empty($slug)) {
        // Redirect to the dedicated content API endpoint
        $format = isset($_GET['format']) ? '&format=' . urlencode($_GET['format']) : '';
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Location: ' . $baseUrl . '/api/content.php?slug=' . urlencode($slug) . $format);
        exit;
    }
}


// If we are on localhost, og:image might not load in preview tools unless we use a public tunnel or production fallback.
// However, for pure SEO correctness, we should use the current host.

$defaultTitle = "SAP Security Expert";
$defaultDesc = "The leading community for SAP Security, GRC, and BTP professionals. Get the latest insights, tutorials, and best practices.";
$defaultKeywords = "SAP Security, SAP GRC, SAP BTP, SAP Cybersecurity, SAP IAG, SAP Public Cloud";

$defaultAbsImage = getAbsoluteUrl("/assets/sapsecurityexpert-black.png", $baseUrl);
$defaultImage = $defaultAbsImage;
$defaultUrl = $baseUrl . "/";

$title = $defaultTitle;
$description = $defaultDesc;
$keywords = $defaultKeywords;
$image = $defaultImage;
$url = $defaultUrl;
$type = "website";

// 1. Static Pages Definition (Whitelist & Meta Data)
$staticPages = [
    '/' => [
        'title' => 'Community for SAP Security & GRC Pros | SAP Security Expert',
        'description' => 'SAP Security Expert is the leading community for SAP Security, GRC, and BTP professionals to learn, share knowledge, collaborate, and grow in their careers.',
        'keywords' => 'SAP Security, SAP GRC, SAP BTP, SAP Cybersecurity, SAP Community',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    '/blogs' => [
        'title' => 'Blogs | SAP Security Expert',
        'description' => 'Read our latest blogs on SAP Security, GRC, and BTP.',
        'keywords' => 'SAP Blogs, SAP Security Tutorials, SAP GRC Articles, SAP BTP Guides',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    '/about' => [
        'title' => 'About Us | SAP Security Expert',
        'description' => 'Learn more about SAP Security Expert, our mission, and our team.',
        'keywords' => 'About SAP Security Expert, SAP Security History, Mission Statement',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    '/contact' => [
        'title' => 'Contact Us | SAP Security Expert',
        'description' => 'Get in touch with SAP Security Expert. We are here to help.',
        'keywords' => 'Contact SAP Security Expert, SAP Security Support, SAP Consulting',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    '/podcasts' => [
        'title' => 'SAP Security Podcasts & Expert Insights | sapsecurityExpert',
        'description' => 'Listen to SAP security podcasts on SAPSecurityExpert for expert insights, industry trends, and strategies to help professionals secure systems and stay informed.',
        'keywords' => 'SAP Security Podcast, CyberKriya, SAP Cybersecurity Audio',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    '/product-reviews' => [
        'title' => 'Product Reviews | SAP Security Expert',
        'description' => 'Unbiased reviews of the latest SAP Security and GRC tools.',
        'keywords' => 'SAP Tool Reviews, GRC Software Reviews, SAP Security Products',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    '/expert-recommendations' => [
        'title' => 'SAP Security Expert Recommendations & Resources | sapsecurityExpert',
        'description' => 'SAP security expert recommendations and resources on SAPSecurityExpert to improve protection, simplify workflows, and support stronger risk management across your SAP environment.',
        'keywords' => 'SAP Utilities, SAP Security Scripts, Admin Tools, Expert Recommendations',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    '/contact-us' => [
        'title' => 'Contact SAPSecurityExpert | Connect With SAP Security Experts',
        'description' => 'Contact SAPSecurityExpert for enquiries, partnerships, or support. Connect with SAP security professionals and get the assistance you need for your queries.',
        'keywords' => 'Contact SAP Security Expert, SAP Security Support, SAP Consulting',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    '/admin' => [
        'title' => 'Admin Dashboard | SAP Security Expert',
        'description' => 'Administrative dashboard for SAP Security Expert.',
        'image' => "/assets/sapsecurityexpert-black.png",
    ],
    '/member/login' => [
        'title' => 'Member Login | SAP Security Expert',
        'description' => 'Sign in to access exclusive SAP security content.',
        'image' => "/assets/sapsecurityexpert-black.png",
    ],
    '/member/signup' => [
        'title' => 'Become a Member | SAP Security Expert',
        'description' => 'Join our community of SAP security professionals.',
        'image' => "/assets/sapsecurityexpert-black.png",
    ],
    // Whitelist entries for sub-admin paths (auto-serve index.html)
    '/admin/blogs' => ['title' => 'Manage Blogs | Admin'],
    '/admin/contributors' => ['title' => 'Manage Contributors | Admin'],
    '/admin/announcements' => ['title' => 'Manage Announcements | Admin'],
    '/admin/comments' => ['title' => 'Manage Comments | Admin'],
    '/admin/ads' => ['title' => 'Manage Ads | Admin'],
    '/become-a-contributor' => ['title' => 'Become a Contributor'],
    '/apply-contributor' => ['title' => 'Apply to be a Contributor'],
    '/videos' => ['title' => 'Videos | SAP Security Expert'],
    '/privacy-policy' => ['title' => 'Privacy Policy'],
    '/terms-conditions' => ['title' => 'Terms & Conditions'],
    '/accessibility-statement' => ['title' => 'Accessibility Statement'],
    '/safety-movement' => ['title' => 'Safety Movement'],
    '/security-compliance-overview' => ['title' => 'Security & Compliance'],
    '/responsible-ai-automation-statement' => ['title' => 'Responsible AI Statement']
];

// 3. Categories (Manual Map)
$categories = [
    'sap-btp-security' => [
        'title' => 'SAP BTP Cloud Security Guide for Experts | sapsecurityexpert',
        'description' => 'Explore SAP BTP cloud security with sapsecurityexpert. Learn expert strategies, best practices, and controls to protect data, manage access, and ensure compliance.',
        'keywords' => 'SAP BTP, SAP BTP Security, IAS, IPS, Cloud Security',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    'sap-grc' => [
        'title' => 'SAP GRC Governance Risk Compliance Sec | sapsecurityexpert',
        'description' => 'Strengthen governance, risk, and compliance with SAP GRC and sapsecurityexpert. Improve controls, manage risks, support audits, and protect critical systems.',
        'keywords' => 'SAP GRC, Access Control, Process Control, GRC 12.0',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    'sap-public-cloud' => [
        'title' => 'SAP Public Cloud Security Guide Insights | sapsecurityexpert',
        'description' => 'Strengthen SAP Public Cloud security with sapsecurityexpert. Learn proven best practices, access controls, and strategies to protect data and ensure compliance.',
        'keywords' => 'SAP Public Cloud, S/4HANA Cloud, Cloud Identity',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    'sap-cybersecurity' => [
        'title' => 'SAP Cybersecurity Resources & Insights | SAPSecurityExpert',
        'description' => 'Access SAP cybersecurity resources and expert insights from SAPSecurityExpert to protect systems, manage risks, and stay ahead of threats with stronger security.',
        'keywords' => 'SAP Cybersecurity, Threat Detection, Enterprise Security',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],

    'sap-iag' => [
        'title' => 'SAP IAG Identity Access Governance | sapsecurityexpert',
        'description' => 'Secure identity access with SAP IAG and sapsecurityexpert. Control permissions, improve compliance, minimize risk, and safeguard critical business applications.',
        'keywords' => 'SAP IAG, SAP Identity Access Governance',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    'sap-security' => [
        'title' => 'SAP Security Services & Solutions | SAPSecurityExpert',
        'description' => 'Get expert SAP security services and solutions from SAPSecurityExpert to protect your enterprise systems, manage roles, and ensure robust authorizations.',
        'keywords' => 'SAP Security, SAP Roles, SAP Authorizations, SAP Audit',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    'sap-s4hana-security' => [
        'title' => 'SAP S/4HANA Security Best Practices | SAPSecurityExpert',
        'description' => 'Learn SAP S/4HANA security best practices with SAPSecurityExpert. Secure your S/4HANA Finance, Supply Chain, and Cloud environments effectively.',
        'keywords' => 'SAP S/4HANA Security, S/4HANA Cloud Security, Fiori Security',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    'sap-fiori-security' => [
        'title' => 'SAP Fiori Security & UX Protection | SAPSecurityExpert',
        'description' => 'Secure your SAP Fiori apps and UI5 environments. Learn about Fiori catalogs, groups, and OData security with SAPSecurityExpert.',
        'keywords' => 'SAP Fiori Security, SAP UI5 Security, OData Security',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    'sap-sac-security' => [
        'title' => 'SAP Analytics Cloud (SAC) Security | SAPSecurityExpert',
        'description' => 'Expert guidance on SAP Analytics Cloud security. Manage users, teams, and data access in SAC with SAPSecurityExpert.',
        'keywords' => 'SAP SAC Security, SAP Analytics Cloud Permissions',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    'sap-cis' => [
        'title' => 'SAP Cybersecurity Infrastructure (CIS) | SAPSecurityExpert',
        'description' => 'Secure your SAP infrastructure with CIS benchmarks and cybersecurity best practices from SAPSecurityExpert.',
        'keywords' => 'SAP CIS, SAP Infrastructure Security, SAP Hardening',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    'sap-successfactors-security' => [
        'title' => 'SAP SuccessFactors Security & RBP | SAPSecurityExpert',
        'description' => 'Master SAP SuccessFactors Role-Based Permissions (RBP) and data privacy with expert guides from SAPSecurityExpert.',
        'keywords' => 'SAP SuccessFactors Security, SAP RBP, HR Data Privacy',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    'sap-security-other' => [
        'title' => 'Other SAP Security Domains | SAPSecurityExpert',
        'description' => 'Explore various other SAP security domains, including specialized modules and legacy system protection with SAPSecurityExpert.',
        'keywords' => 'SAP Security Modules, Miscellaneous SAP Security',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    'sap-access-control' => [
        'title' => 'SAP GRC Access Control Expert Guide | SAPSecurityExpert',
        'description' => 'Deep-dive into SAP GRC Access Control. Learn about ARA, ARM, EAM, and BRM with SAPSecurityExpert.',
        'keywords' => 'SAP GRC Access Control, ARA, ARM, Emergency Access Management',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
    'sap-process-control' => [
        'title' => 'SAP GRC Process Control & Monitoring | SAPSecurityExpert',
        'description' => 'Automate your internal controls and compliance monitoring with SAP GRC Process Control insights from SAPSecurityExpert.',
        'keywords' => 'SAP GRC Process Control, CCM, Internal Audit',
        "image" => "/assets/sapsecurityexpert-black.png",
    ],
];


// ROUTING LOGIC
$cleanPath = trim($path, '/');
if ($cleanPath === "")
    $cleanPath = "/"; // Handle root
else
    $cleanPath = "/" . $cleanPath; // normalize
$found = false;
$type = "website";
$fullContent = ""; // Initialize for bot crawling

// DYNAMIC BLOG SEO (SAFE ROUTING)
// Matches BOTH /blogs/{slug} AND /{category}/{slug} patterns
require_once __DIR__ . "/api/db.php";

$cleanSlug = '';

// Pattern 1: /blogs/{slug}
if (strpos($cleanPath, '/blogs/') === 0) {
    $cleanSlug = basename($cleanPath);
}

// Pattern 2: /{known-category}/{slug}  e.g. /sap-btp-security/intro-to-sap-btp-security
// Detect a two-segment path that's not a known static page
if (empty($cleanSlug)) {
    $segments = explode('/', trim($cleanPath, '/'));
    if (count($segments) === 2 && !array_key_exists($cleanPath, $staticPages)) {
        $cleanSlug = $segments[1]; // Use the second segment as the slug
    }
}

if ($cleanSlug) {
    try {
        $stmt = $pdo->prepare("
            SELECT title, meta_title, meta_description, meta_keywords, image, slug, excerpt, content, author, date, is_members_only, faqs
            FROM blogs
            WHERE slug = ? AND status IN ('approved', 'published')
            LIMIT 1
        ");

        $stmt->execute([$cleanSlug]);
        $blog = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($blog) {
            // Dynamic SEO Mapping (Strictly from DB)
            $title = !empty($blog['meta_title']) ? $blog['meta_title'] : $blog['title'];

            // Description logic: meta_desc -> excerpt -> fallback title
            $authorName = $blog['author'] ?? "SAP Security Expert";
            $description = !empty($blog['meta_description'])
                ? $blog['meta_description']
                : (!empty($blog['excerpt'])
                    ? $blog['excerpt']
                    : $blog['title'] . " - Written by " . $authorName . ". Read more on SAP Security Expert.");

            $keywords = !empty($blog['meta_keywords']) ? $blog['meta_keywords'] : $defaultKeywords;

            // Dynamic Image
            if (!empty($blog['image'])) {
                $image = getAbsoluteUrl($blog['image'], $baseUrl);
            } else {
                $image = $defaultAbsImage;
            }

            $authorName = $blog['author'] ?? "SAP Security Expert";
            $publishDate = $blog['date'] ?? null;

            $url = getAbsoluteUrl($cleanPath, $baseUrl);
            $type = "article";
            $found = true;

            // Prepare JSON-LD (Schema.org)
            $articleSchema = [
                "@context" => "https://schema.org",
                "@type" => "BlogPosting",
                "headline" => $title,
                "description" => $description,
                "image" => [$image],
                "datePublished" => $publishDate,
                "dateModified" => $publishDate,
                "author" => [
                    "@type" => "Person",
                    "name" => $authorName
                ],
                "publisher" => [
                    "@type" => "Organization",
                    "name" => "SAP Security Expert",
                    "logo" => [
                        "@type" => "ImageObject",
                        "url" => $baseUrl . "/assets/sapsecurityexpert-black.png"
                    ]
                ],
                "mainEntityOfPage" => [
                    "@type" => "WebPage",
                    "@id" => $url
                ]
            ];

            $schemas = [$articleSchema];

            // Add FAQ Schema if exists
            if (!empty($blog['faqs'])) {
                $faqsArr = json_decode($blog['faqs'], true);
                if (is_array($faqsArr) && count($faqsArr) > 0) {
                    $schemas[] = [
                        "@context" => "https://schema.org",
                        "@type" => "FAQPage",
                        "mainEntity" => array_map(function ($f) {
                            return [
                                "@type" => "Question",
                                "name" => $f['question'] ?? '',
                                "acceptedAnswer" => [
                                    "@type" => "Answer",
                                    "text" => $f['answer'] ?? ''
                                ]
                            ];
                        }, $faqsArr)
                    ];
                }
            }

            $jsonLd = "\n    <script type=\"application/ld+json\">" . json_encode($schemas, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "</script>\n";

            // Store full content for bot crawling
            $fullContent = $blog['content'] ?? '';
        }
    } catch (Exception $e) {
        // Silently fail to default
    }
}

// Check Static Pages First (Exact Match)
if (array_key_exists($cleanPath, $staticPages)) {
    $title = $staticPages[$cleanPath]['title'] ?? $defaultTitle;
    $description = $staticPages[$cleanPath]['description'] ?? $defaultDesc;
    if (isset($staticPages[$cleanPath]['keywords'])) {
        $keywords = $staticPages[$cleanPath]['keywords'];
    }
    if (!empty($staticPages[$cleanPath]['image'])) {
        $image = getAbsoluteUrl($staticPages[$cleanPath]['image'], $baseUrl);
    }
    $url = getAbsoluteUrl($cleanPath, $baseUrl);
    $found = true;
}
// Check Category Pages (Exact Match on slug)
else if (array_key_exists(ltrim($cleanPath, '/'), $categories)) {
    $catKey = ltrim($cleanPath, '/');
    $title = $categories[$catKey]['title'];
    $description = $categories[$catKey]['description'];
    $keywords = $categories[$catKey]['keywords'];
    if (!empty($categories[$catKey]['image'])) {
        $image = getAbsoluteUrl($categories[$catKey]['image'], $baseUrl);
    }
    $url = getAbsoluteUrl($cleanPath, $baseUrl);
    $found = true;
}


// Read index.html (Prefer dist/index.html if build exists)
if (file_exists('dist/index.html')) {
    $html = file_get_contents('dist/index.html');
} elseif (file_exists('index.html')) {
    $html = file_get_contents('index.html');
} else {
    // Fallback creates a basic HTML shell if index.html is missing
    $html = "<!DOCTYPE html><html><head></head><body><h1>Maintenance Mode</h1></body></html>";
}

// FIX: Ensure Base Tag for Relative Assets
// If the design is broken on sub-pages, it's usually because assets like "./index.css" 
// are being loaded from "/sap-btp-security/index.css" instead of "/index.css".
if (strpos($html, '<base') === false) {
    $html = str_replace('<head>', '<head><base href="/">', $html);
}

// CLEANUP existing tags to prevent duplicates (Robust Regex for Multi-line)
$html = preg_replace('/<title>.*?<\/title>/is', '', $html);
$html = preg_replace('/<meta\s+[^>]*property=["\']og:[^"\']+["\'][^>]*\/?>/is', '', $html);
$html = preg_replace('/<meta\s+[^>]*name=["\']og:[^"\']+["\'][^>]*\/?>/is', '', $html);
$html = preg_replace('/<meta\s+[^>]*name=["\']description["\'][^>]*\/?>/is', '', $html);
$html = preg_replace('/<meta\s+[^>]*name=["\']Description["\'][^>]*\/?>/is', '', $html);
$html = preg_replace('/<meta\s+[^>]*name=["\']twitter:[^"\']+["\'][^>]*\/?>/is', '', $html);
$html = preg_replace('/<meta\s+[^>]*name=["\']keywords["\'][^>]*\/?>/is', '', $html);
$html = preg_replace('/<meta\s+[^>]*name=["\']author["\'][^>]*\/?>/is', '', $html);
$html = preg_replace('/<meta\s+[^>]*name=["\']robots["\'][^>]*\/?>/is', '', $html);
$html = preg_replace('/<meta\s+[^>]*name=["\']googlebot["\'][^>]*\/?>/is', '', $html);

// Prepare New Tags
$headEnd = '</head>';

// Determine Image MIME Type
$ext = strtolower(pathinfo($image, PATHINFO_EXTENSION));
$mime = 'image/jpeg';
if ($ext === 'png')
    $mime = 'image/png';
elseif ($ext === 'webp')
    $mime = 'image/webp';
elseif ($ext === 'gif')
    $mime = 'image/gif';

$ogTags = "
    <!-- Dynamic SEO Tags via index.php (Refined) -->
    <title>" . htmlspecialchars($title) . "</title>
    <meta name=\"description\" content=\"" . htmlspecialchars($description) . "\">
    <meta name=\"keywords\" content=\"" . htmlspecialchars($keywords) . "\">
    <meta name=\"author\" content=\"" . htmlspecialchars($authorName ?? "SAP Security Expert") . "\">
    <meta name=\"robots\" content=\"index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1\">
    <link rel=\"canonical\" href=\"" . htmlspecialchars($url) . "\">
    <link rel=\"sitemap\" type=\"application/xml\" title=\"Sitemap\" href=\"" . htmlspecialchars($baseUrl) . "/sitemap.xml\">

    <meta property=\"og:title\" content=\"" . htmlspecialchars($title) . "\">
    <meta property=\"og:description\" content=\"" . htmlspecialchars($description) . "\">
    <meta property=\"og:image\" content=\"" . htmlspecialchars($image) . "\">
    <meta property=\"og:url\" content=\"" . htmlspecialchars($url) . "\">
    <meta property=\"og:type\" content=\"" . htmlspecialchars($type) . "\">
    <meta property=\"og:site_name\" content=\"SAP Security Expert\">

    <meta name=\"twitter:card\" content=\"summary_large_image\">
    <meta name=\"twitter:title\" content=\"" . htmlspecialchars($title) . "\">
    <meta name=\"twitter:description\" content=\"" . htmlspecialchars($description) . "\">
    <meta name=\"twitter:image\" content=\"" . htmlspecialchars($image) . "\">
    <meta name=\"google-adsense-account\" content=\"ca-pub-5501267075758433\">
" . ($type === 'article' && !empty($publishDate) ? "    <meta property=\"article:published_time\" content=\"" . htmlspecialchars($publishDate) . "\">\n" : "") . "
" . ($jsonLd ?? "") . "
";

// Inject before </head>
$debugInfo = "<!-- SEO Debug: URL=" . htmlspecialchars($url) . " | Found=" . ($found ? "YES" : "NO") . " | Cat=" . (isset($catKey) ? $catKey : "N/A") . " -->";
$html = str_replace($headEnd, $ogTags . "\n" . $debugInfo . "\n" . $headEnd, $html);

// 5. Inject Content into #root for Crawlers
// This allows bots (and AI fetch tools) to read the content without executing JS.
// React will replace this content once it hydrates.
$injectedContent = "
    <article style=\"padding: 20px; max-width: 800px; margin: 0 auto; font-family: sans-serif;\">
        <h1>" . htmlspecialchars($title) . "</h1>
        " . (!empty($fullContent) ? "<div class=\"article-body\">" . $fullContent . "</div>" : "<p>" . htmlspecialchars($description) . "</p>") . "
        <hr>
        <p><em>You are viewing the static version of this page. For the full interactive experience, please enable JavaScript.</em></p>
        <p>Explore more at <a href=\"" . htmlspecialchars($baseUrl) . "\">SAP Security Expert</a>.</p>
    </article>
";

if (strpos($html, '<div id="root"></div>') !== false) {
    $html = str_replace('<div id="root"></div>', '<div id="root">' . $injectedContent . '</div>', $html);
} elseif (preg_match('/(<div\s+id=["\']root["\'][^>]*>)/i', $html, $matches)) {
    // Fallback for different quote types or attributes
    $html = preg_replace('/(<div\s+id=["\']root["\'][^>]*>)/i', '$1' . $injectedContent, $html);
}

echo $html;
?>