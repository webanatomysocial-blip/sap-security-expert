import { useEffect, useRef, useMemo, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import Image from "next/image";
// next-disabled: import "../css/blog-post.css";
import { FaLinkedin, FaXTwitter, FaGlobe } from "react-icons/fa6";
import { VITE_SITE_URL } from "../utils/env";

// Icons and Components
import ShareButton from "./ShareButton";
import BlogSidebar from "./BlogSidebar";
import CommentSection from "./CommentSection";
import SEO from "./SEO";
import AuthorProfile from "./AuthorProfile";
import FAQ from "./FAQ";
import { useMemberAuth } from "../context/MemberAuthContext";
import MembersOnlyPaywall from "./MembersOnlyPaywall";
import PremiumPaywall from "./PremiumPaywall";

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

const CATEGORY_LABELS = {
  "sap-security": "SAP Security",
  "sap-s4hana-security": "SAP S/4HANA Security",
  "sap-fiori-security": "SAP Fiori Security",
  "sap-btp-security": "SAP BTP Security",
  "sap-public-cloud": "SAP Public Cloud",
  "sap-sac-security": "SAP SAC Security",
  "sap-cis": "SAP CIS",
  "sap-successfactors-security": "SuccessFactors Security",
  "sap-security-other": "SAP Security",
  "sap-access-control": "Access Control",
  "sap-process-control": "Process Control",
  "sap-iag": "SAP IAG",
  "sap-grc": "SAP GRC",
  "sap-cybersecurity": "Cybersecurity",
  "product-reviews": "Product Reviews",
  "podcasts": "Expert Voices & Podcasts",
  "videos": "Videos",
  "expert-recommendations": "Expert Recommendations",
  "news": "News & Updates",
  "security-fundamentals": "Security Fundamentals",
  "user-management": "User Management",
  "role-management": "Role Management",
  "authorization-concepts": "Authorization Concepts",
  "audit-compliance": "Audit & Compliance",
  "grc-advanced": "GRC & Advanced Topics",
};

const BlogLayout = ({
  blogId,
  title,
  content,
  image,
  image_alt,
  category,
  date,
  author_name = "Guest Author",
  author_image,
  author_bio,
  author_designation,
  author_linkedin,
  author_twitter,
  author_website,
  sidebarAd = {},
  viewCount = 0,
  commentCount = 0,
  faqs = [],
  cta = {},
  onCommentAdded,
  metaTitle,
  metaDescription,
  metaKeywords,
  isMembersOnly = false,
  isPremium = false,
  isPremiumLocked = false,
  creditsRequired = 0,
  blogSlug = "",
  onPaymentSuccess,
  relatedBlogs = [],
  co_authors = [],
}) => {
  const { isLoggedIn } = useMemberAuth();
  const progressBarRef = useRef(null);
  const metaRowRef = useRef(null);
  const [isSticky, setIsSticky] = useState(false);
  const currentUrl = window.location.href;

  const cleanAuthorImage = (author_image && author_image.trim().toUpperCase() !== "NULL" && author_image.trim() !== "") 
    ? author_image.trim() 
    : "https://placehold.co/100x100?text=Author";

  // ProgressBar Logic

  // Compute Previous and Next Posts - Disabled for now as we are 100% DB driven
  const prevPost = null;
  const nextPost = null;

  // Format date correctly e.g., "January 28, 2026"
  const formatDateForm = (dateString) => {
    if (!dateString) return "October 16, 2025";
    try {
      // Append Z to treat as UTC, then toLocaleDateString converts to user's local time
      const d = new Date(
        dateString.includes("T")
          ? dateString
          : dateString.replace(" ", "T") + "Z",
      );
      if (isNaN(d.getTime())) {
        // Fallback for YYYY-MM-DD
        const d2 = new Date(dateString + "T00:00:00Z");
        if (isNaN(d2.getTime())) return dateString;
        return d2.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  useEffect(() => {
    // Animate Progress Bar
    if (progressBarRef.current) {
      gsap.to(progressBarRef.current, {
        width: "100%",
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.3,
        },
      });
    }
  }, [blogId, title]);

  useEffect(() => {
    if (!metaRowRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" }
    );
    observer.observe(metaRowRef.current);
    return () => observer.disconnect();
  }, []);

  // JSON-LD Schema Construction
  const schemaData = useMemo(() => {
    const domain = VITE_SITE_URL;
    const absoluteImage = image
      ? image.startsWith("http")
        ? image
        : `${domain}${image.startsWith("/") ? "" : "/"}${image}`
      : `${domain}/assets/sapsecurityexpert-black.png`;

    const authorSlug = author_name.replace(/\s+/g, "-").toLowerCase();
    const authorSameAs = [
      `${domain}/contributor/${authorSlug}`,
      ...(author_linkedin ? [author_linkedin] : []),
      ...(author_twitter ? [author_twitter] : []),
      ...(author_website ? [author_website] : []),
    ];

    const graph = [
      // WebPage — root node that ties everything together
      {
        "@type": "WebPage",
        "@id": currentUrl,
        url: currentUrl,
        name: title,
        description: metaDescription || title,
        inLanguage: "en-US",
        isPartOf: { "@id": `${domain}/#website` },
        breadcrumb: { "@id": `${currentUrl}#breadcrumb` },
        primaryImageOfPage: { "@id": `${currentUrl}#primaryimage` },
      },

      // Primary image
      {
        "@type": "ImageObject",
        "@id": `${currentUrl}#primaryimage`,
        url: absoluteImage,
        contentUrl: absoluteImage,
      },

      // BreadcrumbList — matches the visual breadcrumbs on the page
      {
        "@type": "BreadcrumbList",
        "@id": `${currentUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: domain,
          },
          ...(category
            ? [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: CATEGORY_LABELS[category] || category,
                  item: `${domain}/${category}`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: title,
                  item: currentUrl,
                },
              ]
            : [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: title,
                  item: currentUrl,
                },
              ]),
        ],
      },

      // BlogPosting — the article itself
      {
        "@type": "BlogPosting",
        "@id": `${currentUrl}#article`,
        headline: title,
        description: metaDescription || title,
        image: absoluteImage,
        datePublished: date,
        dateModified: date,
        inLanguage: "en-US",
        url: currentUrl,
        mainEntityOfPage: { "@id": currentUrl },
        ...(category ? { articleSection: CATEGORY_LABELS[category] || category } : {}),
        ...(metaKeywords ? { keywords: metaKeywords } : {}),
        author: {
          "@type": "Person",
          "@id": `${domain}/contributor/${authorSlug}`,
          name: author_name,
          url: `${domain}/contributor/${authorSlug}`,
          ...(authorSameAs.length > 1 ? { sameAs: authorSameAs } : {}),
          ...(author_image ? { image: { "@type": "ImageObject", url: author_image } } : {}),
        },
        publisher: {
          "@type": "Organization",
          "@id": `${domain}/#organization`,
          name: "SAP Security Expert",
          url: domain,
          logo: {
            "@type": "ImageObject",
            url: `${domain}/assets/sapsecurityexpert-black.png`,
          },
        },
        isPartOf: { "@id": currentUrl },
      },

      // Website node
      {
        "@type": "WebSite",
        "@id": `${domain}/#website`,
        url: domain,
        name: "SAP Security Expert",
        publisher: { "@id": `${domain}/#organization` },
      },
    ];

    if (faqs && Array.isArray(faqs) && faqs.length > 0) {
      graph.push({
        "@type": "FAQPage",
        "@id": `${currentUrl}#faq`,
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      });
    }

    return { "@context": "https://schema.org", "@graph": graph };
  }, [title, image, date, author_name, author_linkedin, author_twitter, author_website, author_image, category, metaDescription, metaKeywords, faqs, currentUrl]);

  const categoryLabel = CATEGORY_LABELS[category] || category;

  return (
    <div className="blog-post-wrapper">
      {/* Sticky Post Header */}
      <div className={`blog-sticky-header${isSticky ? " blog-sticky-header--visible" : ""}`}>
        <div className="blog-sticky-inner">
          <nav className="blog-sticky-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right"></i></span>
            {category && (
              <>
                <Link to={`/${category}`} className="breadcrumb-link">{categoryLabel}</Link>
                <span className="breadcrumb-sep"><i className="bi bi-chevron-right"></i></span>
              </>
            )}
            <span className="breadcrumb-current">{title}</span>
          </nav>

          <div className="blog-sticky-meta">
            <span className="meta-author">{author_name},</span>
            <span className="meta-date" style={{ marginLeft: "5px" }}>{formatDateForm(date)}</span>
            <span className="meta-dot">•</span>
            <span className="meta-read-time"><i className="bi bi-clock"></i> 5 min read</span>
            <span className="meta-dot">•</span>
            <span className="meta-views"><i className="bi bi-eye"></i> {viewCount}</span>
            <span className="meta-dot">•</span>
            <span className="meta-comments"><i className="bi bi-chat"></i> {commentCount} Comments</span>
          </div>

          <div className="blog-sticky-actions">
            <ShareButton title={title} url={currentUrl} />
          </div>
        </div>
      </div>
      <SEO
        title={metaTitle || title}
        description={
          metaDescription ||
          `${title} - Written by ${author_name || "SAP Security Expert"}. Read more on SAP Security Expert.`
        }
        image={image}
        url={currentUrl}
        type="article"
        author={author_name}
        keywords={
          metaKeywords || `SAP Security, ${title}, ${author_name}, SAP Blog`
        }
        schemaData={schemaData}
      />
      {/* Reading Progress Bar */}
      {/* <div className="reading-progress-bar" ref={progressBarRef}></div> */}

      <div className="container blog-container">
        {/* Main Content Column */}
        <main className="blog-main-column">
          {/* 1. Featured Image (Top) */}
          <div className="blog-featured-image">
            <Image
              src={image || "https://placehold.co/600x400?text=No+Image"}
              alt={image_alt || title}
              width={1200}
              height={675}
              style={{ display: "block", width: "100%", height: "auto", objectFit: "cover" }}
              priority
            />
          </div>

          {/* 2. Breadcrumbs */}
          {category && (
            <nav className="blog-breadcrumb" aria-label="Breadcrumb">
              <Link to="/" className="breadcrumb-link">Home</Link>
              <span className="breadcrumb-sep">
                <i className="bi bi-chevron-right"></i>
              </span>
              <Link to={`/${category}`} className="breadcrumb-link">
                {CATEGORY_LABELS[category] || category}
              </Link>
              <span className="breadcrumb-sep">
                <i className="bi bi-chevron-right"></i>
              </span>
              <span className="breadcrumb-current">{title}</span>
            </nav>
          )}

          {/* 3. Meta Row: Author, Date, Views */}
          <div className="blog-meta-row" ref={metaRowRef}>
            <div className="meta-left">
              <span className="meta-author">
                {author_name || "Raghu Boddu"},
              </span>
              <span className="meta-date" style={{ marginLeft: "5px" }}>
                {formatDateForm(date)}
              </span>
              <span className="meta-dot">•</span>
              <span className="meta-read-time">
                <i className="bi bi-clock"></i> 5 min read
              </span>
              <span className="meta-dot">•</span>
              <span className="meta-views">
                <i className="bi bi-eye"></i> {viewCount}
              </span>
              <span className="meta-dot">•</span>
              <span className="meta-comments">
                <i className="bi bi-chat"></i> {commentCount} Comments
              </span>
            </div>

            <div className="meta-right">
              <ShareButton title={title} url={currentUrl} />
            </div>
          </div>

          {/* 4. Title */}
          {isMembersOnly && (
            <div className="exclusive-badge-full">
              <i className="bi bi-lock-fill"></i> Exclusive Members-Only Content
            </div>
          )}
          {isPremium && (
            <div className="exclusive-badge-full" style={{ background: "linear-gradient(135deg,#92400e,#d97706)", borderColor: "#d97706" }}>
              <i className="bi bi-star-fill"></i> Premium Article — Paid Members Only
            </div>
          )}
          <h1 className="blog-title">{title}</h1>

          {/* 5. Content Body — premium gate always wins over members-only gate */}
          {isPremiumLocked ? (
            <PremiumPaywall creditsRequired={creditsRequired} blogSlug={blogSlug} onSuccess={onPaymentSuccess} />
          ) : isMembersOnly ? (
            <MembersOnlyPaywall>
              <article className="blog-content-body">{content}</article>
            </MembersOnlyPaywall>
          ) : (
            <article className="blog-content-body">{content}</article>
          )}

          {/* FAQS SECTION (Hidden for exclusive/premium posts for guests) */}
          {faqs && faqs.length > 0 && (!isMembersOnly || isLoggedIn) && !isPremiumLocked && (
            <div
              className="blog-faqs-section"
              style={{ marginTop: "40px", marginBottom: "40px" }}
            >
              <FAQ title="Frequently Asked Questions" faqs={faqs} />
            </div>
          )}

          {/* CTA SECTION (Hidden for exclusive/premium posts for guests) */}
          {cta && cta.title && (!isMembersOnly || isLoggedIn) && !isPremiumLocked && (
            <div
              className="blog-cta-section"
              style={{
                background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                color: "white",
                padding: "40px",
                borderRadius: "16px",
                textAlign: "center",
                margin: "40px 0",
                boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)",
              }}
            >
              <h2
                style={{
                  fontSize: "1.8rem",
                  marginBottom: "16px",
                  color: "white",
                }}
              >
                {cta.title}
              </h2>
              {cta.description && (
                <p
                  style={{
                    fontSize: "1.1rem",
                    marginBottom: "24px",
                    opacity: 0.9,
                  }}
                >
                  {cta.description}
                </p>
              )}
              {cta.buttonText && cta.buttonLink && (
                <a
                  href={cta.buttonLink}
                  className="btn-cta"
                  style={{
                    display: "inline-block",
                    background: "white",
                    color: "#1e40af",
                    padding: "12px 32px",
                    borderRadius: "50px",
                    fontWeight: "bold",
                    textDecoration: "none",
                    transition: "transform 0.2s",
                  }}
                  onMouseOver={(e) =>
                    (e.target.style.transform = "scale(1.05)")
                  }
                  onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
                >
                  {cta.buttonText}
                </a>
              )}
            </div>
          )}

          <div className="post-footer-divider"></div>

          {/* ── Authors section ── */}
          {(!isMembersOnly || isLoggedIn) && !isPremiumLocked && (
            author_name ? (
              <div className="bl-authors-section">
                <p className="bl-authors-label">
                  {co_authors && co_authors.length > 0 ? "" : "About the author"}
                </p>
                <div className="bl-authors-grid" style={(!co_authors || co_authors.length === 0) ? { gridTemplateColumns: '1fr' } : undefined}>
                  {/* Primary author */}
                  <div className="bl-author-card bl-author-card--primary">
                    <div className="bl-author-card__left">
                      <Image
                        src={cleanAuthorImage}
                        alt={author_name}
                        width={64}
                        height={64}
                        className="bl-author-avatar"
                        onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100?text=Author"; }}
                      />
                      <span className="bl-author-role-badge bl-author-role-badge--author">Author</span>
                    </div>
                    <div className="bl-author-card__body">
                      <h3 className="bl-author-name">{author_name}</h3>
                      {author_designation && <p className="bl-author-designation">{author_designation}</p>}
                      <p className="bl-author-bio">{author_bio || "Expert SAP Security contributor."}</p>
                      {(author_linkedin || author_twitter || author_website) && (
                        <div className="bl-author-socials">
                          {author_linkedin && (
                            <a href={author_linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="bl-social-link bl-social-link--linkedin">
                              <FaLinkedin size={15} />
                            </a>
                          )}
                          {author_twitter && (
                            <a href={author_twitter} target="_blank" rel="noopener noreferrer" title="Twitter / X" className="bl-social-link bl-social-link--twitter">
                              <FaXTwitter size={15} />
                            </a>
                          )}
                          {author_website && (
                            <a href={author_website} target="_blank" rel="noopener noreferrer" title="Website" className="bl-social-link bl-social-link--web">
                              <FaGlobe size={15} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Co-author cards */}
                  {co_authors && co_authors.map((ca, idx) => {
                    const caImg = ca.image ? ca.image.trim() : "";
                    const cleanCaImg = caImg === "" || caImg.toUpperCase() === "NULL" ? null : caImg;
                    return (
                      <div key={ca.id || idx} className="bl-author-card bl-author-card--coauthor">
                        <div className="bl-author-card__left">
                          <Image
                            src={cleanCaImg || "https://placehold.co/100x100?text=Author"}
                            alt={ca.name || "Co-author"}
                            width={64}
                            height={64}
                            className="bl-author-avatar"
                            onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100?text=Author"; }}
                          />
                          <span className="bl-author-role-badge bl-author-role-badge--coauthor">Co-author</span>
                        </div>
                        <div className="bl-author-card__body">
                          <h3 className="bl-author-name">{ca.name}</h3>
                          {ca.designation && <p className="bl-author-designation">{ca.designation}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Absolute Fallback
              <AuthorProfile authorId="raghu_boddu" />
            )
          )}

          {/* Dynamic Comment Section (Hidden for exclusive/premium posts for guests) */}
          {(!isMembersOnly || isLoggedIn) && !isPremiumLocked && (
            <CommentSection blogId={blogId} onCommentAdded={onCommentAdded} />
          )}

          {/* Navigation (Previous/Next) */}
          <div className="post-navigation">
            <div className="nav-prev">
              {prevPost && (
                <>
                  <span>&larr; PREVIOUS</span>
                  <Link to={`/${prevPost.category}/${prevPost.slug}`}>
                    {prevPost.title}
                  </Link>
                </>
              )}
            </div>
            <div className="nav-next">
              {nextPost && (
                <>
                  <span>NEXT &rarr;</span>
                  <Link to={`/${nextPost.category}/${nextPost.slug}`}>
                    {nextPost.title}
                  </Link>
                </>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <div className="blog-sidebar-column">
          <BlogSidebar sidebarAd={sidebarAd} relatedBlogs={relatedBlogs} />
        </div>
      </div>
    </div>
  );
};

export default BlogLayout;
