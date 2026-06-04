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

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)) ? "https://" : "http://";
$host = $_SERVER['HTTP_HOST'] ?? 'sap.kaphi.in';
$baseUrl = $protocol . $host;

// ============================================================
// PLAINTEXT / AI CRAWLER MODE
// ============================================================
if (isset($_GET['plaintext']) && $_GET['plaintext'] === '1') {
    $segments = explode('/', trim($path, '/'));
    $slug = '';
    if (count($segments) >= 2) {
        $slug = end($segments);
    } elseif (count($segments) === 1 && !empty($segments[0])) {
        $slug = $segments[0];
    }
    if (!empty($slug)) {
        $format = isset($_GET['format']) ? '&format=' . urlencode($_GET['format']) : '';
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Location: ' . $baseUrl . '/api/content.php?slug=' . urlencode($slug) . $format);
        exit;
    }
}

$defaultTitle = "SAP Security, GRC & Cybersecurity Community - Tutorials & Best Practices | SAP Security Expert";
$defaultDesc = "SAP Security Expert is the leading community for SAP Security, GRC, and BTP professionals to learn, share knowledge, collaborate, and grow in their careers.";
$defaultAbsImage = getAbsoluteUrl("/assets/sapsecurityexpert-black.png", $baseUrl);
$defaultImage = $defaultAbsImage;
$defaultUrl = $baseUrl . "/";

$title = $defaultTitle;
$description = $defaultDesc;
$image = $defaultImage;
$url = $defaultUrl;
$type = "website";

// 1. Static Pages Definition
$staticPages = [
    '/' => [
        'title' => 'SAP Security, GRC & Cybersecurity Community - Tutorials & Best Practices | SAP Security Expert',
        'description' => 'SAP Security Expert is the leading community for SAP Security, GRC, and BTP professionals to learn, share knowledge, collaborate, and grow in their careers.',
        'image' => '/assets/sapsecurityexpert-black.png',
    ],
    '/blogs' => [
        'title' => 'Blogs & Tutorials | SAP Security Expert',
        'description' => 'Read our latest blogs, tutorials, and step-by-step guides on SAP Security, GRC, and cloud compliance.',
        'image' => '/assets/sapsecurityexpert-black.png',
    ],
    '/about' => [
        'title' => 'About Us | SAP Security Expert',
        'description' => 'Learn more about SAP Security Expert, our mission, and our team of enterprise security specialists.',
        'image' => '/assets/sapsecurityexpert-black.png',
    ],
    '/contact' => [
        'title' => 'Contact Us | SAP Security Expert',
        'description' => 'Get in touch with SAP Security Expert. We are here to help with your SAP security and risk queries.',
        'image' => '/assets/sapsecurityexpert-black.png',
    ],
    '/podcasts' => [
        'title' => 'SAP Security Podcasts & Expert Insights | SAP Security Expert',
        'description' => 'Listen to SAP security podcasts for expert insights, industry trends, and strategies to help professionals secure systems.',
        'image' => '/assets/sapsecurityexpert-black.png',
    ],
    '/product-reviews' => [
        'title' => 'Product Reviews | SAP Security Expert',
        'description' => 'Unbiased reviews of the latest SAP Security and GRC compliance tools and automation platforms.',
        'image' => '/assets/sapsecurityexpert-black.png',
    ],
    '/expert-recommendations' => [
        'title' => 'SAP Security Recommendations & Resources | SAP Security Expert',
        'description' => 'SAP security expert recommendations, utilities, and resources to improve protection and simplify GRC workflows.',
        'image' => '/assets/sapsecurityexpert-black.png',
    ],
    '/contact-us' => [
        'title' => 'Contact SAP Security Expert | Connect With SAP Security Experts',
        'description' => 'Contact SAP Security Expert for enquiries, partnerships, or support. Connect with SAP security professionals today.',
        'image' => '/assets/sapsecurityexpert-black.png',
    ],
    '/authors/raghu-boddu' => [
        'title' => 'Raghu Boddu - SAP Security & GRC Expert Author | SAP Security Expert',
        'description' => 'Read expert insights, tutorials, and research articles from Raghu Boddu, founder of SAP Security Expert and author of authoritative SAP GRC books.',
        'image' => '/assets/raghu_boddu.png',
    ]
];

