/**
 * SEO middleware — Node.js port of index.php
 * Intercepts non-API HTML requests, injects dynamic meta tags + JSON-LD,
 * and serves dist/index.html with SSR-compatible content for crawlers.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const he = (str) => String(str ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function absUrl(p, base) {
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  return base.replace(/\/$/, '') + '/' + p.replace(/^\//, '');
}

function fmtDate(str) {
  const d = new Date(str);
  return isNaN(d) ? str : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Static pages ────────────────────────────────────────────────────────────────
const STATIC_PAGES = {
  '/': {
    title: 'SAP Security, GRC & Cybersecurity Community - Tutorials & Best Practices | SAP Security Expert',
    description: 'Join 10,000+ SAP Security, GRC, and BTP professionals. Access expert tutorials, best practices, and guides to protect your SAP landscape and advance your career.',
  },
  '/blogs': {
    title: 'Blogs & Tutorials | SAP Security Expert',
    description: 'Read our latest blogs, tutorials, and step-by-step guides on SAP Security, GRC, and cloud compliance.',
  },
  '/about': {
    title: 'About Us | SAP Security Expert',
    description: 'Learn more about SAP Security Expert, our mission, and our team of enterprise security specialists.',
  },
  '/contact-us': {
    title: 'Contact SAP Security Expert | Connect With SAP Security Experts',
    description: 'Contact SAP Security Expert for enquiries, partnerships, or support. Connect with SAP security professionals today.',
  },
  '/podcasts': {
    title: 'SAP Security Podcasts & Expert Insights | SAP Security Expert',
    description: 'Listen to SAP security podcasts for expert insights, industry trends, and strategies to help professionals secure systems.',
  },
  '/product-reviews': {
    title: 'Product Reviews | SAP Security Expert',
    description: 'Unbiased reviews of the latest SAP Security and GRC compliance tools and automation platforms.',
  },
  '/expert-recommendations': {
    title: 'SAP Security Recommendations & Resources | SAP Security Expert',
    description: 'SAP security expert recommendations, utilities, and resources to improve protection and simplify GRC workflows.',
  },
  '/authors/raghu-boddu': {
    title: 'Raghu Boddu - SAP Security & GRC Expert Author | SAP Security Expert',
    description: 'Read expert insights, tutorials, and research articles from Raghu Boddu, founder of SAP Security Expert and author of authoritative SAP GRC books.',
    image: '/assets/raghu_boddu.png',
  },
};

// ── Category definitions ────────────────────────────────────────────────────────
const CATEGORIES = {
  'sap-btp-security': {
    title: 'SAP BTP Cloud Security Guide | SAP Security Expert',
    description: 'Secure SAP BTP with step-by-step tutorials on IAS/IPS, Role Collections, API security, and tenant hardening. Expert guides for cloud security professionals.',
    intro: 'SAP Business Technology Platform (BTP) is the cornerstone of modern SAP enterprise architectures, serving as the integration and extension suite for cloud and hybrid landscapes. As organizations transition to the cloud, securing SAP BTP becomes paramount. Securing this environment requires a comprehensive understanding of Cloud Identity Services, specifically the Identity Authentication Service (IAS) and Identity Provisioning Service (IPS), which manage federated single sign-on (SSO), user authentication, and lifecycle management. A robust BTP security strategy demands the implementation of strict Role Collections, precise API security controls, security monitoring, and regular auditing. By leveraging platform-native security tools and establishing strong governance policies, companies can protect sensitive business data, isolate extension applications, and ensure continuous compliance. Discover deep-dives, best practices, and expert tutorials on configuring, auditing, and hardening your SAP BTP architecture to safeguard your cloud journey.',
  },
  'sap-grc': {
    title: 'SAP GRC Governance Risk Compliance | SAP Security Expert',
    description: 'Master SAP GRC with expert guides on ARA rulesets, ARM workflows, EAM firefighter logs, and BRM role governance. Practical compliance tutorials for GRC professionals.',
    intro: 'SAP GRC is the industry-standard enterprise suite designed to manage business risks, ensure regulatory compliance, and automate control monitoring across complex SAP environments. At the core of GRC is the management of Segregation of Duties (SoD) risks and sensitive transaction access, which prevents internal fraud and operational errors. Organizations deploy GRC Access Control to automate the entire identity lifecycle, configure emergency access management (Firefighter), and manage security roles efficiently. Implementing GRC process controls allows companies to automate continuous control monitoring (CCM) across finance, procurement, and operations, reducing audit cycles and improving control effectiveness. Here, you will find comprehensive guides on ARA ruleset optimization, ARM workflows, EAM firefighter logs, and continuous compliance strategies. Learn how to transform SAP GRC from a pure compliance check into an active, value-driving cybersecurity asset for your enterprise.',
  },
  'sap-public-cloud': {
    title: 'SAP Public Cloud Security Guide | SAP Security Expert',
    description: 'Secure SAP S/4HANA Cloud Public Edition with tutorials on IAS/IPS IAM, business catalog permissions, and communication arrangements for cloud compliance.',
    intro: 'SAP Public Cloud, specifically S/4HANA Cloud Public Edition, represents a paradigm shift where SAP manages the underlying infrastructure and software lifecycle, and customers secure their business data, user access, and configurations. Unlike on-premises systems, Public Cloud security relies heavily on the SAP Cloud Identity Services (IAS/IPS) for secure authentication and user provisioning. Establishing robust security in the public cloud demands a strong understanding of Identity and Access Management (IAM), role collection mappings, and business catalog permissions. Security administrators must focus on configuring secure integration scenarios, managing communication arrangements, and maintaining strict data isolation protocols. This guide provides expert insights, S/4HANA Cloud security blueprints, and step-by-step guides for auditing, configuring, and operating a fully secure SAP Public Cloud tenant while adhering to compliance standards.',
  },
  'sap-cybersecurity': {
    title: 'SAP Cybersecurity Resources & Insights | SAP Security Expert',
    description: 'Protect SAP environments from advanced threats. Learn ABAP code auditing, SIEM integration, infrastructure hardening, and vulnerability management best practices.',
    intro: 'Modern enterprise landscapes face sophisticated, targeted cyber threats aimed at stealing intellectual property, financial data, and disrupting business continuity. SAP systems, containing the core ERP data of global organizations, are primary targets. Comprehensive SAP cybersecurity goes beyond role-based access to encompass infrastructure hardening, secure network protocols, threat detection, and continuous vulnerability management. Protecting SAP requires auditing database layers, operating systems, custom ABAP code (safeguarding against injections and authority bypasses), and securing external APIs. By implementing advanced threat monitoring, integrating SAP with corporate SIEM/SOAR platforms, and conducting regular security assessments, security teams can proactively detect and respond to anomalies before they manifest. Read our expert cybersecurity resources, hardening checklists, and vulnerability research to protect your most valuable enterprise assets.',
  },
  'sap-iag': {
    title: 'SAP IAG Identity Access Governance | SAP Security Expert',
    description: 'Govern identities with SAP IAG. Learn SoD checks, intelligent access analysis, automated provisioning, and cloud-native risk management in hybrid environments.',
    intro: 'SAP Identity Access Governance (IAG) is a cloud-native SaaS solution built on the SAP Business Technology Platform designed to govern identity and access across hybrid enterprise environments. It serves as a modern cloud companion or successor to SAP GRC Access Control. SAP IAG provides intelligent access analysis, segregation of duties (SoD) checks, role design utilities, and automated access request provisioning for both cloud systems (like SuccessFactors, S/4HANA Cloud, BTP) and on-premises systems. Leveraging machine learning and predictive analytics, IAG automates risk analysis and streamlines compliance workflows, helping security administrators secure user access with minimal manual overhead. Explore our practical tutorials, integration blueprints, and deployment best practices for setting up, configuring, and maximizing the value of SAP IAG in your hybrid enterprise identity landscape.',
  },
  'sap-security': {
    title: 'SAP Security Services & Solutions | SAP Security Expert',
    description: 'Master SAP Security with step-by-step guides on role design (PFCG), authorization objects, SoD, audit strategies, and RFC/gateway hardening for enterprise systems.',
    intro: 'SAP Security is a multi-dimensional domain focusing on safeguarding corporate data, transactions, and processes within the SAP ecosystem. It serves as the foundation of enterprise trust, ensuring that only authorized users can execute specific business activities. A mature SAP security framework requires a granular understanding of the SAP authorization concept, including role design (single, composite, and derived roles), profile generator (PFCG), and authorization objects. Beyond user security, it demands secure system administration (BC-SEC), encryption of data in transit (SNC, SSL/TLS), and secure configuration of gateway and RFC destinations to prevent unauthorized lateral movement. Our tutorials, expert checklists, and detailed guides cover the fundamentals and advanced techniques of SAP role maintenance, authorization trouble-shooting, and system audits to keep your core business applications safe and compliant.',
  },
  'sap-s4hana-security': {
    title: 'SAP S/4HANA Security Best Practices | SAP Security Expert',
    description: 'Secure SAP S/4HANA with expert tutorials on HANA DB permissions, business catalog mapping, role migration from ECC, and Fiori UX authorization design.',
    intro: 'SAP S/4HANA introduces advanced database architectures (HANA) and a modern web user interface (Fiori), requiring a complete modernization of traditional ERP security strategies. Securing S/4HANA requires managing database-level security, configuring Hana user permissions, securing core ABAP application layers, and designing dynamic front-end access models. Traditional SAP role designs must adapt to map S/4HANA business catalogs, spaces, and pages to backend authorizations. Additionally, securing S/4HANA in the cloud (Private/Public) introduces new integration boundaries, secure API management, and continuous updates. Dive into our comprehensive guides on S/4HANA security configurations, role migration strategies, HANA DB security hardening, and secure ERP operations to ensure your digital transformation remains secure and resilient.',
  },
  'sap-fiori-security': {
    title: 'SAP Fiori Security & UX Protection | SAP Security Expert',
    description: 'Harden SAP Fiori with guides on catalog and spaces design, OData service security, Web Dispatcher hardening, and SSO configuration for secure UX delivery.',
    intro: 'SAP Fiori is the modern user experience (UX) gateway for SAP applications, replacing traditional SAP GUI screens with responsive, web-based apps. Securing SAP Fiori environments is critical, as it serves as the user-facing entry point to sensitive ERP transactions. A secure Fiori architecture requires tight integration between front-end Fiori launchpad configurations and back-end ERP authorizations. Security administrators must manage Fiori Catalogs, Groups, Spaces, and Pages, while ensuring OData services are securely activated and constrained to prevent unauthorized data access. Implementing secure HTTP headers, configuring Web Dispatcher security, and enabling Single Sign-On (SSO) are essential pillars of a complete Fiori security strategy. Read our detailed, step-by-step guides on Fiori catalogs design, OData service authorization, and UI5 application hardening to protect your digital workspace.',
  },
  'sap-sac-security': {
    title: 'SAP Analytics Cloud (SAC) Security | SAP Security Expert',
    description: 'Secure SAP Analytics Cloud: user provisioning, folder permissions, RLS data access, SSO via IAS, and governance best practices for secure enterprise reporting.',
    intro: 'SAP Analytics Cloud (SAC) is a powerful cloud analytics platform that enables business intelligence, enterprise planning, and predictive analytics on sensitive corporate data. Securing SAC requires a robust, granular governance framework that controls user provisioning, folder-level object permissions, and data-level access. Security managers must configure Single Sign-On (SSO) via SAML 2.0 Identity Providers (like SAP IAS, Azure AD, or Okta) and define secure Teams and Roles within the tenant. Crucially, SAC security must align with backend data sources (such as SAP HANA, BW, or S/4HANA) using secure connection configurations (Direct Live Data or Import Data) with row-level data security mappings. Explore our guides on SAC folder permission architecture, dynamic data-level security, user provisioning automation, and secure model governance for trusted enterprise reporting.',
  },
  'sap-cis': {
    title: 'SAP Cybersecurity Infrastructure (CIS) | SAP Security Expert',
    description: 'Harden SAP infrastructure with CIS benchmarks, HANA and OS security controls, Security Audit Log setup, and patch management frameworks for system-level protection.',
    intro: 'Securing the infrastructure of SAP applications is the foundation of enterprise cybersecurity, as weak system-level configurations can bypass even the most robust role-based authorizations. Infrastructure security focuses on hardening the underlying database layers (SAP HANA, Sybase, Oracle), operating systems (SUSE Linux, Red Hat, Windows), and network layers. Leveraging standard Center for Internet Security (CIS) benchmarks and SAP Security Guides, administrators must disable default credentials, restrict powerful system profiles, disable insecure gateway parameters, and secure RFC/ICM communication protocols. Additionally, maintaining secure OS-level file permissions, enabling robust logging (Security Audit Log), and implementing regular patch management are critical to defending against modern exploits. Learn how to configure, audit, and harden your SAP systems from the ground up to prevent system-level breaches.',
  },
  'sap-successfactors-security': {
    title: 'SAP SuccessFactors Security & RBP | SAP Security Expert',
    description: 'Secure HCM data with SAP SuccessFactors RBP. Learn permission groups, target populations, SSO via IAS, and GDPR-compliant data privacy configurations.',
    intro: 'SAP SuccessFactors is a cloud-based human capital management (HCM) system containing highly confidential employee profiles, financial compensation packages, and sensitive personal data. Securing this environment is essential for regulatory compliance (like GDPR, HIPAA, and CCPA) and employee trust. SuccessFactors security is managed through a specialized Role-Based Permissions (RBP) framework that allows precise control over user groups, target populations, and data fields. Additionally, administrators must manage secure user authentication, identity federation via Cloud Identity Services (IAS/IPS), and establish secure API credentials for third-party payroll and talent integrations. Our guides provide detailed walkthroughs on RBP design best practices, employee data privacy configurations, audit reporting, and secure HCM integrations to protect your global workforce.',
  },
  'sap-security-other': {
    title: 'Advanced SAP Security Topics & Custom Developments | SAP Security Expert',
    description: 'Explore niche SAP security domains: ABAP code audits, interface security, legacy system hardening, and custom authorization object design guides.',
    intro: 'SAP Security covers a massive landscape of core systems, integration touchpoints, and custom developments. Beyond standardized cloud environments, securing modern enterprise applications means protecting custom ABAP developments from code-level vulnerabilities, managing database user authorizations directly, audit logging, and securing transactional interfaces. Legacy environments also require structured hardening and specialized network-level configurations to mitigate legacy protocol vulnerabilities. Explore advanced topics in ABAP secure coding standards, legacy application defense, secure interfaces (RFC/ALE/IDoc), and custom compliance monitoring guides.',
  },
  'sap-access-control': {
    title: 'SAP GRC Access Control Expert Guide | SAP Security Expert',
    description: 'Master SAP GRC Access Control: ARA rulesets, ARM workflows, EAM firefighter logs, and BRM role design. Step-by-step tutorials for GRC professionals.',
    intro: 'SAP GRC Access Control is the key technology framework used by organizations to prevent, detect, and mitigate authorization risks within their enterprise landscapes. Comprising several powerful components—including Access Risk Analysis (ARA), Access Request Management (ARM), Emergency Access Management (EAM), and Business Role Management (BRM)—Access Control forms the baseline of external audits and internal compliance controls. Securing these architectures demands constant maintenance of SoD rulesets, workflow designs that minimize friction, and automated firefighter monitoring to audit dynamic user activities. Master practical configurations, firefighter troubleshooting, ruleset customisation, and audit preparation techniques.',
  },
  'sap-process-control': {
    title: 'SAP GRC Process Control & Continuous Monitoring | SAP Security Expert',
    description: 'Automate SAP compliance with GRC Process Control. Learn continuous control monitoring (CCM), internal control testing, and audit-ready frameworks.',
    intro: 'SAP GRC Process Control enables organizations to transition from expensive, manual control audits to dynamic, continuous compliance monitoring. By automating control design, testing, and assessment workflows, companies gain real-time visibility into operational risks and corporate compliance states. With continuous control monitoring (CCM), business transactions are analyzed programmatically to detect internal policy exceptions, unauthorized transactional changes, and financial compliance overrides. Discover advanced configurations for automatic test scripts, manual control assessments, continuous data collection strategies, and GRC-backed corporate governance standards.',
  },
};

const DEFAULT_TITLE = 'SAP Security, GRC & Cybersecurity Community - Tutorials & Best Practices | SAP Security Expert';
const DEFAULT_DESC  = 'Join 10,000+ SAP Security, GRC, and BTP professionals. Access expert tutorials, best practices, and guides to protect your SAP landscape and advance your career.';

const AUTHOR_SQL = `
  CASE WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
       ELSE COALESCE(c.full_name, b.author) END AS author_name,
  CASE WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN '/assets/raghu_boddu.png'
       ELSE COALESCE(c.image, '/assets/placeholder.webp') END AS author_image,
  CASE WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1
       THEN 'Founder & Security Expert at SAP Security Expert. Author of authoritative books on SAP Access Control, SAP Process Control, and SAP Identity Access Governance (IAG).'
       ELSE COALESCE(c.short_bio, 'Contributor') END AS author_bio
`;

function readDistHtml() {
  const distPath = path.join(ROOT, 'dist', 'index.html');
  const fallbackPath = path.join(ROOT, 'index.html');
  if (fs.existsSync(distPath)) return fs.readFileSync(distPath, 'utf8');
  if (fs.existsSync(fallbackPath)) return fs.readFileSync(fallbackPath, 'utf8');
  return '<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>';
}

function stripExistingMeta(html) {
  return html
    .replace(/<title>.*?<\/title>/is, '')
    .replace(/<meta\s+[^>]*property=["']og:[^"']+["'][^>]*\/?>/gis, '')
    .replace(/<meta\s+[^>]*name=["']og:[^"']+["'][^>]*\/?>/gis, '')
    .replace(/<meta\s+[^>]*name=["']description["'][^>]*\/?>/gis, '')
    .replace(/<meta\s+[^>]*name=["']Description["'][^>]*\/?>/gis, '')
    .replace(/<meta\s+[^>]*name=["']twitter:[^"']+["'][^>]*\/?>/gis, '')
    .replace(/<meta\s+[^>]*name=["']keywords["'][^>]*\/?>/gis, '')
    .replace(/<meta\s+[^>]*name=["']author["'][^>]*\/?>/gis, '')
    .replace(/<meta\s+[^>]*name=["']robots["'][^>]*\/?>/gis, '');
}

function buildHeadTags({ title, description, image, url, type, authorName, publishDate, jsonLd, baseUrl }) {
  const absImg = absUrl(image || '/assets/sapsecurityexpert-black.png', baseUrl);
  return `
    <!-- Dynamic SEO Tags -->
    <title>${he(title)}</title>
    <meta name="description" content="${he(description)}">
    <meta name="author" content="${he(authorName || 'SAP Security Expert')}">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <link rel="canonical" href="${he(url)}">
    <link rel="sitemap" type="application/xml" title="Sitemap" href="${he(baseUrl)}/sitemap.xml">

    <meta property="og:title" content="${he(title)}">
    <meta property="og:description" content="${he(description)}">
    <meta property="og:image" content="${he(absImg)}">
    <meta property="og:url" content="${he(url)}">
    <meta property="og:type" content="${he(type || 'website')}">
    <meta property="og:site_name" content="SAP Security Expert">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${he(title)}">
    <meta name="twitter:description" content="${he(description)}">
    <meta name="twitter:image" content="${he(absImg)}">
    <meta name="google-adsense-account" content="ca-pub-5501267075758433">
    ${type === 'article' && publishDate ? `<meta property="article:published_time" content="${he(publishDate)}">` : ''}
    ${jsonLd || ''}
  `;
}

function injectIntoHtml(html, headTags, bodyContent, baseUrl) {
  // Ensure base href
  if (!html.includes('<base')) {
    html = html.replace('<head>', '<head><base href="/">');
  }
  html = stripExistingMeta(html);
  html = html.replace('</head>', headTags + '\n</head>');

  const noscript = `
    <noscript>
      <div style="padding:20px;text-align:center;background:#fffbeb;border:1px solid #fef3c7;color:#b45309;font-family:sans-serif;border-radius:8px;margin:20px auto;max-width:800px;">
        <p>You are viewing the static version of this page. For the full interactive experience, please enable JavaScript.</p>
      </div>
    </noscript>`;

  const content = (bodyContent || `<article style="padding:20px;max-width:800px;margin:0 auto;font-family:sans-serif;"><h1>${he(headTags.match(/<title>(.*?)<\/title>/)?.[1] || '')}</h1></article>`) + noscript;

  if (html.includes('<div id="root"></div>')) {
    html = html.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
  } else {
    html = html.replace(/(<div\s+id=["']root["'][^>]*>)/i, `$1${content}`);
  }
  return html;
}

// ── Main middleware ─────────────────────────────────────────────────────────────
module.exports = async function seoMiddleware(req, res) {
  const reqPath = req.path;
  const protocol = req.protocol;
  const host = req.hostname;
  const baseUrl = `${protocol}://${host}`;

  // ?plaintext=1 — redirect for AI crawlers
  if (req.query.plaintext === '1') {
    const segments = reqPath.replace(/^\/|\/$/g, '').split('/');
    const slug = segments.length >= 1 ? segments[segments.length - 1] : '';
    if (slug) {
      const fmt = req.query.format ? `&format=${encodeURIComponent(req.query.format)}` : '';
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      return res.redirect(302, `/api/content?slug=${encodeURIComponent(slug)}${fmt}`);
    }
  }

  const db = req.db;
  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESC;
  let image = '/assets/sapsecurityexpert-black.png';
  let url = baseUrl + reqPath;
  let type = 'website';
  let authorName = 'SAP Security Expert';
  let publishDate = null;
  let jsonLd = '';
  let bodyContent = '';
  let found = false;

  // Load all published blogs
  let allBlogs = [];
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [rows] = await db.execute(
      `SELECT b.id, b.title, b.slug, b.category, b.subCategory, b.excerpt, b.date, b.image,
              b.content, b.faqs, b.meta_title, b.meta_description,
              ${AUTHOR_SQL}
       FROM blogs b
       LEFT JOIN users u ON b.author_id = u.id
       LEFT JOIN contributors c ON u.contributor_id = c.id
       WHERE b.status IN ('approved','published') AND b.date <= ?
       ORDER BY b.date DESC`,
      [now]
    );
    allBlogs = rows;
  } catch (e) {
    // Fail silently — still serve the SPA
  }

  // Extract slug from URL
  let cleanSlug = '';
  const segments = reqPath.replace(/^\/|\/$/g, '').split('/');

  if (reqPath.startsWith('/blogs/') && segments.length >= 2) {
    cleanSlug = segments[1];
  } else if (segments.length === 2 && !STATIC_PAGES[reqPath]) {
    cleanSlug = segments[1];
  }

  // ── Blog article page ──────────────────────────────────────────────────────
  if (cleanSlug) {
    const blog = allBlogs.find(b => b.slug === cleanSlug);
    if (blog) {
      found = true;
      title = blog.meta_title || blog.title;
      authorName = blog.author_name;
      description = blog.meta_description || blog.excerpt || `${blog.title} - Written by ${authorName}. Read more on SAP Security Expert.`;
      image = blog.image || '/assets/sapsecurityexpert-black.png';
      url = absUrl(reqPath, baseUrl);
      type = 'article';
      publishDate = blog.date;

      const schemas = [
        {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: title,
          description,
          image: [absUrl(image, baseUrl)],
          datePublished: publishDate,
          dateModified: publishDate,
          author: {
            '@type': 'Person',
            name: authorName,
            jobTitle: 'SAP Security Expert',
            sameAs: authorName === 'Raghu Boddu' ? ['https://www.linkedin.com/in/bodduraghu/', 'https://raghuboddu.com/'] : [],
          },
          publisher: {
            '@type': 'Organization',
            name: 'SAP Security Expert',
            logo: { '@type': 'ImageObject', url: baseUrl + '/assets/sapsecurityexpert-black.png' },
          },
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        },
      ];

      // FAQ schema
      if (blog.faqs) {
        try {
          const faqs = JSON.parse(blog.faqs);
          if (Array.isArray(faqs) && faqs.length) {
            schemas.push({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map(f => ({
                '@type': 'Question',
                name: f.question || '',
                acceptedAnswer: { '@type': 'Answer', text: f.answer || '' },
              })),
            });
          }
        } catch (_) {}
      }

      // Breadcrumb schema
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: blog.category, item: `${baseUrl}/${blog.category}` },
          { '@type': 'ListItem', position: 3, name: title, item: url },
        ],
      });

      jsonLd = `\n    <script type="application/ld+json">${JSON.stringify(schemas, null, 2)}</script>\n`;

      // Related blogs
      const related = allBlogs.filter(b => b.slug !== blog.slug && b.category === blog.category).slice(0, 3);
      const relatedHtml = related.length
        ? `<div style="margin-top:30px"><h3>Related Articles</h3><ul>${related.map(r => `<li><a href="/${r.category}/${r.slug}">${he(r.title)}</a></li>`).join('')}</ul></div>`
        : '';

      bodyContent = `
        <article style="padding:20px;max-width:800px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;line-height:1.7;color:#1e293b;">
          <header style="margin-bottom:20px;">
            <p style="font-size:0.9rem;text-transform:uppercase;letter-spacing:0.05em;color:#3b82f6;font-weight:bold;margin-bottom:8px;">${he(blog.category)}</p>
            <h1 style="font-size:2.25rem;font-weight:800;line-height:1.2;color:#0f172a;margin:0 0 10px 0;">${he(title)}</h1>
            <div style="display:flex;align-items:center;gap:10px;color:#64748b;font-size:0.95rem;margin-bottom:20px;">
              <span>By <strong>${he(authorName)}</strong></span>
              <span>•</span>
              <span>Published: ${fmtDate(publishDate)}</span>
            </div>
          </header>
          <div class="article-body" style="font-size:1.1rem;">${blog.content || ''}</div>
          <footer style="margin-top:40px;padding-top:30px;border-top:1px solid #e2e8f0;">
            <div style="display:flex;gap:20px;background:#f8fafc;border:1px solid #e2e8f0;padding:25px;border-radius:12px;align-items:start;">
              <img src="${he(blog.author_image)}" alt="${he(authorName)}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #fff;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);" />
              <div>
                <h4 style="margin:0 0 5px 0;font-size:1.15rem;color:#0f172a;">${he(authorName)}</h4>
                <p style="margin:0;font-size:0.95rem;color:#475569;">${he(blog.author_bio)}</p>
              </div>
            </div>
            ${relatedHtml}
          </footer>
        </article>`;
    }
  }

  // ── Homepage ─────────────────────────────────────────────────────────────────
  if (!found && reqPath === '/') {
    found = true;
    title = DEFAULT_TITLE;
    description = DEFAULT_DESC;

    const schemas = [
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'SAP Security Expert', url: baseUrl, logo: baseUrl + '/assets/sapsecurityexpert-black.png', sameAs: ['https://www.linkedin.com/in/bodduraghu/', 'https://grcwithraghu.substack.com'] },
      { '@context': 'https://schema.org', '@type': 'Person', name: 'Raghu Boddu', jobTitle: 'Founder & Author', url: baseUrl + '/authors/raghu-boddu', sameAs: ['https://www.linkedin.com/in/bodduraghu/', 'https://raghuboddu.com/'] },
    ];
    jsonLd = `\n    <script type="application/ld+json">${JSON.stringify(schemas, null, 2)}</script>\n`;

    const recentHtml = allBlogs.slice(0, 10).map(b => `
      <div style="margin-bottom:25px;padding-bottom:20px;border-bottom:1px solid #e2e8f0;">
        <h3 style="margin:0 0 5px 0;"><a href="/${b.category}/${b.slug}" style="color:#1e293b;text-decoration:none;font-weight:bold;">${he(b.title)}</a></h3>
        <p style="color:#64748b;font-size:0.9rem;margin:0 0 8px 0;">Published in <a href="/${b.category}" style="color:#3b82f6;text-decoration:none;">${he(b.category)}</a> by ${he(b.author_name)}</p>
        <p style="margin:0;color:#475569;font-size:0.98rem;">${he(b.excerpt || '')}</p>
      </div>`).join('');

    const catLinks = Object.entries(CATEGORIES).map(([slug, cat]) =>
      `<a href="/${slug}" style="display:inline-block;background:#f1f5f9;padding:10px 18px;margin:5px;border-radius:50px;text-decoration:none;color:#334155;font-weight:500;font-size:0.92rem;">${he(cat.title.replace(' | SAP Security Expert', ''))}</a>`
    ).join('');

    bodyContent = `
      <div style="padding:20px;max-width:900px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;">
        <header style="text-align:center;padding:40px 0;">
          <h1 style="font-size:2.5rem;font-weight:800;color:#0f172a;">${he(title)}</h1>
          <p style="font-size:1.2rem;color:#475569;max-width:700px;margin:15px auto 0;">${he(description)}</p>
          <div style="margin-top:25px;">${catLinks}</div>
        </header>
        <main style="margin-top:40px;">
          <h2 style="font-size:1.75rem;color:#0f172a;margin-bottom:25px;">Latest Security Guides & Tutorials</h2>
          <div>${recentHtml}</div>
        </main>
      </div>`;
  }

  // ── Category pillar page ──────────────────────────────────────────────────────
  if (!found) {
    const catKey = reqPath.replace(/^\//, '');
    const cat = CATEGORIES[catKey];
    if (cat) {
      found = true;
      title = cat.title;
      description = cat.description;
      url = absUrl(reqPath, baseUrl);

      const schemas = [
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl }, { '@type': 'ListItem', position: 2, name: catKey, item: url }] },
        { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description, url },
      ];
      jsonLd = `\n    <script type="application/ld+json">${JSON.stringify(schemas, null, 2)}</script>\n`;

      const catBlogs = allBlogs.filter(b => {
        if (catKey === 'sap-security') return ['sap-security', 'sap-btp-security', 'sap-public-cloud', 'sap-fiori-security', 'sap-s4hana-security'].includes(b.category);
        if (catKey === 'sap-grc') return ['sap-grc', 'sap-access-control', 'sap-process-control', 'sap-iag'].includes(b.category) || ['sap-grc', 'sap-access-control', 'sap-process-control', 'sap-iag'].includes(b.subCategory);
        return b.category === catKey || b.subCategory === catKey;
      });

      const blogListHtml = catBlogs.length
        ? catBlogs.map(b => `
          <div style="margin-bottom:25px;padding-bottom:20px;border-bottom:1px solid #e2e8f0;">
            <h3 style="margin:0 0 5px 0;"><a href="/${b.category}/${b.slug}" style="color:#1e293b;text-decoration:none;font-weight:bold;">${he(b.title)}</a></h3>
            <p style="color:#64748b;font-size:0.88rem;margin:0 0 8px 0;">Published ${fmtDate(b.date)} by ${he(b.author_name)}</p>
            <p style="margin:0;color:#475569;font-size:0.95rem;">${he(b.excerpt || '')}</p>
          </div>`).join('')
        : '<p style="color:#64748b;font-style:italic;">New articles are scheduled for this category. Check back soon!</p>';

      bodyContent = `
        <div style="padding:20px;max-width:900px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;">
          <header style="margin-bottom:40px;padding-bottom:20px;border-bottom:2px solid #f1f5f9;">
            <p style="font-size:0.9rem;font-weight:bold;color:#3b82f6;text-transform:uppercase;">Topic Pillar Hub</p>
            <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin:5px 0 15px 0;">${he(title)}</h1>
            <p style="font-size:1.15rem;line-height:1.7;color:#334155;margin:0;">${he(cat.intro)}</p>
          </header>
          <main>
            <h2 style="font-size:1.5rem;color:#0f172a;margin-bottom:20px;">Articles in ${he(title.replace(' | SAP Security Expert', ''))}</h2>
            <div>${blogListHtml}</div>
          </main>
        </div>`;
    }
  }

  // ── Author page ───────────────────────────────────────────────────────────────
  if (!found && reqPath === '/authors/raghu-boddu') {
    found = true;
    const sp = STATIC_PAGES['/authors/raghu-boddu'];
    title = sp.title;
    description = sp.description;
    image = sp.image;
    url = absUrl(reqPath, baseUrl);

    const schemas = [{
      '@context': 'https://schema.org', '@type': 'Person', name: 'Raghu Boddu',
      jobTitle: 'Principal Security Architect & Founder', url,
      image: baseUrl + '/assets/raghu_boddu.png',
      sameAs: ['https://www.linkedin.com/in/bodduraghu/', 'https://raghuboddu.com/', 'https://grcwithraghu.substack.com'],
      description: 'Raghu Boddu is a technology leader, certified auditor (CISA), and author of standard reference books on SAP Access Control, SAP Process Control, and SAP Identity Access Governance (IAG).',
    }];
    jsonLd = `\n    <script type="application/ld+json">${JSON.stringify(schemas, null, 2)}</script>\n`;

    const raghuBlogs = allBlogs.filter(b => b.author_name === 'Raghu Boddu');
    const raghuListHtml = raghuBlogs.map(b => `
      <div style="margin-bottom:25px;padding-bottom:20px;border-bottom:1px solid #e2e8f0;">
        <h3 style="margin:0 0 5px 0;"><a href="/${b.category}/${b.slug}" style="color:#1e293b;text-decoration:none;font-weight:bold;">${he(b.title)}</a></h3>
        <p style="color:#64748b;font-size:0.88rem;margin:0 0 8px 0;">Published ${fmtDate(b.date)} in <a href="/${b.category}" style="color:#3b82f6;text-decoration:none;">${he(b.category)}</a></p>
        <p style="margin:0;color:#475569;font-size:0.95rem;">${he(b.excerpt || '')}</p>
      </div>`).join('');

    bodyContent = `
      <div style="padding:20px;max-width:900px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;">
        <div style="display:flex;gap:30px;margin-bottom:40px;padding-bottom:30px;border-bottom:2px solid #f1f5f9;align-items:start;">
          <img src="/assets/raghu_boddu.png" alt="Raghu Boddu" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:4px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.15);" />
          <div>
            <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin:0 0 5px 0;">Raghu Boddu</h1>
            <p style="font-size:1.1rem;font-weight:600;color:#3b82f6;margin:0 0 15px 0;">Principal SAP Security & GRC Architect | Founder</p>
            <p style="font-size:1.05rem;line-height:1.7;color:#334155;margin:0 0 15px 0;">Raghu Boddu is a highly credentialed technology leader and cybersecurity expert with extensive experience in SAP Security, GRC, and Enterprise Risk Management. He holds prestigious global certifications (including CISA, CFE, CAMS, PMP, and CCISO) and is the author of standard reference books on SAP Access Control, SAP Process Control, and SAP IAG.</p>
            <div style="display:flex;gap:15px;">
              <a href="https://www.linkedin.com/in/bodduraghu/" target="_blank" style="color:#0077b5;text-decoration:none;font-weight:bold;">LinkedIn &rarr;</a>
              <a href="https://raghuboddu.com/" target="_blank" style="color:#64748b;text-decoration:none;font-weight:bold;">Personal Site &rarr;</a>
            </div>
          </div>
        </div>
        <main>
          <h2 style="font-size:1.5rem;color:#0f172a;margin-bottom:25px;">Articles by Raghu</h2>
          <div>${raghuListHtml}</div>
        </main>
      </div>`;
  }

  // ── /blogs listing ────────────────────────────────────────────────────────────
  if (!found && reqPath === '/blogs') {
    found = true;
    const sp = STATIC_PAGES['/blogs'];
    title = sp.title;
    description = sp.description;
    url = absUrl(reqPath, baseUrl);

    const blogsListHtml = allBlogs.map(b => `
      <div style="margin-bottom:25px;padding-bottom:20px;border-bottom:1px solid #e2e8f0;">
        <h3 style="margin:0 0 5px 0;"><a href="/${b.category}/${b.slug}" style="color:#1e293b;text-decoration:none;font-weight:bold;">${he(b.title)}</a></h3>
        <p style="color:#64748b;font-size:0.88rem;margin:0 0 8px 0;">Published ${fmtDate(b.date)} in <a href="/${b.category}" style="color:#3b82f6;text-decoration:none;">${he(b.category)}</a> by ${he(b.author_name)}</p>
        <p style="margin:0;color:#475569;font-size:0.95rem;">${he(b.excerpt || '')}</p>
      </div>`).join('');

    bodyContent = `
      <div style="padding:20px;max-width:900px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;">
        <header style="margin-bottom:40px;padding-bottom:20px;border-bottom:2px solid #f1f5f9;">
          <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin:0 0 10px 0;">SAP Security Tutorials & Articles</h1>
          <p style="font-size:1.15rem;color:#475569;margin:0;">Detailed deep-dives, step-by-step guides, and industry news for cybersecurity, GRC and cloud operations.</p>
        </header>
        <main><div>${blogsListHtml}</div></main>
      </div>`;
  }

  // ── Other static pages ────────────────────────────────────────────────────────
  if (!found && STATIC_PAGES[reqPath]) {
    found = true;
    const sp = STATIC_PAGES[reqPath];
    title = sp.title || DEFAULT_TITLE;
    description = sp.description || DEFAULT_DESC;
    if (sp.image) image = sp.image;
    url = absUrl(reqPath, baseUrl);
  }

  // ── Assemble and send ─────────────────────────────────────────────────────────
  let html = readDistHtml();
  const headTags = buildHeadTags({ title, description, image, url, type, authorName, publishDate, jsonLd, baseUrl });
  html = injectIntoHtml(html, headTags, bodyContent, baseUrl);

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', type === 'article' ? 'public, max-age=300' : 'public, max-age=60');
  res.send(html);
};
