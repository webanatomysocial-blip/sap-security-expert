import React, { useState } from "react";
import ActionMenu from "../ActionMenu";
import {
  recalculatePlagiarism,
  toggleExclusiveContent,
  togglePremiumContent,
} from "../../../services/api";
import { useToast } from "../../../context/ToastContext";
import TableScrollContainer from "../TableScrollContainer";
import { downloadCSV } from "../../../services/exportUtils";

const BlogList = ({
  blogs,
  setBlogs,
  onEdit,
  onDelete,
  formatDate,
  getScoreColor,
  isAdmin = false,
}) => {
  const [recalculating, setRecalculating] = useState({});
  const [togglingMap, setTogglingMap] = useState({});
  const { addToast } = useToast();

  const handleRecalculate = async (blogId) => {
    setRecalculating((prev) => ({ ...prev, [blogId]: true }));
    try {
      const res = await recalculatePlagiarism(blogId);
      if (res.data.status === "success") {
        const newScore = res.data.plagiarism_score;
        addToast("Plagiarism score updated successfully.", "success");
        setBlogs((prev) =>
          prev.map((b) =>
            b.id === blogId ? { ...b, plagiarism_score: newScore } : b,
          ),
        );
      } else {
        addToast(res.data.message || "Failed to recalculate.", "error");
        // Update local state to show 'Check Failed' if the score didn't change but the API reported error
        setBlogs((prev) =>
          prev.map((b) =>
            b.id === blogId ? { ...b, plagiarism_score: -1 } : b,
          ),
        );
      }
    } catch {
      addToast("Failed to recalculate plagiarism score.", "error");
      setBlogs((prev) =>
        prev.map((b) => (b.id === blogId ? { ...b, plagiarism_score: -1 } : b)),
      );
    } finally {
      setRecalculating((prev) => ({ ...prev, [blogId]: false }));
    }
  };

  const handleToggleExclusive = async (blog) => {
    const newVal = Number(blog.is_members_only) === 1 ? 0 : 1;
    setTogglingMap((prev) => ({ ...prev, [blog.id]: true }));
    try {
      const res = await toggleExclusiveContent({
        id: blog.id,
        is_members_only: newVal,
      });
      if (res.data?.status === "success") {
        addToast(
          `Exclusive content ${newVal ? "enabled" : "disabled"} successfully.`,
          "success",
        );
        setBlogs((prev) =>
          prev.map((b) =>
            b.id === blog.id ? { ...b, is_members_only: newVal } : b,
          ),
        );
      } else {
        addToast(
          res.data?.message || "Failed to update exclusive content",
          "error",
        );
      }
    } catch {
      addToast("Error updating exclusive content flag", "error");
    } finally {
      setTogglingMap((prev) => ({ ...prev, [blog.id]: false }));
    }
  };

  const handleTogglePremium = async (blog) => {
    const newVal = Number(blog.is_premium) === 1 ? 0 : 1;
    setTogglingMap((prev) => ({ ...prev, [`p_${blog.id}`]: true }));
    try {
      const res = await togglePremiumContent({ id: blog.id, is_premium: newVal });
      if (res.data?.status === "success") {
        addToast(`Premium ${newVal ? "enabled" : "disabled"}.`, "success");
        setBlogs((prev) =>
          prev.map((b) => b.id === blog.id ? { ...b, is_premium: newVal } : b)
        );
      } else {
        addToast(res.data?.message || "Failed to update premium flag", "error");
      }
    } catch {
      addToast("Error updating premium flag", "error");
    } finally {
      setTogglingMap((prev) => ({ ...prev, [`p_${blog.id}`]: false }));
    }
  };

  const handleExport = () => {
    const headers = [
      { label: "Title", key: "title" },
      { label: "Slug", key: "slug" },
      { label: "Status", key: "status" },
      { label: "Submission Status", key: "submission_status" },
      { label: "Date", key: "date" },
      { label: "Author", key: "author_name" },
      { label: "Category", key: "category" },
      { label: "SEO Score", key: "seo_score" },
      { label: "Plagiarism Score", key: "plagiarism_score" },
    ];
    downloadCSV(blogs, headers, "blogs_list");
  };

  return (
    <div className="admin-card">
      <div className="card-header-actions" style={{ padding: "16px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button onClick={handleExport} className="btn-filter" title="Export to CSV">
          <i className="bi bi-download"></i> Export
        </button>
      </div>
      <TableScrollContainer>
        <table className="admin-table">
          <thead>
            <tr>
              <th className="col-xxl text-left">Title</th>
              <th className="col-sm text-left">Slug</th>
              <th className="col-sm text-center">Status</th>
              <th className="col-md text-left">Updated</th>
              <th className="col-xs text-center">Exc</th>
              <th className="col-xs text-center" style={{ color: "#d97706" }}>★ Paid</th>
              <th className="col-xs text-center">SEO</th>
              <th className="col-xs text-center">Plag</th>
              <th className="col-actions text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {blogs.length === 0 ? (
              <tr>
                <td colSpan="7">No custom blogs found.</td>
              </tr>
            ) : (
              blogs.map((blog) => (
                <tr key={blog.id}>
                  <td className="col-xxl text-left wrap-text">
                    <strong className="truncate-2" style={{ fontSize: "0.85rem" }}>{blog.title}</strong>
                    {/* Status Badges */}
                    {blog.submission_status === "edited" && (
                      <span
                        className="pending-badge"
                        style={{
                          // marginLeft: "10px",
                          fontSize: "0.7rem",
                          padding: "2px 6px",
                          background: "#fef3c7",
                          color: "#d97706",
                        }}
                      >
                        Edited — Pending Approval
                      </span>
                    )}
                    {blog.submission_status === "submitted" && (
                      <span
                        className="pending-badge"
                        style={{
                          // marginLeft: "10px",
                          fontSize: "0.7rem",
                          padding: "2px 6px",
                        }}
                      >
                        Pending Approval
                      </span>
                    )}
                    {blog.submission_status === "rejected" && (
                      <div
                        style={{
                          marginTop: "8px",
                          fontSize: "0.8rem",
                          color: "#991b1b",
                          background: "#fff1f2",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid #fecaca",
                          width: "fit-content",
                          maxWidth: "350px",
                        }}
                      >
                        <span style={{ fontWeight: "bold" }}>Reason:</span>{" "}
                        {blog.rejection_feedback || "No feedback provided."}
                      </div>
                    )}
                  </td>
                  <td className="col-sm text-left no-wrap">
                    <code className="truncate-1" style={{ fontSize: "0.75rem", color: "#64748b", maxWidth: "80px" }}>
                      {blog.slug || "—"}
                    </code>
                  </td>
                  <td className="col-sm text-center">
                    {blog.status === "approved" ||
                    blog.status === "published" ? (
                      <span className="status-badge status-live" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>Live</span>
                    ) : blog.submission_status === "submitted" ||
                      blog.submission_status === "edited" ? (
                      <span className="status-badge status-pending" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>Pnd</span>
                    ) : (
                      <span className="status-badge status-draft" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>Drt</span>
                    )}
                  </td>
                  <td className="col-md text-left">
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--slate-500)",
                        fontWeight: "500",
                      }}
                    >
                      {formatDate(blog.date)}
                    </span>
                  </td>
                  <td className="col-xs text-center">
                    <label
                      className={`toggle-switch ${togglingMap[blog.id] ? "toggle-loading" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={Number(blog.is_members_only) === 1}
                        onChange={() => handleToggleExclusive(blog)}
                        disabled={togglingMap[blog.id]}
                      />
                      <span className="toggle-slider" style={{ transform: "scale(0.8)" }}></span>
                    </label>
                  </td>
                  <td className="col-xs text-center">
                    <label
                      className={`toggle-switch ${togglingMap[`p_${blog.id}`] ? "toggle-loading" : ""}`}
                      title={Number(blog.is_premium) === 1 ? "Paid — click to remove" : "Free — click to make paid"}
                    >
                      <input
                        type="checkbox"
                        checked={Number(blog.is_premium) === 1}
                        onChange={() => handleTogglePremium(blog)}
                        disabled={togglingMap[`p_${blog.id}`]}
                        style={{ accentColor: "#d97706" }}
                      />
                      <span className="toggle-slider" style={{ transform: "scale(0.8)", background: Number(blog.is_premium) === 1 ? "#d97706" : undefined }}></span>
                    </label>
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
                    >
                      {blog.seo_score || 0}
                    </span>
                  </td>
                  <td className="col-xs text-center">
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        background:
                          blog.plagiarism_score === -1
                            ? "#fee2e2"
                            : blog.plagiarism_score >= 95
                              ? "#dcfce7"
                              : blog.plagiarism_score >= 85
                                ? "#ffedd5"
                                : blog.plagiarism_score > 0
                                  ? "#fee2e2"
                                  : "#f1f5f9",
                        color:
                          blog.plagiarism_score === -1
                            ? "#991b1b"
                            : blog.plagiarism_score >= 95
                              ? "#166534"
                              : blog.plagiarism_score >= 85
                                ? "#c2410c"
                                : blog.plagiarism_score > 0
                                  ? "#991b1b"
                                  : "#64748b",
                      }}
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
                        onClick={() => onEdit(blog)}
                      >
                        <i className="bi bi-pencil-square"></i> Edit
                      </button>
                      <button
                        className="action-menu-item"
                        onClick={() => handleRecalculate(blog.id)}
                        disabled={recalculating[blog.id]}
                      >
                        <i
                          className={`bi ${recalculating[blog.id] ? "bi-hourglass-split" : "bi-shield-check"}`}
                        ></i>{" "}
                        {recalculating[blog.id]
                          ? "Recalculating..."
                          : "Recalculate Plagiarism"}
                      </button>
                      <div className="action-menu-separator"></div>
                      <button
                        className="action-menu-item danger"
                        onClick={() => onDelete(blog.id)}
                      >
                        <i className="bi bi-trash"></i> Delete
                      </button>
                    </ActionMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableScrollContainer>
    </div>
  );
};

export default BlogList;