// 3. Categories (Manual Map)
$categories = [
    'sap-btp-security' => [
        'title' => 'SAP BTP Cloud Security Guide for Experts | SAP Security Expert',
        'description' => 'Master SAP BTP cloud security. Learn expert strategies, access controls, and security practices to protect business-critical cloud systems and data.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'SAP Business Technology Platform (BTP) is the cornerstone of modern SAP enterprise architectures, serving as the integration and extension suite for cloud and hybrid landscapes. As organizations transition to the cloud, securing SAP BTP becomes paramount. Securing this environment requires a comprehensive understanding of Cloud Identity Services, specifically the Identity Authentication Service (IAS) and Identity Provisioning Service (IPS), which manage federated single sign-on (SSO), user authentication, and lifecycle management. A robust BTP security strategy demands the implementation of strict Role Collections, precise API security controls, security monitoring, and regular auditing. By leveraging platform-native security tools and establishing strong governance policies, companies can protect sensitive business data, isolate extension applications, and ensure continuous compliance. Discover deep-dives, best practices, and expert tutorials on configuring, auditing, and hardening your SAP BTP architecture to safeguard your cloud journey.'
    ],
    'sap-grc' => [
        'title' => 'SAP GRC Governance Risk Compliance Sec | SAP Security Expert',
        'description' => 'Strengthen your risk management. Discover SAP GRC best practices, compliance frameworks, and internal controls to protect your enterprise systems.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'SAP GRC is the industry-standard enterprise suite designed to manage business risks, ensure regulatory compliance, and automate control monitoring across complex SAP environments. At the core of GRC is the management of Segregation of Duties (SoD) risks and sensitive transaction access, which prevents internal fraud and operational errors. Organizations deploy GRC Access Control to automate the entire identity lifecycle, configure emergency access management (Firefighter), and manage security roles efficiently. Implementing GRC process controls allows companies to automate continuous control monitoring (CCM) across finance, procurement, and operations, reducing audit cycles and improving control effectiveness. Here, you will find comprehensive guides on ARA ruleset optimization, ARM workflows, EAM firefighter logs, and continuous compliance strategies. Learn how to transform SAP GRC from a pure compliance check into an active, value-driving cybersecurity asset for your enterprise.'
    ],
    'sap-public-cloud' => [
        'title' => 'SAP Public Cloud Security Guide Insights | SAP Security Expert',
        'description' => 'Secure your S/4HANA Cloud systems. Read proven best practices, IAM configurations, and cloud security strategies to protect your critical business assets.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'SAP Public Cloud, specifically S/4HANA Cloud Public Edition, represents a paradigm shift where SAP manages the underlying infrastructure and software lifecycle, and customers secure their business data, user access, and configurations. Unlike on-premises systems, Public Cloud security relies heavily on the SAP Cloud Identity Services (IAS/IPS) for secure authentication and user provisioning. Establishing robust security in the public cloud demands a strong understanding of Identity and Access Management (IAM), role collection mappings, and business catalog permissions. Security administrators must focus on configuring secure integration scenarios, managing communication arrangements, and maintaining strict data isolation protocols. This guide provides expert insights, S/4HANA Cloud security blueprints, and step-by-step guides for auditing, configuring, and operating a fully secure SAP Public Cloud tenant while adhering to compliance standards.'
    ],
    'sap-cybersecurity' => [
        'title' => 'SAP Cybersecurity Resources & Insights | SAP Security Expert',
        'description' => 'Protect enterprise environments from emerging threats. Read advanced SAP cybersecurity insights, threat intelligence, and hardening best practices today.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'Modern enterprise landscapes face sophisticated, targeted cyber threats aimed at stealing intellectual property, financial data, and disrupting business continuity. SAP systems, containing the core ERP data of global organizations, are primary targets. Comprehensive SAP cybersecurity goes beyond role-based access to encompass infrastructure hardening, secure network protocols, threat detection, and continuous vulnerability management. Protecting SAP requires auditing database layers, operating systems, custom ABAP code (safeguarding against injections and authority bypasses), and securing external APIs. By implementing advanced threat monitoring, integrating SAP with corporate SIEM/SOAR platforms, and conducting regular security assessments, security teams can proactively detect and respond to anomalies before they manifest. Read our expert cybersecurity resources, hardening checklists, and vulnerability research to protect your most valuable enterprise assets.'
    ],
    'sap-iag' => [
        'title' => 'SAP IAG Identity Access Governance | SAP Security Expert',
        'description' => 'Simplify identity governance. Read expert guides on SAP Identity Access Governance (IAG), cloud integrations, and SoD compliance solutions.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'SAP Identity Access Governance (IAG) is a cloud-native SaaS solution built on the SAP Business Technology Platform designed to govern identity and access across hybrid enterprise environments. It serves as a modern cloud companion or successor to SAP GRC Access Control. SAP IAG provides intelligent access analysis, segregation of duties (SoD) checks, role design utilities, and automated access request provisioning for both cloud systems (like SuccessFactors, S/4HANA Cloud, BTP) and on-premises systems. Leveraging machine learning and predictive analytics, IAG automates risk analysis and streamlines compliance workflows, helping security administrators secure user access with minimal manual overhead. Explore our practical tutorials, integration blueprints, and deployment best practices for setting up, configuring, and maximizing the value of SAP IAG in your hybrid enterprise identity landscape.'
    ],
    'sap-security' => [
        'title' => 'SAP Security Services & Solutions | SAP Security Expert',
        'description' => 'Get comprehensive SAP security guides. Learn role design, authorization concepts, audit strategies, and best practices to protect your SAP environment.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'SAP Security is a multi-dimensional domain focusing on safeguarding corporate data, transactions, and processes within the SAP ecosystem. It serves as the foundation of enterprise trust, ensuring that only authorized users can execute specific business activities. A mature SAP security framework requires a granular understanding of the SAP authorization concept, including role design (single, composite, and derived roles), profile generator (PFCG), and authorization objects. Beyond user security, it demands secure system administration (BC-SEC), encryption of data in transit (SNC, SSL/TLS), and secure configuration of gateway and RFC destinations to prevent unauthorized lateral movement. Our tutorials, expert checklists, and detailed guides cover the fundamentals and advanced techniques of SAP role maintenance, authorization trouble-shooting, and system audits to keep your core business applications safe and compliant.'
    ],
    'sap-s4hana-security' => [
        'title' => 'SAP S/4HANA Security Best Practices | SAP Security Expert',
        'description' => 'Secure your S/4HANA ERP environment. Read our expert guides on migration security, Fiori authorizations, and data protection best practices.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'SAP S/4HANA introduces advanced database architectures (HANA) and a modern web user interface (Fiori), requiring a complete modernization of traditional ERP security strategies. Securing S/4HANA requires managing database-level security, configuring Hana user permissions, securing core ABAP application layers, and designing dynamic front-end access models. Traditional SAP role designs must adapt to map S/4HANA business catalogs, spaces, and pages to backend authorizations. Additionally, securing S/4HANA in the cloud (Private/Public) introduces new integration boundaries, secure API management, and continuous updates. Dive into our comprehensive guides on S/4HANA security configurations, role migration strategies, HANA DB security hardening, and secure ERP operations to ensure your digital transformation remains secure and resilient.'
    ],
    'sap-fiori-security' => [
        'title' => 'SAP Fiori Security & UX Protection | SAP Security Expert',
        'description' => 'Master SAP Fiori & UI5 security. Learn catalog design, OData service protection, and secure role provisioning to safeguard user experiences.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'SAP Fiori is the modern user experience (UX) gateway for SAP applications, replacing traditional SAP GUI screens with responsive, web-based apps. Securing SAP Fiori environments is critical, as it serves as the user-facing entry point to sensitive ERP transactions. A secure Fiori architecture requires tight integration between front-end Fiori launchpad configurations and back-end ERP authorizations. Security administrators must manage Fiori Catalogs, Groups, Spaces, and Pages, while ensuring OData services are securely activated and constrained to prevent unauthorized data access. Implementing secure HTTP headers, configuring Web Dispatcher security, and enabling Single Sign-On (SSO) are essential pillars of a complete Fiori security strategy. Read our detailed, step-by-step guides on Fiori catalogs design, OData service authorization, and UI5 application hardening to protect your digital workspace.'
    ],
    'sap-sac-security' => [
        'title' => 'SAP Analytics Cloud (SAC) Security | SAP Security Expert',
        'description' => 'Configure SAP Analytics Cloud security. Learn user management, folder permissions, and data-level access controls for secure enterprise reporting.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'SAP Analytics Cloud (SAC) is a powerful cloud analytics platform that enables business intelligence, enterprise planning, and predictive analytics on sensitive corporate data. Securing SAC requires a robust, granular governance framework that controls user provisioning, folder-level object permissions, and data-level access. Security managers must configure Single Sign-On (SSO) via SAML 2.0 Identity Providers (like SAP IAS, Azure AD, or Okta) and define secure Teams and Roles within the tenant. Crucially, SAC security must align with backend data sources (such as SAP HANA, BW, or S/4HANA) using secure connection configurations (Direct Live Data or Import Data) with row-level data security mappings. Explore our guides on SAC folder permission architecture, dynamic data-level security, user provisioning automation, and secure model governance for trusted enterprise reporting.'
    ],
    'sap-cis' => [
        'title' => 'SAP Cybersecurity Infrastructure (CIS) | SAP Security Expert',
        'description' => 'Harden your SAP infrastructure with expert CIS benchmarks, database security controls, and operating system level hardening configurations.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'Securing the infrastructure of SAP applications is the foundation of enterprise cybersecurity, as weak system-level configurations can bypass even the most robust role-based authorizations. Infrastructure security focuses on hardening the underlying database layers (SAP HANA, Sybase, Oracle), operating systems (SUSE Linux, Red Hat, Windows), and network layers. Leveraging standard Center for Internet Security (CIS) benchmarks and SAP Security Guides, administrators must disable default credentials, restrict powerful system profiles, disable insecure gateway parameters, and secure RFC/ICM communication protocols. Additionally, maintaining secure OS-level file permissions, enabling robust logging (Security Audit Log), and implementing regular patch management are critical to defending against modern exploits. Learn how to configure, audit, and harden your SAP systems from the ground up to prevent system-level breaches.'
    ],
    'sap-successfactors-security' => [
        'title' => 'SAP SuccessFactors Security & RBP | SAP Security Expert',
        'description' => 'Secure HR data with SAP SuccessFactors security. Master Role-Based Permissions (RBP), data privacy policies, and secure integrations today.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'SAP SuccessFactors is a cloud-based human capital management (HCM) system containing highly confidential employee profiles, financial compensation packages, and sensitive personal data. Securing this environment is essential for regulatory compliance (like GDPR, HIPAA, and CCPA) and employee trust. SuccessFactors security is managed through a specialized Role-Based Permissions (RBP) framework that allows precise control over user groups, target populations, and data fields. Additionally, administrators must manage secure user authentication, identity federation via Cloud Identity Services (IAS/IPS), and establish secure API credentials for third-party payroll and talent integrations. Our guides provide detailed walkthroughs on RBP design best practices, employee data privacy configurations, audit reporting, and secure HCM integrations to protect your global workforce.'
    ],
    'sap-security-other' => [
        'title' => 'Other SAP Security Domains | SAP Security Expert',
        'description' => 'Explore specialized SAP security domains. Get deep-dives into legacy system protection, interface security, and custom ABAP code audit guides.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'SAP Security covers a massive landscape of core systems, integration touchpoints, and custom developments. Beyond standardized cloud environments, securing modern enterprise applications means protecting custom ABAP developments from code-level vulnerabilities, managing database user authorizations directly, audit logging, and securing transactional interfaces. Legacy environments also require structured hardening and specialized network-level configurations to mitigate legacy protocol vulnerabilities. Explore advanced topics in ABAP secure coding standards, legacy application defense, secure interfaces (RFC/ALE/IDoc), and custom compliance monitoring guides.'
    ],
    'sap-access-control' => [
        'title' => 'SAP GRC Access Control Expert Guide | SAP Security Expert',
        'description' => 'Master SAP GRC Access Control. Step-by-step tutorials on ARA rulesets, ARM workflow configuration, EAM firefighter logs, and BRM role design.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'SAP GRC Access Control is the key technology framework used by organizations to prevent, detect, and mitigate authorization risks within their enterprise landscapes. Comprising several powerful components—including Access Risk Analysis (ARA), Access Request Management (ARM), Emergency Access Management (EAM), and Business Role Management (BRM)—Access Control forms the baseline of external audits and internal compliance controls. Securing these architectures demands constant maintenance of SoD rulesets, workflow designs that minimize friction, and automated firefighter monitoring to audit dynamic user activities. Master practical configurations, firefighter troubleshooting, ruleset customisation, and audit preparation techniques.'
    ],
    'sap-process-control' => [
        'title' => 'SAP GRC Process Control & Monitoring | SAP Security Expert',
        'description' => 'Automate compliance with SAP GRC Process Control. Learn internal control testing, continuous control monitoring (CCM), and audit-ready practices.',
        'image' => '/assets/sapsecurityexpert-black.png',
        'intro' => 'SAP GRC Process Control enables organizations to transition from expensive, manual control audits to dynamic, continuous compliance monitoring. By automating control design, testing, and assessment workflows, companies gain real-time visibility into operational risks and corporate compliance states. With continuous control monitoring (CCM), business transactions are analyzed programmatically to detect internal policy exceptions, unauthorized transactional changes, and financial compliance overrides. Discover advanced configurations for automatic test scripts, manual control assessments, continuous data collection strategies, and GRC-backed corporate governance standards.'
    ]
];

