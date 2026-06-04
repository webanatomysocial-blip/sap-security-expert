import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LuFileText } from "react-icons/lu";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import { useAuth } from "../../context/AuthContext";
import { getPendingBlogs, reviewBlog } from "../../services/api";
import BlogPreviewModal from "./BlogPreviewModal";
import ActionMenu from "./ActionMenu";
import TableScrollContainer from "./TableScrollContainer";
import "../../css/AdminDashboard.css";

/**
 * AdminBlogReview — Dedicated admin-only page for reviewing contributor blog submissions.
 * Route: /admin/blog-review
 * Redirects non-admins back to /admin.
 */
const AdminBlogReview = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [previewBlog, setPreviewBlog] = useState(null);
  const [recalculating, setRecalculating] = useState({});
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "rejected"
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  const { addToast } = useToast();
  const { openConfirm } = useConfirm();
  const { role, can } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Admins or those with can_review_blogs can access
    if (role && !can("can_review_blogs")) {
      navigate("/admin", { replace: true });
    }
  }, [role, can, navigate]);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPendingBlogs(activeTab);
      setBlogs(Array.isArray(res.data) ? res.data : []);
    } catch {
      addToast(`Failed to load ${activeTab} blogs.`, "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, addToast]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = (blog) => {
    openConfirm({
      title: "Approve Blog?",
      message: `Approve "${blog.title}" and publish it to the frontend?`,
      confirmText: "Approve",
      onConfirm: async () => {
        setReviewingId(blog.id);
        try {
          await reviewBlog(blog.id, "approve");
          addToast("Blog approved and published.", "success");
          setPreviewBlog(null);
          setBlogs((prev) => prev.filter((b) => b.id !== blog.id));
        } catch (err) {
          addToast(err.response?.data?.message || "Approval failed.", "error");
        } finally {
          setReviewingId(null);
        }
      },
    });
  };

  const getSeoLabel = (score) => {
    if (score >= 80) return "Good";
    if (score >= 60) return "Average";
    return "Poor";
  };

  const getScoreColor = (score) => {
    if (score >= 80) return { bg: "#dcfce7", text: "#166534" };
    if (score >= 60) return { bg: "#fef9c3", text: "#ca8a04" };
    return { bg: "#fee2e2", text: "#991b1b" };
  };

  const getPlagLabel = (score) => {
    if (score >= 95) return "Safe";
    if (score >= 85) return "Caution";
    return "Warning";
  };

  const getPlagColor = (score) => {
    if (score === null || score === undefined)
      return { bg: "#f1f5f9", text: "#64748b" };
    if (score >= 95) return { bg: "#dcfce7", text: "#166534" };
    if (score >= 85) return { bg: "#ffedd5", text: "#c2410c" };
    return { bg: "#fee2e2", text: "#991b1b" };
  };

  const handleRecalculate = async (blogId) => {
    setRecalculating((prev) => ({ ...prev, [blogId]: true }));
    try {
      const { recalculatePlagiarism } = await import("../../services/api");
      const res = await recalculatePlagiarism(blogId);
      if (res.data.status === "success") {
        const newScore = res.data.plagiarism_score;
        addToast("Plagiarism score updated.", "success");
        setBlogs((prev) =>
          prev.map((b) =>
            b.id === blogId ? { ...b, plagiarism_score: newScore } : b,
          ),
        );
      } else {
        addToast(res.data.message || "Failed to recalculate.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error during recalculation.", "error");
    } finally {
      setRecalculating((prev) => ({ ...prev, [blogId]: false }));
    }
  };

  const handleSaveAsDraft = (blog) => {
    openConfirm({
      title: "Move to Draft?",
      message: `Move "${blog.title}" back to draft? You can provide optional feedback for the author.`,
      confirmText: "Move to Draft",
      showInput: true,
      inputPlaceholder: "Feedback for author (optional)...",
      onConfirm: async (feedback) => {
        setReviewingId(blog.id);
        try {
          await reviewBlog(blog.id, "save_as_draft", feedback);
          addToast("Blog moved back to draft.", "success");
          setPreviewBlog(null);
          setBlogs((prev) => prev.filter((b) => b.id !== blog.id));
        } catch (err) {
          addToast(err.response?.data?.message || "Action failed.", "error");
        } finally {
          setReviewingId(null);
        }
      },
    });
  };


  const fmt = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const cap = (s) =>
    s ? s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

  return (
    <div className="admin-page-wrapper">
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Blog Review</h3>
          <p
            style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#64748b" }}
          >
            Contributor submissions awaiting admin review
          </p>
        </div>
        <div className="status-filter-tabs" style={{ margin: 0 }}>
          <button
            className={activeTab === "pending" ? "active" : ""}
            onClick={() => setActiveTab("pending")}
          >
            Pending Reviews
          </button>
          <button
            className={activeTab === "rejected" ? "active" : ""}
            onClick={() => setActiveTab("rejected")}
          >
            Rejected Content
          </button>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            className="btn-primary"
            onClick={fetchPending}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
      </div>

      <div className="admin-filter-bar" style={{ marginBottom: "20px", display: "flex", gap: "15px", alignItems: "center", background: "#fff", padding: "15px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <i className="bi bi-search" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}></i>
          <input
            type="text"
            placeholder="Search by title or author..."
            className="form-control"
            style={{ paddingLeft: "35px", width: "100%" }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="form-control"
          style={{ width: "200px" }}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          <option value="sap-grc">SAP GRC</option>
          <option value="sap-iag">IAM</option>
          <option value="sap-public-cloud">Cloud</option>
          <option value="sap-btp-security">Cybersecurity</option>
          <option value="podcasts">Expert Voices/Podcasts</option>
          <option value="expert-recommendations">Expert Recommendations</option>
        </select>
      </div>

      <div className="admin-card">
        {loading ? (
          <div
            style={{
              padding: "48px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "0.875rem",
            }}
          >
            Loading...
          </div>
        ) : blogs.length === 0 ? (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <LuFileText
              style={{ fontSize: 40, color: "#cbd5e1", marginBottom: 12 }}
            />
            <h3
              style={{ margin: "0 0 6px", color: "#334155", fontSize: "1rem" }}
            >
              {activeTab === "pending"
                ? "No Pending Submissions"
                : "No Rejected Content"}
            </h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.875rem" }}>
              {activeTab === "pending"
                ? "All contributor blogs have been reviewed."
                : "There are no rejected blogs to display."}
            </p>
          </div>
        ) : (
          <TableScrollContainer>
            <table
              className="admin-table"
            >
              <thead>
                <tr>
                  <th className="col-xxl text-left">Blog Title</th>
                  <th className="col-sm text-center">Cat</th>
                  <th className="col-md text-left">Author</th>
                  <th className="col-sm text-center">Status</th>
                  <th className="col-xs text-center">SEO</th>
                  <th className="col-xs text-center">Plag</th>
                  <th className="col-actions text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blogs
                  .filter((b) => {
                    const matchesSearch =
                      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (b.author_name || "").toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesCategory =
                      filterCategory === "All" || b.category === filterCategory;
                    return matchesSearch && matchesCategory;
                  })
                  .map((blog) => (
                  <tr key={blog.id}>
                    <td className="col-xxl text-left wrap-text">
                      <strong className="truncate-2" style={{ fontSize: "0.85rem" }}>{blog.title}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {fmt(blog.date)}
                      </div>
                    </td>
                    <td className="col-sm text-center" style={{ fontSize: "0.8rem" }}>{cap(blog.category)}</td>
                    <td className="col-md text-left wrap-text">
                      <div style={{ fontWeight: "500", fontSize: "0.8rem" }}>{blog.author_name || "Author"}</div>
                    </td>
                    <td className="col-sm text-center">
                      <span className={`status-badge status-${blog.submission_status}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                        {blog.submission_status === "edited" ? "Rev" : "New"}
                      </span>
                    </td>
                    <td className="col-xs text-center">
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          background: getScoreColor(blog.seo_score || 0).bg,
                          color: getScoreColor(blog.seo_score || 0).text,
                        }}
                        title={`${blog.seo_score}% - ${getSeoLabel(blog.seo_score || 0)}`}
                      >
                        {blog.seo_score || 0}
                      </span>
                    </td>
                    <td className="col-xs text-center">
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          background: getPlagColor(blog.plagiarism_score).bg,
                          color: getPlagColor(blog.plagiarism_score).text,
                        }}
                        title={
                          blog.plagiarism_score === -1
                            ? "Check Failed"
                            : blog.plagiarism_score > 0
                              ? `${blog.plagiarism_score}% - ${getPlagLabel(blog.plagiarism_score)}`
                              : "Not checked"
                        }
                      >
                        {recalculating[blog.id]
                          ? "..."
                          : blog.plagiarism_score === -1
                            ? "Fail"
                            : blog.plagiarism_score > 0
                              ? `${blog.plagiarism_score}%`
                              : "N/A"}
                      </span>
                    </td>
                    <td className="col-actions text-center">
                      <ActionMenu>
                        <button
                          className="action-menu-item"
                          onClick={() => setPreviewBlog(blog)}
                        >
                          <i className="bi bi-eye"></i> View & Review
                        </button>
                        <button
                          className="action-menu-item"
                          style={{ color: "var(--success-green)" }}
                          onClick={() => handleApprove(blog)}
                        >
                          <i className="bi bi-check-circle"></i> Approve
                        </button>
                        <button
                          className="action-menu-item"
                          style={{ color: "var(--slate-800)" }}
                          onClick={() => handleSaveAsDraft(blog)}
                        >
                          <i className="bi bi-file-earmark-diff"></i> Save as Draft
                        </button>
                        <button
                          className="action-menu-item"
                          onClick={() => handleRecalculate(blog.id)}
                          disabled={recalculating[blog.id]}
                        >
                          <i
                            className={`bi ${recalculating[blog.id] ? "bi-hourglass-split" : "bi-shield-check"}`}
                          ></i>{" "}
                          Check Plagiarism
                        </button>
                      </ActionMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollContainer>
        )}

        {!loading && blogs.length > 0 && (
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid #f1f5f9",
              fontSize: "0.8rem",
              color: "#94a3b8",
            }}
          >
            {blogs.length} submission{blogs.length !== 1 ? "s" : ""} pending
            review
          </div>
        )}
      </div>

      {previewBlog && (
        <BlogReviewModalWrapper
          blog={previewBlog}
          onClose={() => setPreviewBlog(null)}
          onApprove={() => handleApprove(previewBlog)}
          onSaveAsDraft={(feedback) => {
            setReviewingId(previewBlog.id);
            reviewBlog(previewBlog.id, "save_as_draft", feedback)
              .then(() => {
                addToast("Blog moved to draft.", "success");
                setBlogs((prev) => prev.filter((b) => b.id !== previewBlog.id));
                setPreviewBlog(null);
              })
              .catch((err) => {
                addToast(err.response?.data?.message || "Action failed.", "error");
              })
              .finally(() => {
                setReviewingId(null);
              });
          }}
          onReject={(reason) => {
            setReviewingId(previewBlog.id);
            reviewBlog(previewBlog.id, "reject", reason)
              .then(() => {
                addToast("Blog rejected successfully.", "success");
                setBlogs((prev) => prev.filter((b) => b.id !== previewBlog.id));
                setPreviewBlog(null);
              })
              .catch((err) => {
                addToast(
                  err.response?.data?.message || "Rejection failed.",
                  "error",
                );
              })
              .finally(() => {
                setReviewingId(null);
              });
          }}
          isReviewing={reviewingId === previewBlog.id}
        />
      )}
    </div>
  );
};

// Internal Modal Wrapper for Lenis management
const BlogReviewModalWrapper = ({
  blog,
  onClose,
  onApprove,
  onSaveAsDraft,
  onReject,
  isReviewing,
}) => {
  useEffect(() => {
    if (window.__lenis) window.__lenis.stop();
    return () => {
      if (window.__lenis) window.__lenis.start();
    };
  }, []);

  return (
    <BlogPreviewModal
      blog={blog}
      onClose={onClose}
      onApprove={onApprove}
      onSaveAsDraft={onSaveAsDraft}
      onReject={onReject}
      isReviewing={isReviewing}
    />
  );
};

export default AdminBlogReview;
