import React, { useEffect, useRef, useMemo } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import Image from "next/image";
// next-disabled: import "../css/blog-post.css";
import { FaLinkedin, FaXTwitter, FaInstagram, FaGlobe } from "react-icons/fa6";
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

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

const BlogLayout = ({
  blogId,
  title,
  content,
  image,
  date,
  author_name = "Guest Author", // Standardized Author Name
  author_image,
  author_bio,
  author_designation,
  author_linkedin,
  author_twitter,
  author_website,
  sidebarAd = {}, // Sidebar ad data
  dynamicRecentPosts = [], // New prop for passing recent posts if available
  viewCount = 0,
  commentCount = 0,
  faqs = [],
  cta = {},
  onCommentAdded,
  metaTitle,
  metaDescription,
  metaKeywords,
  isMembersOnly = false,
  relatedBlogs = [],
}) => {
  const { isLoggedIn } = useMemberAuth();
  const progressBarRef = useRef(null);
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

  // JSON-LD Schema Construction
  const schemaData = useMemo(() => {
    const domain = VITE_SITE_URL;
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting", // More specific than Article
      headline: title,
      image: [
        image
          ? image.startsWith("http")
            ? image
            : `${domain}${image.startsWith("/") ? "" : "/"}${image}`
          : `${domain}/assets/sapsecurityexpert-black.png`,
      ],
      datePublished: date,
      dateModified: date,
      author: {
        "@type": "Person",
        name: author_name,
        url: `${domain}/contributor/${author_name.replace(/\s+/g, "-").toLowerCase()}`,
      },
      publisher: {
        "@type": "Organization",
        name: "SAP Security Expert",
        logo: {
          "@type": "ImageObject",
          url: `${domain}/assets/sapsecurityexpert-black.png`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": currentUrl,
      },
      description: metaDescription || title,
    };

    const schemas = [articleSchema];

    if (faqs && Array.isArray(faqs) && faqs.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      });
    }

    return schemas;
  }, [title, image, date, author_name, metaDescription, faqs, currentUrl]);

  return (
    <div className="blog-post-wrapper">
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
              alt={title}
              width={1200}
              height={675}
              style={{ display: "block", width: "100%", height: "auto", objectFit: "cover" }}
              priority
            />
          </div>

          {/* 3. Meta Row: Author, Date, Views */}
          <div className="blog-meta-row">
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
          <h1 className="blog-title">{title}</h1>

          {/* 5. Content Body — gated behind paywall for members-only blogs */}
          {isMembersOnly ? (
            <MembersOnlyPaywall>
              <article className="blog-content-body">{content}</article>
            </MembersOnlyPaywall>
          ) : (
            <article className="blog-content-body">{content}</article>
          )}

          {/* FAQS SECTION (Hidden for exclusive posts for guests) */}
          {faqs && faqs.length > 0 && (!isMembersOnly || isLoggedIn) && (
            <div
              className="blog-faqs-section"
              style={{ marginTop: "40px", marginBottom: "40px" }}
            >
              <FAQ title="Frequently Asked Questions" faqs={faqs} />
            </div>
          )}

          {/* CTA SECTION (Hidden for exclusive posts for guests - replaced by White Box) */}
          {cta && cta.title && (!isMembersOnly || isLoggedIn) && (
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

          {/* Dynamic Author Profile Card (Hidden for exclusive posts for guests) */}
          {(!isMembersOnly || isLoggedIn) &&
            (author_name ? (
              <div
                className="author-profile-card"
                style={{
                  display: "flex",
                  gap: "20px",
                  padding: "30px",
                  background: "#f8fafc",
                  borderRadius: "16px",
                  marginTop: "40px",
                  border: "1px solid #e2e8f0",
                  alignItems: "start",
                }}
              >
                <Image
                  src={
                    cleanAuthorImage
                  }
                  alt={author_name}
                  width={80}
                  height={80}
                  style={{
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "4px solid #fff",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  onError={(e) => {
                    e.currentTarget.src = "https://placehold.co/100x100?text=Author";
                  }}
                />
                <div className="author-info">
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "1.25rem",
                      color: "#0f172a",
                    }}
                  >
                    {author_name}
                  </h3>
                  {author_designation && (
                    <p
                      style={{
                        margin: "-5px 0 10px 0",
                        fontSize: "0.9rem",
                        color: "#64748b",
                        fontWeight: "600",
                      }}
                    >
                      {author_designation}
                    </p>
                  )}
                  <p
                    style={{
                      margin: "0 0 16px 0",
                      color: "#475569",
                      lineHeight: "1.6",
                      fontSize: "0.95rem",
                    }}
                  >
                    {author_bio || "Expert SAP Security contributor."}
                  </p>
                  <div
                    className="author-socials"
                    style={{
                      display: "flex",
                      gap: "14px",
                      alignItems: "center",
                    }}
                  >
                    {author_linkedin && (
                      <a
                        href={author_linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="LinkedIn"
                        style={{
                          color: "#0077b5",
                          fontSize: "1.5rem",
                          lineHeight: 1,
                        }}
                      >
                        <FaLinkedin size={18} />
                      </a>
                    )}
                    {author_twitter && (
                      <a
                        href={author_twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Twitter / X"
                        style={{
                          color: "#000",
                          fontSize: "1.4rem",
                          lineHeight: 1,
                        }}
                      >
                        <FaXTwitter size={18} />
                      </a>
                    )}
                    {author_website && (
                      <a
                        href={author_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Website"
                        style={{
                          color: "#64748b",
                          fontSize: "1.4rem",
                          lineHeight: 1,
                        }}
                      >
                        <FaGlobe size={18} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Absolute Fallback
              <AuthorProfile authorId="raghu_boddu" />
            ))}

          {/* Dynamic Comment Section (Hidden for exclusive posts for guests) */}
          {(!isMembersOnly || isLoggedIn) && (
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