// ROUTING LOGIC
$cleanPath = trim($path, '/');
if ($cleanPath === "")
    $cleanPath = "/";
else
    $cleanPath = "/" . $cleanPath;

$found = false;
$type = "website";
$fullContent = "";
$injectedContent = "";
$jsonLd = "";

require_once __DIR__ . "/api/db.php";

$cleanSlug = '';

// Pattern 1: /blogs/{slug}
if (strpos($cleanPath, '/blogs/') === 0) {
    $cleanSlug = basename($cleanPath);
}

// Pattern 2: /{known-category}/{slug}
if (empty($cleanSlug)) {
    $segments = explode('/', trim($cleanPath, '/'));
    if (count($segments) === 2 && !array_key_exists($cleanPath, $staticPages)) {
        $cleanSlug = $segments[1];
    }
}

// Fetch all approved/published blogs to build crawlable lists efficiently
$allBlogs = [];
try {
    $stmtBlogs = $pdo->prepare("
        SELECT b.id, b.title, b.slug, b.category, b.subCategory, b.excerpt, b.date, b.image, b.content, b.faqs,
               CASE
                 WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
                 ELSE COALESCE(c.full_name, b.author)
               END AS author_name,
               CASE
                 WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN '/assets/raghu_boddu.png'
                 ELSE COALESCE(c.image, '/assets/placeholder.webp')
               END AS author_image,
               CASE
                 WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Founder & Security Expert at SAP Security Expert. Author of authoritative books on SAP Access Control, SAP Process Control, and SAP Identity Access Governance (IAG).'
                 ELSE COALESCE(c.short_bio, 'Contributor')
               END AS author_bio
        FROM blogs b
        LEFT JOIN users u ON b.author_id = u.id
        LEFT JOIN contributors c ON u.contributor_id = c.id
        WHERE b.status IN ('approved', 'published') AND b.date <= ?
        ORDER BY b.date DESC
    ");
    $stmtBlogs->execute([date('Y-m-d H:i:s')]);
    $allBlogs = $stmtBlogs->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    // Fail silently
}

if ($cleanSlug) {
    // Fetch individual blog details
    $blog = null;
    foreach ($allBlogs as $b) {
        if ($b['slug'] === $cleanSlug) {
            $blog = $b;
            break;
        }
    }

    if ($blog) {
        $title = !empty($blog['meta_title']) ? $blog['meta_title'] : $blog['title'];
        $authorName = $blog['author_name'];
        $description = !empty($blog['meta_description'])
            ? $blog['meta_description']
            : (!empty($blog['excerpt'])
                ? $blog['excerpt']
                : $blog['title'] . " - Written by " . $authorName . ". Read more on SAP Security Expert.");

        if (!empty($blog['image'])) {
            $image = getAbsoluteUrl($blog['image'], $baseUrl);
        } else {
            $image = $defaultAbsImage;
        }

        $publishDate = $blog['date'];
        $url = getAbsoluteUrl($cleanPath, $baseUrl);
        $type = "article";
        $found = true;

        // Structured Schemas (Dynamic)
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
                "name" => $authorName,
                "jobTitle" => "SAP Security Expert",
                "sameAs" => ($authorName === "Raghu Boddu" ? ["https://www.linkedin.com/in/bodduraghu/", "https://raghuboddu.com/"] : [])
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

        // Add Breadcrumb Schema
        $schemas[] = [
            "@context" => "https://schema.org",
            "@type" => "BreadcrumbList",
            "itemListElement" => [
                [
                    "@type" => "ListItem",
                    "position" => 1,
                    "name" => "Home",
                    "item" => $baseUrl
                ],
                [
                    "@type" => "ListItem",
                    "position" => 2,
                    "name" => $blog['category'],
                    "item" => $baseUrl . '/' . $blog['category']
                ],
                [
                    "@type" => "ListItem",
                    "position" => 3,
                    "name" => $title,
                    "item" => $url
                ]
            ]
        ];

        $jsonLd = "\n    <script type=\"application/ld+json\">" . json_encode($schemas, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "</script>\n";

        // Generate related blogs dynamically for links
        $relatedContent = "";
        $relatedCount = 0;
        foreach ($allBlogs as $rBlog) {
            if ($rBlog['slug'] !== $blog['slug'] && $rBlog['category'] === $blog['category'] && $relatedCount < 3) {
                $relatedContent .= "<li><a href=\"/" . $rBlog['category'] . "/" . $rBlog['slug'] . "\">" . htmlspecialchars($rBlog['title']) . "</a></li>";
                $relatedCount++;
            }
        }
        if ($relatedCount > 0) {
            $relatedContent = "<div class=\"related-posts\" style=\"margin-top: 30px;\"><h3>Related Articles</h3><ul>" . $relatedContent . "</ul></div>";
        }

        // SSR Blog content rendering
        $injectedContent = "
            <article style=\"padding: 20px; max-width: 800px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif; line-height: 1.7; color: #1e293b;\">
                <header style=\"margin-bottom: 20px;\">
                    <p style=\"font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; color: #3b82f6; font-weight: bold; margin-bottom: 8px;\">" . htmlspecialchars($blog['category']) . "</p>
                    <h1 style=\"font-size: 2.25rem; font-weight: 800; line-height: 1.2; color: #0f172a; margin: 0 0 10px 0;\">" . htmlspecialchars($title) . "</h1>
                    <div style=\"display: flex; align-items: center; gap: 10px; color: #64748b; font-size: 0.95rem; margin-bottom: 20px;\">
                        <span>By <strong>" . htmlspecialchars($authorName) . "</strong></span>
                        <span>•</span>
                        <span>Published: " . date('F j, Y', strtotime($publishDate)) . "</span>
                    </div>
                </header>
                <div class=\"article-body\" style=\"font-size: 1.1rem;\">" . $blog['content'] . "</div>
                
                <footer style=\"margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;\">
                    <div class=\"author-card\" style=\"display: flex; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 12px; align-items: start;\">
                        <img src=\"" . htmlspecialchars($blog['author_image']) . "\" alt=\"" . htmlspecialchars($authorName) . "\" style=\"width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);\" />
                        <div>
                            <h4 style=\"margin: 0 0 5px 0; font-size: 1.15rem; color: #0f172a;\">" . htmlspecialchars($authorName) . "</h4>
                            <p style=\"margin: 0; font-size: 0.95rem; color: #475569;\">" . htmlspecialchars($blog['author_bio']) . "</p>
                            <p style=\"margin: 10px 0 0 0; font-size: 0.9rem;\"><a href=\"/authors/raghu-boddu\" style=\"color: #2563eb; font-weight: bold; text-decoration: none;\">View Author Profile &rarr;</a></p>
                        </div>
                    </div>
                    " . $relatedContent . "
                </footer>
            </article>
        ";
    }
}

// 2. Homepage SSR fallback (Pillar hub linking)
if (!$found && $cleanPath === "/") {
    $found = true;
    $title = $defaultTitle;
    $description = $defaultDesc;
    
    // Build Homepage Schema
    $schemas = [
        [
            "@context" => "https://schema.org",
            "@type" => "Organization",
            "name" => "SAP Security Expert",
            "url" => $baseUrl,
            "logo" => $baseUrl . "/assets/sapsecurityexpert-black.png",
            "sameAs" => [
                "https://www.linkedin.com/in/bodduraghu/",
                "https://grcwithraghu.substack.com"
            ]
        ],
        [
            "@context" => "https://schema.org",
            "@type" => "Person",
            "name" => "Raghu Boddu",
            "jobTitle" => "Founder & Author",
            "url" => $baseUrl . "/authors/raghu-boddu",
            "sameAs" => [
                "https://www.linkedin.com/in/bodduraghu/",
                "https://raghuboddu.com/"
            ]
        ]
    ];
    $jsonLd = "\n    <script type=\"application/ld+json\">" . json_encode($schemas, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "</script>\n";

    // Build Homepage body
    $recentList = "";
    $count = 0;
    foreach ($allBlogs as $b) {
        if ($count < 10) {
            $recentList .= "
                <div style=\"margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;\">
                    <h3 style=\"margin: 0 0 5px 0;\"><a href=\"/" . $b['category'] . "/" . $b['slug'] . "\" style=\"color: #1e293b; text-decoration: none; font-weight: bold;\">" . htmlspecialchars($b['title']) . "</a></h3>
                    <p style=\"color: #64748b; font-size: 0.9rem; margin: 0 0 8px 0;\">Published in <a href=\"/" . $b['category'] . "\" style=\"color: #3b82f6; text-decoration: none;\">" . htmlspecialchars($b['category']) . "</a> by " . htmlspecialchars($b['author_name']) . "</p>
                    <p style=\"margin: 0; color: #475569; font-size: 0.98rem;\">" . htmlspecialchars($b['excerpt'] ?? '') . "</p>
                </div>
            ";
            $count++;
        }
    }

    $categoryLinks = "";
    foreach ($categories as $slug => $cat) {
        $categoryLinks .= "<a href=\"/$slug\" style=\"display: inline-block; background: #f1f5f9; padding: 10px 18px; margin: 5px; border-radius: 50px; text-decoration: none; color: #334155; font-weight: 500; font-size: 0.92rem;\">" . htmlspecialchars(str_replace(' | SAP Security Expert', '', $cat['title'])) . "</a>";
    }

    $injectedContent = "
        <div style=\"padding: 20px; max-width: 900px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif;\">
            <header style=\"text-align: center; padding: 40px 0;\">
                <h1 style=\"font-size: 2.5rem; font-weight: 800; color: #0f172a;\">" . htmlspecialchars($title) . "</h1>
                <p style=\"font-size: 1.2rem; color: #475569; max-width: 700px; margin: 15px auto 0;\">" . htmlspecialchars($description) . "</p>
                <div style=\"margin-top: 25px;\">" . $categoryLinks . "</div>
            </header>
            
            <main style=\"margin-top: 40px;\">
                <h2 style=\"font-size: 1.75rem; color: #0f172a; margin-bottom: 25px;\">Latest Security Guides & Tutorials</h2>
                <div>" . $recentList . "</div>
            </main>
        </div>
    ";
}

// 3. Category Pillar Pages SSR fallback
if (!$found && array_key_exists(ltrim($path, '/'), $categories)) {
    $catKey = ltrim($path, '/');
    $title = $categories[$catKey]['title'];
    $description = $categories[$catKey]['description'];
    $introText = $categories[$catKey]['intro'];
    $found = true;

    // Breadcrumb + Collection Schema
    $schemas = [
        [
            "@context" => "https://schema.org",
            "@type" => "BreadcrumbList",
            "itemListElement" => [
                [
                    "@type" => "ListItem",
                    "position" => 1,
                    "name" => "Home",
                    "item" => $baseUrl
                ],
                [
                    "@type" => "ListItem",
                    "position" => 2,
                    "name" => $catKey,
                    "item" => $baseUrl . '/' . $catKey
                ]
            ]
        ],
        [
            "@context" => "https://schema.org",
            "@type" => "CollectionPage",
            "name" => $title,
            "description" => $description,
            "url" => $baseUrl . '/' . $catKey
        ]
    ];
    $jsonLd = "\n    <script type=\"application/ld+json\">" . json_encode($schemas, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "</script>\n";

    // Cluster matching blogs (supports hierarchy logic like React CategoryLayout)
    $categoryBlogs = [];
    foreach ($allBlogs as $b) {
        $matches = false;
        if ($catKey === "sap-security") {
            $matches = in_array($b['category'], ["sap-security", "sap-btp-security", "sap-public-cloud", "sap-fiori-security", "sap-s4hana-security"]);
        } elseif ($catKey === "sap-grc") {
            $matches = in_array($b['category'], ["sap-grc", "sap-access-control", "sap-process-control", "sap-iag"]) ||
                       in_array($b['subCategory'], ["sap-grc", "sap-access-control", "sap-process-control", "sap-iag"]);
        } else {
            $matches = ($b['category'] === $catKey || $b['subCategory'] === $catKey);
        }

        if ($matches) {
            $categoryBlogs[] = $b;
        }
    }

    $blogsList = "";
    foreach ($categoryBlogs as $b) {
        $blogsList .= "
            <div style=\"margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;\">
                <h3 style=\"margin: 0 0 5px 0;\"><a href=\"/" . $b['category'] . "/" . $b['slug'] . "\" style=\"color: #1e293b; text-decoration: none; font-weight: bold;\">" . htmlspecialchars($b['title']) . "</a></h3>
                <p style=\"color: #64748b; font-size: 0.88rem; margin: 0 0 8px 0;\">Published " . date('M j, Y', strtotime($b['date'])) . " by " . htmlspecialchars($b['author_name']) . "</p>
                <p style=\"margin: 0; color: #475569; font-size: 0.95rem;\">" . htmlspecialchars($b['excerpt'] ?? '') . "</p>
            </div>
        ";
    }

    if (empty($blogsList)) {
        $blogsList = "<p style=\"color: #64748b; font-style: italic;\">New articles and resources are currently scheduled for this category. Check back soon!</p>";
    }

    $injectedContent = "
        <div style=\"padding: 20px; max-width: 900px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif;\">
            <header style=\"margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9;\">
                <p style=\"font-size: 0.9rem; font-weight: bold; color: #3b82f6; text-transform: uppercase;\">Topic Pillar Hub</p>
                <h1 style=\"font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 5px 0 15px 0;\">" . htmlspecialchars($title) . "</h1>
                <p style=\"font-size: 1.15rem; line-height: 1.7; color: #334155; margin: 0;\">" . htmlspecialchars($introText) . "</p>
            </header>
            
            <main>
                <h2 style=\"font-size: 1.5rem; color: #0f172a; margin-bottom: 20px;\">Articles in " . htmlspecialchars(str_replace(' | SAP Security Expert', '', $title)) . "</h2>
                <div>" . $blogsList . "</div>
            </main>
        </div>
    ";
}

// 4. Dedicated Author Page fallback
if (!$found && $cleanPath === "/authors/raghu-boddu") {
    $found = true;
    $title = $staticPages['/authors/raghu-boddu']['title'];
    $description = $staticPages['/authors/raghu-boddu']['description'];

    $schemas = [
        [
            "@context" => "https://schema.org",
            "@type" => "Person",
            "name" => "Raghu Boddu",
            "jobTitle" => "Principal Security Architect & Founder",
            "url" => $baseUrl . "/authors/raghu-boddu",
            "image" => $baseUrl . "/assets/raghu_boddu.png",
            "sameAs" => [
                "https://www.linkedin.com/in/bodduraghu/",
                "https://raghuboddu.com/",
                "https://grcwithraghu.substack.com"
            ],
            "description" => "Raghu Boddu is a technology leader, certified auditor (CISA), and author of standard reference books on SAP Access Control, SAP Process Control, and SAP Identity Access Governance (IAG)."
        ]
    ];
    $jsonLd = "\n    <script type=\"application/ld+json\">" . json_encode($schemas, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "</script>\n";

    // Filter Raghu's articles
    $raghuBlogs = [];
    foreach ($allBlogs as $b) {
        if ($b['author_name'] === "Raghu Boddu") {
            $raghuBlogs[] = $b;
        }
    }

    $blogsList = "";
    foreach ($raghuBlogs as $b) {
        $blogsList .= "
            <div style=\"margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;\">
                <h3 style=\"margin: 0 0 5px 0;\"><a href=\"/" . $b['category'] . "/" . $b['slug'] . "\" style=\"color: #1e293b; text-decoration: none; font-weight: bold;\">" . htmlspecialchars($b['title']) . "</a></h3>
                <p style=\"color: #64748b; font-size: 0.88rem; margin: 0 0 8px 0;\">Published " . date('M j, Y', strtotime($b['date'])) . " in <a href=\"/" . $b['category'] . "\" style=\"color: #3b82f6; text-decoration: none;\">" . htmlspecialchars($b['category']) . "</a></p>
                <p style=\"margin: 0; color: #475569; font-size: 0.95rem;\">" . htmlspecialchars($b['excerpt'] ?? '') . "</p>
            </div>
        ";
    }

    $injectedContent = "
        <div style=\"padding: 20px; max-width: 900px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif;\">
            <div style=\"display: flex; gap: 30px; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 2px solid #f1f5f9; align-items: start;\">
                <img src=\"/assets/raghu_boddu.png\" alt=\"Raghu Boddu\" style=\"width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.15);\" />
                <div>
                    <h1 style=\"font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 0 0 5px 0;\">Raghu Boddu</h1>
                    <p style=\"font-size: 1.1rem; font-weight: 600; color: #3b82f6; margin: 0 0 15px 0;\">Principal SAP Security & GRC Architect | Founder</p>
                    <p style=\"font-size: 1.05rem; line-height: 1.7; color: #334155; margin: 0 0 15px 0;\">Raghu Boddu is a highly credentialed technology leader and cybersecurity expert with extensive experience in SAP Security, Governance, Risk and Compliance (GRC), and Enterprise Risk Management. He holds prestigious global certifications (including CISA, CFE, CAMS, PMP, and CCISO) and is the author of standard reference books on SAP Access Control, SAP Process Control, and SAP Identity Access Governance (IAG).</p>
                    <div style=\"display: flex; gap: 15px;\">
                        <a href=\"https://www.linkedin.com/in/bodduraghu/\" target=\"_blank\" style=\"color: #0077b5; text-decoration: none; font-weight: bold;\">LinkedIn Profile &rarr;</a>
                        <a href=\"https://raghuboddu.com/\" target=\"_blank\" style=\"color: #64748b; text-decoration: none; font-weight: bold;\">Personal Site &rarr;</a>
                    </div>
                </div>
            </div>
            
            <main>
                <h2 style=\"font-size: 1.5rem; color: #0f172a; margin-bottom: 25px;\">Articles Published by Raghu</h2>
                <div>" . $blogsList . "</div>
            </main>
        </div>
    ";
}

// 5. Blogs main listing page fallback
if (!$found && $cleanPath === "/blogs") {
    $found = true;
    $title = $staticPages['/blogs']['title'];
    $description = $staticPages['/blogs']['description'];

    $blogsList = "";
    foreach ($allBlogs as $b) {
        $blogsList .= "
            <div style=\"margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;\">
                <h3 style=\"margin: 0 0 5px 0;\"><a href=\"/" . $b['category'] . "/" . $b['slug'] . "\" style=\"color: #1e293b; text-decoration: none; font-weight: bold;\">" . htmlspecialchars($b['title']) . "</a></h3>
                <p style=\"color: #64748b; font-size: 0.88rem; margin: 0 0 8px 0;\">Published " . date('M j, Y', strtotime($b['date'])) . " in <a href=\"/" . $b['category'] . "\" style=\"color: #3b82f6; text-decoration: none;\">" . htmlspecialchars($b['category']) . "</a> by " . htmlspecialchars($b['author_name']) . "</p>
                <p style=\"margin: 0; color: #475569; font-size: 0.95rem;\">" . htmlspecialchars($b['excerpt'] ?? '') . "</p>
            </div>
        ";
    }

    $injectedContent = "
        <div style=\"padding: 20px; max-width: 900px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif;\">
            <header style=\"margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9;\">
                <h1 style=\"font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 0 0 10px 0;\">SAP Security Tutorials & Articles</h1>
                <p style=\"font-size: 1.15rem; color: #475569; margin: 0;\">Detailed deep-dives, step-by-step guides, and industry news for cybersecurity, GRC and cloud operations.</p>
            </header>
            
            <main>
                <div>" . $blogsList . "</div>
            </main>
        </div>
    ";
}

// General static page fallback (e.g. About, Contact)
if (!$found && array_key_exists($cleanPath, $staticPages)) {
    $title = $staticPages[$cleanPath]['title'] ?? $defaultTitle;
    $description = $staticPages[$cleanPath]['description'] ?? $defaultDesc;
    if (!empty($staticPages[$cleanPath]['image'])) {
        $image = getAbsoluteUrl($staticPages[$cleanPath]['image'], $baseUrl);
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
    $html = "<!DOCTYPE html><html><head></head><body><h1>Maintenance Mode</h1></body></html>";
}

if (strpos($html, '<base') === false) {
    $html = str_replace('<head>', '<head><base href="/">', $html);
}

// CLEANUP existing tags to prevent duplicates
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

// Prepare New Tags (WITHOUT keywords)
$headEnd = '</head>';

$ogTags = "
    <!-- Dynamic SEO Tags via index.php (Refined) -->
    <title>" . htmlspecialchars($title) . "</title>
    <meta name=\"description\" content=\"" . htmlspecialchars($description) . "\">
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

$debugInfo = "<!-- SEO Debug: URL=" . htmlspecialchars($url) . " | Found=" . ($found ? "YES" : "NO") . " -->";
$html = str_replace($headEnd, $ogTags . "\n" . $debugInfo . "\n" . $headEnd, $html);

// Wrap notice in <noscript>
if (empty($injectedContent)) {
    $injectedContent = "
        <article style=\"padding: 20px; max-width: 800px; margin: 0 auto; font-family: sans-serif;\">
            <h1>" . htmlspecialchars($title) . "</h1>
            <p>" . htmlspecialchars($description) . "</p>
        </article>
    ";
}

$injectedContent .= "
    <noscript>
        <div style=\"padding: 20px; text-align: center; background: #fffbeb; border: 1px solid #fef3c7; color: #b45309; font-family: sans-serif; border-radius: 8px; margin: 20px auto; max-width: 800px;\">
            <p>You are viewing the static version of this page. For the full interactive experience, please enable JavaScript in your browser settings.</p>
        </div>
    </noscript>
";

if (strpos($html, '<div id="root"></div>') !== false) {
    $html = str_replace('<div id="root"></div>', '<div id="root">' . $injectedContent . '</div>', $html);
} elseif (preg_match('/(<div\s+id=["\']root["\'][^>]*>)/i', $html, $matches)) {
    $html = preg_replace('/(<div\s+id=["\']root["\'][^>]*>)/i', '$1' . $injectedContent, $html);
}

echo $html;
?>