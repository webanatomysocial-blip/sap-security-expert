import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
// next-disabled: import "../css/blog-post.css";
import { FiFacebook, FiLinkedin } from "react-icons/fi";
import ShareButton from "./ShareButton";
import SEO from "./SEO";

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

const PodLayout = ({
  category,
  title,
  content,
  image,
  recentPosts,
  sponsoredImage,
}) => {
  const progressBarRef = useRef(null);
  const headerRef = useRef(null);
  const currentUrl = window.location.href;

  useEffect(() => {
    // Animate Progress Bar width based on scroll
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
  }, []);

  return (
    <div className="pod-post-page">
      <SEO
        title={title}
        description={`${category} - ${title}`} // Simple description fallback
        image={image}
        url={currentUrl}
        type="article"
      />
      {/* Sticky Scroll Header */}
      <div
        className="pod-sticky-header visible"
        ref={headerRef}
        style={{ top: "80px" }}
      >
        <div className="pod-header-content">
          <div className="pod-header-title">
            {category}{" "}
            <span style={{ margin: "0 10px", color: "#ccc" }}>|</span> {title}
          </div>
          <div className="pod-header-actions">
            {/* Social Icons Placeholders */}
            <div className="social-icons-header">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  currentUrl,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on Facebook"
                className="social-link-header"
              >
                <FiFacebook size={24} />
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                  currentUrl,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on LinkedIn"
                className="social-link-header"
              >
                <FiLinkedin size={24} />
              </a>
            </div>
            <ShareButton url={currentUrl} title={title} />
          </div>
        </div>
        {/* Black Line Progress Bar */}
        <div className="scroll-progress-bar" ref={progressBarRef}></div>
      </div>

      <div className="pod-container">
        {/* Main Content */}
        <div className="pod-main-content">
          {/* Split Header: Title Left, Image Right */}
          <div className="pod-split-header">
            <div className="pod-title-section">
              <h1>{title}</h1>
            </div>
            <div className="pod-hero-img-container">
              <Image src={image} alt={title} width={600} height={400} style={{ width: "100%", height: "auto", objectFit: "cover" }} />
            </div>
          </div>

          <div className="pod-body">{content}</div>
        </div>

        {/* Sticky Sidebar */}
        <aside className="pod-sidebar">
          <div className="recent-posts">
            <h3>Recent posts</h3>
            {recentPosts &&
              recentPosts.map((post) => (
                <a
                  key={post.link}
                  href={post.link}
                  className="recent-post-item"
                >
                  {post.title}
                  <hr />
                </a>
              ))}
          </div>

          <div className="sponsored-card">
            <span className="sponsored-label">Sponsored</span>
            {sponsoredImage && (
              <a
                href="https://togglenow.com/services/mca-audit-trail/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image src={sponsoredImage} alt="Sponsored" width={300} height={250} style={{ width: "100%", height: "auto", objectFit: "cover" }} />
              </a>
            )}
            <div className="sponsored-text">
              <h4>
                Do you run your entire marketing department as one person?
              </h4>
              <p>Call the marketing hotline at MarketingHotline.com</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PodLayout;
