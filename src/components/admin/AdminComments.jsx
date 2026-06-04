import React, { useState, useEffect, useCallback } from "react";
// next-disabled: import "../../css/AdminDashboard.css";
import useScrollLock from "../../hooks/useScrollLock";
// import { API_BASE_URL } from "../../config";
import ActionMenu from "./ActionMenu";
import TableScrollContainer from "./TableScrollContainer";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import { getComments, updateComment } from "../../services/api";
import api from "../../services/api";
import { downloadCSV } from "../../services/exportUtils";

const AdminComments = () => {
  const [comments, setComments] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [rejectingComment, setRejectingComment] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [editText, setEditText] = useState("");
  const { addToast } = useToast();
  const { openConfirm } = useConfirm();

  useScrollLock(!!editingComment);

  const fetchCommentsData = useCallback(async () => {
    try {
      const res = await getComments();
      if (res.data) {
        setComments(res.data);
      }
    } catch (error) {
      console.error("Fetch comments failed", error);
      addToast("Failed to fetch comments", "error");
    }
  }, [addToast]);

  useEffect(() => {
    let isMounted = true;
    const loadComments = async () => {
      try {
        const res = await getComments();
        if (isMounted && res.data) {
          setComments(res.data);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Fetch comments failed", error);
          addToast("Failed to fetch comments", "error");
        }
      }
    };
    loadComments();
    return () => { isMounted = false; };
  }, [addToast]);

  const handleStatusChange = async (id, newStatus, rejection_reason = null) => {
    try {
      const res = await updateComment({
        id,
        status: newStatus,
        rejection_reason,
      });
      if (res.data.status === "success") {
        fetchCommentsData();
        setRejectingComment(null);
        setRejectReason("");
        addToast(`Comment ${newStatus} successfully`, "success");
      } else {
        addToast("Failed to update status", "error");
      }
    } catch (error) {
      console.error("Status update failed", error);
      addToast("Error updating status", "error");
    }
  };

  const handleEdit = (comment) => {
    setEditingComment(comment);
    setEditText(comment.text);
  };


  const handleSaveEdit = async () => {
    try {
      const res = await updateComment({
        id: editingComment.id,
        action: "edit",
        content: editText,
      });
      if (res.data.status === "success") {
        setEditingComment(null);
        setEditText("");
        fetchCommentsData();
        addToast("Comment updated successfully", "success");
      } else {
        addToast("Failed to update comment", "error");
      }
    } catch (error) {
      console.error("Edit failed", error);
      addToast("Error updating comment", "error");
    }
  };

  const handleDelete = (id) => {
    openConfirm({
      title: "Delete Comment?",
      message: "Are you sure you want to delete this comment?",
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await api.delete(`/admin/comments?id=${id}`);
          if (res.data.status === "success") {
            fetchCommentsData();
            addToast("Comment deleted successfully", "success");
          } else {
            addToast("Failed to delete comment", "error");
          }
        } catch (error) {
          console.error("Delete failed", error);
          addToast("Error deleting comment", "error");
        }
      },
    });
  };

  const filteredComments = comments.filter((c) => {
    const matchesFilter = filter === "all" || c.status === filter;
    const matchesSearch = 
      c.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.text.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const submitRejection = () => {
    if (!rejectReason.trim()) {
      setRejectError("Rejection reason is mandatory.");
      return;
    }
    handleStatusChange(rejectingComment.id, "rejected", rejectReason);
  };

  const handleExport = () => {
    const headers = [
      { label: "Author", key: "author" },
      { label: "Email", key: "email" },
      { label: "Comment", key: "text" },
      { label: "Post Slug", key: "slug" },
      { label: "Date", key: "date" },
      { label: "Status", key: "status" },
    ];
    downloadCSV(filteredComments, headers, "comments_list");
  };

  return (
    <div className="admin-page-wrapper">
      <div className="page-header">
        <h3>Comments</h3>
        <div className="status-filter-tabs" style={{ margin: 0 }}>
          <button
            className={`btn-filter ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            Pending
          </button>
          <button
            className={`btn-filter ${filter === "approved" ? "active" : ""}`}
            onClick={() => setFilter("approved")}
          >
            Approved
          </button>
          <button
            className={`btn-filter ${filter === "rejected" ? "active" : ""}`}
            onClick={() => setFilter("rejected")}
          >
            Rejected
          </button>
          <button
            className={`btn-filter ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div className="search-box">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Search author, email or comment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={handleExport} className="btn-filter" title="Export to CSV">
            <i className="bi bi-download"></i> Export
          </button>
          <button className="btn-primary" onClick={fetchCommentsData}>
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
      </div>

      <div className="admin-card">
        <TableScrollContainer>
          <table className="admin-table">
            <thead>
                <tr>
                  <th className="col-md text-left">Author</th>
                  <th className="col-auto text-left">Comment</th>
                  <th className="col-md text-left">Date</th>
                  <th className="col-sm text-center">Status</th>
                  <th className="col-actions text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
              {filteredComments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center">
                    No {filter !== "all" ? filter : ""} comments found
                  </td>
                </tr>
              ) : (
                filteredComments.map((comment) => (
                   <tr key={comment.id}>
                     <td className="col-md text-left wrap-text">
                       <div className="author-info" style={{ lineBreak: "anywhere" }}>
                         <span className="author-name" style={{ fontSize: "0.85rem", fontWeight: 600 }}>{comment.author}</span>
                         {comment.email && (
                           <span className="author-email" style={{ fontSize: "0.75rem", color: "#64748b" }} title={comment.email}>
                             {comment.email}
                           </span>
                         )}
                       </div>
                     </td>
                     <td className="col-auto text-left wrap-text">
                       {/* Target Post Link */}
                       <div style={{ marginBottom: "6px", fontSize: "0.75rem", color: "#64748b" }}>
                         <span style={{ fontWeight: 600 }}>Post: </span>
                         {comment.slug ? (
                           <a
                             href={`/blogs/${comment.slug}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="post-link"
                             title={comment.slug}
                             style={{ textDecoration: "underline", color: "#2563eb", fontWeight: 500 }}
                           >
                             {comment.slug}
                           </a>
                         ) : (
                           <span className="post-id-fallback">
                             ID: {comment.post_id}
                           </span>
                         )}
                       </div>

                       {comment.parent_id && (
                         <div
                           className="reply-context"
                           style={{
                             marginBottom: "6px",
                             padding: "4px 8px",
                             background: "var(--slate-50)",
                             borderLeft: "2px solid var(--slate-300)",
                             borderRadius: "4px",
                             fontSize: "0.75rem",
                             color: "var(--slate-500)",
                           }}
                         >
                           <span
                             style={{
                               fontWeight: 600,
                               color: "var(--slate-700)",
                             }}
                           >
                             Re:{" "}
                             {comment.parent_author ||
                               `#${comment.parent_id}`}
                             :{" "}
                           </span>
                           <span
                             title={comment.parent_text}
                             style={{ fontStyle: "italic" }}
                           >
                             {comment.parent_text
                               ? comment.parent_text.length > 30
                                 ? comment.parent_text.substring(0, 30) + "..."
                                 : comment.parent_text
                               : "Original..."}
                           </span>
                         </div>
                       )}
                       <div
                         className="wrap-text"
                         style={{ fontSize: "0.85rem", color: "var(--slate-700)" }}
                       >
                         {comment.text}
                       </div>
                       {comment.edited_at && (
                         <small className="edited-indicator" style={{ fontSize: "0.7rem" }}>
                           (Ed)
                         </small>
                       )}
                     </td>
                     <td className="col-md text-left">
                       <span className="comment-date" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                         {new Date(comment.date).toLocaleDateString("en-US", {
                           month: "short",
                           day: "numeric",
                           year: "numeric",
                         })}
                       </span>
                     </td>
                     <td className="col-sm text-center">
                       <span
                         className={`status-badge status-${comment.status || "pending"}`}
                         style={{ fontSize: "0.7rem", padding: "2px 6px" }}
                       >
                         {comment.status === "approved" ? "Active" : (comment.status === "pending" ? "Pnd" : "Rej")}
                       </span>
                     </td>
                    <td className="col-actions text-center">
                      <ActionMenu>
                        {comment.status !== "approved" && (
                          <button
                            className="action-menu-item"
                            onClick={() =>
                              handleStatusChange(comment.id, "approved")
                            }
                            style={{ color: "var(--success-green)" }}
                          >
                            <i className="bi bi-check-circle"></i> Approve
                          </button>
                        )}

                        {comment.status !== "approved" &&
                          comment.status !== "rejected" && (
                            <button
                              className="action-menu-item"
                              onClick={() => {
                                setRejectingComment(comment);
                                setRejectReason("");
                                setRejectError("");
                              }}
                              style={{ color: "var(--warning-yellow)" }}
                            >
                              <i className="bi bi-x-circle"></i> Reject
                            </button>
                          )}

                        <div className="action-menu-separator"></div>

                        <button
                          className="action-menu-item"
                          onClick={() => handleEdit(comment)}
                        >
                          <i className="bi bi-pencil-square"></i> View/Edit
                        </button>

                        <div className="action-menu-separator"></div>

                        <button
                          className="action-menu-item danger"
                          onClick={() => handleDelete(comment.id)}
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

      {/* Edit Modal */}
      {editingComment && (
        <div className="modal-overlay" onClick={() => setEditingComment(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Comment</h3>
              <button
                className="modal-close-btn"
                onClick={() => setEditingComment(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form
                id="edit-comment-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveEdit();
                }}
              >
                <div className="form-group">
                  <label className="form-label">
                    Author Info: <strong>{editingComment.author}</strong>{" "}
                    {editingComment.email && `<${editingComment.email}>`}
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">Target Post:</label>
                  {editingComment.slug ? (
                    <a
                      href={`/blogs/${editingComment.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="post-link"
                      style={{ display: "block", marginTop: "4px" }}
                    >
                      View Post: {editingComment.slug}
                    </a>
                  ) : (
                    <span className="post-id-fallback">
                      Internal ID: {editingComment.post_id}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Comment Text</label>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows="5"
                    className="form-control"
                  />
                </div>
                {editingComment.original_text && (
                  <div className="form-group">
                    <label className="form-label">Original Text</label>
                    <p
                      style={{
                        background: "#f3f4f6",
                        padding: "8px",
                        borderRadius: "4px",
                        fontSize: "0.9rem",
                      }}
                    >
                      {editingComment.original_text}
                    </p>
                  </div>
                )}

                {editingComment.status === "rejected" &&
                  editingComment.rejection_reason && (
                    <div
                      className="form-group"
                      style={{
                        background: "#fff1f2",
                        padding: "12px",
                        borderRadius: "6px",
                        border: "1px solid #fecaca",
                      }}
                    >
                      <label
                        className="form-label"
                        style={{ color: "#991b1b" }}
                      >
                        Rejection Reason
                      </label>
                      <p
                        style={{
                          margin: "4px 0 0",
                          color: "#b91c1c",
                          fontSize: "0.9rem",
                        }}
                      >
                        {editingComment.rejection_reason}
                      </p>
                    </div>
                  )}
              </form>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingComment(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-comment-form"
                className="btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingComment && (
        <div
          className="modal-overlay"
          onClick={() => setRejectingComment(null)}
        >
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "#991b1b" }}>Reject Comment</h3>
              <button
                className="modal-close-btn"
                onClick={() => setRejectingComment(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p
                style={{
                  color: "#64748b",
                  fontSize: "0.9rem",
                  marginBottom: "16px",
                }}
              >
                Provide a reason for rejecting this comment. Feedback helps
                maintain community standards.
              </p>
              <form
                id="reject-comment-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitRejection();
                }}
              >
                <div className="form-group">
                  <label>Rejection Reason (Mandatory)</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (e.target.value.trim()) setRejectError("");
                    }}
                    placeholder="e.g., Spam, offensive language, or irrelevant."
                    style={{
                      borderColor: rejectError ? "#ef4444" : "var(--slate-300)",
                    }}
                  />
                  {rejectError && (
                    <small
                      style={{
                        color: "#ef4444",
                        fontWeight: 600,
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      {rejectError}
                    </small>
                  )}
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRejectingComment(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="reject-comment-form"
                className="btn-danger"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminComments;
