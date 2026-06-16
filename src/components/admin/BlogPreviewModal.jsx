import React, { useState, useEffect } from "react";
import { LuX, LuCalendar, LuTag, LuUser } from "react-icons/lu";

/**
 * BlogPreviewModal — Display a blog post's content and metadata for review.
 * 75% / 25% Two-column layout.
 */
const BlogPreviewModal = ({
  blog,
  onClose,
  onApprove,
  onSaveAsDraft,
  onReject,
  isReviewing,
}) => {
  const [rejectMode, setRejectMode] = useState(false);
  const [draftMode, setDraftMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  useEffect(() => {
    document.body.classList.add("modal-open");
    if (window.lenis) window.lenis.stop();
    return () => {
      document.body.classList.remove("modal-open");
      if (window.lenis) window.lenis.start();
    };
  }, []);

  if (!blog) return null;

  // Score label helpers
  const getSeoLabel = (score) => {
    if (score >= 80) return "Good";
    if (score >= 60) return "Average";
    return "Poor";
  };

  const getSeoColor = (score) => {
    if (score >= 80) return { bg: "#dcfce7", text: "#166534" };
    if (score >= 60) return { bg: "#fef9c3", text: "#854d0e" };
    return { bg: "#fee2e2", text: "#991b1b" };
  };

  const getPlagLabel = (score) => {
    if (!score || score <= 0) return "Not checked";
    if (score >= 95) return "Safe";
    if (score >= 85) return "Caution";
    return "Warning";
  };

  const getPlagColor = (score) => {
    if (!score || score <= 0) return { bg: "#f1f5f9", text: "#64748b" };
    if (score >= 95) return { bg: "#dcfce7", text: "#166534" };
    if (score >= 85) return { bg: "#ffedd5", text: "#c2410c" };
    return { bg: "#fee2e2", text: "#991b1b" };
  };

  // If the blog is an edited live version, show the draft fields instead of the live fields.
  const isEdited = blog.submission_status === "edited";
  const previewData = {
    ...blog,
    title: isEdited ? blog.draft_title || blog.title : blog.title,
    content: isEdited ? blog.draft_content || blog.content : blog.content,
    image: isEdited ? blog.draft_image || blog.image : blog.image,
    category: isEdited ? blog.draft_category || blog.category : blog.category,
    meta_title: isEdited
      ? blog.draft_meta_title || blog.meta_title
      : blog.meta_title,
    meta_description: isEdited
      ? blog.draft_meta_description || blog.meta_description
      : blog.meta_description,
    meta_keywords: isEdited
      ? blog.draft_meta_keywords || blog.meta_keywords
      : blog.meta_keywords,
    cta_title: isEdited
      ? blog.draft_cta_title || blog.cta_title
      : blog.cta_title,
    cta_description: isEdited
      ? blog.draft_cta_description || blog.cta_description
      : blog.cta_description,
    cta_button_text: isEdited
      ? blog.draft_cta_button_text || blog.cta_button_text
      : blog.cta_button_text,
    cta_button_link: isEdited
      ? blog.draft_cta_button_link || blog.cta_button_link
      : blog.cta_button_link,
  };

  const handleRejectClick = () => {
    if (!rejectMode) {
      setRejectMode(true);
      setDraftMode(false);
      return;
    }

    if (!rejectReason.trim()) {
      setRejectError("A rejection reason is mandatory.");
      return;
    }

    setRejectError("");
    onReject(rejectReason);
  };

  const handleDraftClick = () => {
    if (!draftMode) {
      setDraftMode(true);
      setRejectMode(false);
      return;
    }

    if (!rejectReason.trim()) {
      setRejectError("Feedback is mandatory to move back to draft.");
      return;
    }

    setRejectError("");
    onSaveAsDraft(rejectReason);
  };

  const seoScore = previewData.seo_score || 0;
  const seoCol = getSeoColor(seoScore);
  const plagScore = previewData.plagiarism_score;
  const plagCol = getPlagColor(plagScore);

  const authorName = previewData.author_name || "Guest Author";
  const authorImageSrc = (previewData.author_image || previewData.profile_image || "").trim();
  // Make the author image rendering more robust
  let finalAuthorImage = "https://placehold.co/100x100?text=Author";
  if (authorImageSrc && authorImageSrc.toUpperCase() !== "NULL") {
    if (authorImageSrc.startsWith("http")) {
      // Already an absolute URL — use as-is
      finalAuthorImage = authorImageSrc;
    } else if (authorImageSrc.includes("assets/")) {
      // Relative path — keep it relative so it resolves against current origin
      finalAuthorImage = authorImageSrc.replace(/^.*assets\//, "/assets/");
    } else if (authorImageSrc.includes("uploads/")) {
      // Relative upload path — Next.js proxies /uploads/* to Express in dev,
      // Apache serves them in production
      finalAuthorImage = authorImageSrc.replace(/^.*uploads\//, "/uploads/");
    } else {
      finalAuthorImage = authorImageSrc.startsWith("/") ? authorImageSrc : `/${authorImageSrc}`;
    }
  }
  const authorImage = finalAuthorImage;
  const authorBio =
    previewData.author_bio || "Expert SAP Security Contributor.";

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-container xlarge">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3>Review Submission: {previewData.title}</h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "0.85rem",
                color: "var(--slate-500)",
              }}
            >
              Please review the content, formatting, and SEO details before
              approving.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <LuX />
          </button>
        </div>

        {/* Two-Column Body */}
        <div
          className="modal-body"
          style={{
            display: "flex",
            padding: 0,
            overflow: "hidden", // Outer body doesn't scroll, inner columns do
          }}
        >
          <div
            className="review-modal-content"
            style={{ width: "100%", padding: "32px", overflowY: "auto" }}
            data-lenis-prevent
          >
            <div
              className="review-modal-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: "32px",
              }}
            >
              {/* Left Column */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "32px",
                }}
              >
                {/* Metadata / SEO Section */}
                <div
                  style={{
                    background: "#fff",
                    padding: "24px",
                    borderRadius: "16px",
                    border: "1px solid var(--slate-200)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 20px",
                      color: "var(--slate-900)",
                      fontSize: "1.1rem",
                      fontWeight: "700",
                    }}
                  >
                    SEO & Meta Information
                  </h4>
                  <div
                    style={{ display: "grid", gap: "20px", fontSize: "0.9rem" }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          color: "var(--slate-500)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: "6px",
                        }}
                      >
                        SEO Title
                      </label>
                      <div
                        style={{
                          padding: "12px",
                          background: "var(--slate-50)",
                          borderRadius: "8px",
                          border: "1px solid var(--slate-200)",
                          color: "var(--slate-900)",
                          fontWeight: "500",
                          wordBreak: "break-word",
                        }}
                      >
                        {previewData.meta_title || "Not provided"}
                      </div>
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          color: "var(--slate-500)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: "6px",
                        }}
                      >
                        Meta Description
                      </label>
                      <div
                        style={{
                          padding: "12px",
                          background: "var(--slate-50)",
                          borderRadius: "8px",
                          border: "1px solid var(--slate-200)",
                          color: "var(--slate-900)",
                          lineHeight: "1.5",
                          wordBreak: "break-word",
                        }}
                      >
                        {previewData.meta_description || "Not provided"}
                      </div>
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          color: "var(--slate-500)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: "6px",
                        }}
                      >
                        Focus Keywords
                      </label>
                      <div
                        style={{
                          padding: "12px",
                          background: "var(--slate-50)",
                          borderRadius: "8px",
                          border: "1px solid var(--slate-200)",
                          color: "var(--slate-900)",
                          wordBreak: "break-word",
                        }}
                      >
                        {previewData.meta_keywords || "Not provided"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Frontend Content Preview */}
                <div
                  style={{
                    background: "#fff",
                    padding: "48px",
                    borderRadius: "16px",
                    border: "1px solid var(--slate-200)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div
                    style={{
                      borderBottom: "1px dashed var(--slate-300)",
                      paddingBottom: "16px",
                      marginBottom: "32px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "1.5px",
                        color: "var(--slate-400)",
                        fontWeight: "800",
                      }}
                    >
                      Frontend Content Preview
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      borderRadius: 20,
                      overflow: "hidden",
                      marginBottom: 32,
                      background: "var(--slate-100)",
                      aspectRatio: "16/9",
                      boxShadow: "var(--shadow-md)",
                    }}
                  >
                    <img
                      src={
                        previewData.image ||
                        "https://placehold.co/600x400?text=No+Image"
                      }
                      alt={previewData.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 40 }}>
                    <h1
                      style={{
                        fontSize: "2.75rem",
                        fontWeight: 900,
                        color: "var(--slate-900)",
                        marginBottom: 20,
                        lineHeight: 1.1,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {previewData.title}
                    </h1>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 24,
                        color: "var(--slate-500)",
                        fontSize: "0.95rem",
                        fontWeight: "500",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <LuUser style={{ fontSize: 18 }} />
                        <span>{authorName}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <LuCalendar style={{ fontSize: 18 }} />
                        <span>
                          {new Date(blog.date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <LuTag style={{ fontSize: 18 }} />
                        <span
                          style={{
                            textTransform: "capitalize",
                            color: "var(--primary-color)",
                          }}
                        >
                          {previewData.category?.replace("-", " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="blog-preview-body ql-editor"
                    style={{
                      fontSize: "1.25rem",
                      lineHeight: 1.9,
                      color: "var(--slate-700)",
                      padding: 0,
                    }}
                    dangerouslySetInnerHTML={{ __html: previewData.content }}
                  />
                  {(previewData.cta_title || previewData.cta_button_text) && (
                    <div
                      style={{
                        marginTop: "60px",
                        padding: "40px",
                        background:
                          "linear-gradient(135deg, var(--slate-900) 0%, #000 100%)",
                        borderRadius: "20px",
                        textAlign: "center",
                        color: "#fff",
                        boxShadow: "var(--shadow-lg)",
                      }}
                    >
                      {previewData.cta_title && (
                        <h3
                          style={{
                            fontSize: "1.75rem",
                            marginBottom: "16px",
                            color: "#fff",
                            fontWeight: "800",
                          }}
                        >
                          {previewData.cta_title}
                        </h3>
                      )}
                      {previewData.cta_description && (
                        <p
                          style={{
                            color: "var(--slate-400)",
                            marginBottom: "32px",
                            fontSize: "1.1rem",
                            maxWidth: "600px",
                            margin: "0 auto 32px",
                          }}
                        >
                          {previewData.cta_description}
                        </p>
                      )}
                      {previewData.cta_button_text &&
                        previewData.cta_button_link && (
                          <a
                            href={previewData.cta_button_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                            style={{
                              display: "inline-block",
                              padding: "16px 36px",
                              textDecoration: "none",
                              borderRadius: "12px",
                              fontWeight: "700",
                              fontSize: "1.1rem",
                            }}
                          >
                            {previewData.cta_button_text}
                          </a>
                        )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "32px",
                }}
              >
                <div
                  className="author-profile-card"
                  style={{
                    background: "var(--slate-50)",
                    borderRadius: "12px",
                    padding: "24px",
                    border: "1px solid var(--slate-200)",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 20px",
                      color: "var(--slate-900)",
                      fontSize: "1rem",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Author Profile
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "100px",
                        height: "100px",
                        borderRadius: "50%",
                        background: "var(--slate-200)",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "var(--shadow-sm)",
                        border: "4px solid #fff",
                      }}
                    >
                      {authorImage &&
                      authorImage !==
                        "https://placehold.co/100x100?text=Author" ? (
                        <img
                          src={authorImage}
                          alt={authorName}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <LuUser
                          style={{
                            fontSize: "50px",
                            color: "var(--slate-400)",
                          }}
                        />
                      )}
                    </div>
                    <div>
                      <h5
                        style={{
                          margin: "0 0 4px",
                          fontSize: "1.25rem",
                          color: "var(--slate-900)",
                          fontWeight: "800",
                        }}
                      >
                        {authorName}
                      </h5>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.95rem",
                        color: "var(--slate-600)",
                        lineHeight: "1.6",
                      }}
                    >
                      {authorBio}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--slate-50)",
                    borderRadius: "20px",
                    padding: "24px",
                    border: "1px solid var(--slate-200)",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 20px",
                      color: "var(--slate-900)",
                      fontSize: "1rem",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Quality Metrics
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--slate-500)",
                          fontWeight: "700",
                        }}
                      >
                        SEO Score
                      </span>
                      <div
                        style={{
                          background: seoCol.bg,
                          color: seoCol.text,
                          padding: "6px 14px",
                          borderRadius: "20px",
                          fontSize: "0.85rem",
                          fontWeight: "800",
                        }}
                      >
                        {seoScore}/100
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--slate-500)",
                          fontWeight: "700",
                        }}
                      >
                        Plagiarism
                      </span>
                      <div
                        style={{
                          background: plagCol.bg,
                          color: plagCol.text,
                          padding: "6px 14px",
                          borderRadius: "20px",
                          fontSize: "0.85rem",
                          fontWeight: "800",
                        }}
                      >
                        {plagScore === -1 ? "FAILED" : `${plagScore}%`}
                      </div>
                    </div>
                  </div>
                </div>

                {previewData.rejection_feedback && (
                  <div
                    style={{
                      background: "#fff1f2",
                      borderRadius: "20px",
                      padding: "24px",
                      border: "1px solid #fecaca",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 12px",
                        color: "#991b1b",
                        fontSize: "1rem",
                        fontWeight: "800",
                      }}
                    >
                      Past Feedback
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.95rem",
                        color: "#b91c1c",
                        lineHeight: "1.6",
                        fontWeight: "500",
                      }}
                    >
                      {previewData.rejection_feedback}
                    </p>
                  </div>
                )}

                {(rejectMode || draftMode) && (
                  <div
                    style={{
                      background: draftMode ? "#f0f9ff" : "#fee2e2",
                      border: draftMode ? "2px solid #bae6fd" : "2px solid #fca5a5",
                      borderRadius: "20px",
                      padding: "24px",
                      animation: "modalFadeIn 0.3s ease-out",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 8px",
                        color: draftMode ? "#0369a1" : "#991b1b",
                        fontSize: "1rem",
                        fontWeight: "800",
                      }}
                    >
                      {draftMode ? "Draft Feedback" : "Rejection Reasons"}
                    </h4>
                    <p
                      style={{
                        margin: "0 0 16px",
                        fontSize: "0.85rem",
                        color: draftMode ? "var(--slate-600)" : "#b91c1c",
                        fontWeight: "500",
                      }}
                    >
                      {draftMode
                        ? "Explain what needs to be changed before the blog can be approved."
                        : "Provide detailed feedback to help the author improve the post."}
                    </p>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => {
                        setRejectReason(e.target.value);
                        if (e.target.value.trim()) setRejectError("");
                      }}
                      placeholder="Enter rejection reasons or requested changes..."
                      className="form-control"
                      style={{
                        minHeight: "120px",
                        borderColor: rejectError
                          ? "#ef4444"
                          : draftMode
                            ? "var(--primary-color)"
                            : "#fca5a5",
                      }}
                      autoFocus
                    />
                    {rejectError && (
                      <p
                        style={{
                          color: "#ef4444",
                          fontSize: "0.85rem",
                          margin: "8px 0 0",
                          fontWeight: "700",
                        }}
                      >
                        {rejectError}
                      </p>
                    )}
                  </div>
                )}
                {(rejectMode || draftMode) && (
                  <button
                    className="btn-secondary btn-md"
                    onClick={() => {
                      setRejectMode(false);
                      setDraftMode(false);
                      setRejectError("");
                    }}
                    style={{ width: "100%", marginTop: "-16px" }}
                  >
                    Cancel Action
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="modal-footer">
          <button
            className="btn-secondary btn-md"
            onClick={onClose}
            disabled={isReviewing}
          >
            Close
          </button>          {previewData.submission_status !== "rejected" && !draftMode && (
            <button
              className="btn-danger btn-md"
              onClick={handleRejectClick}
              disabled={isReviewing}
              style={{ minWidth: "120px" }}
            >
              {isReviewing && rejectMode
                ? "Rejecting..."
                : rejectMode
                  ? "Confirm Rejection"
                  : "Reject"}
            </button>
          )}

          {!rejectMode && (
            <button
              className="btn-primary btn-md"
              onClick={handleDraftClick}
              disabled={isReviewing}
              style={{ minWidth: "120px" }}
            >
              {isReviewing && draftMode
                ? "Saving..."
                : draftMode
                  ? "Confirm Move to Draft"
                  : "Move to Draft"}
            </button>
          )}

          {!rejectMode && !draftMode && (
            <button
              className="btn-success btn-md"
              onClick={onApprove}
              disabled={isReviewing}
              style={{ minWidth: "120px" }}
            >
              {isReviewing ? "Approving..." : "Approve"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogPreviewModal;
