import React from "react";
import { createPortal } from "react-dom";

const AnnouncementModal = ({
  isOpen,
  editingId,
  formData,
  handleChange,
  handleClose,
  handleSubmit,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingId ? "Edit Announcement" : "New Announcement"}</h3>
          <button className="modal-close-btn" onClick={handleClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <form id="announcement-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                maxLength={120}
                className="form-control"
              />
              <div
                style={{
                  fontSize: "0.75rem",
                  color:
                    (formData.title?.length || 0) >= 120
                      ? "var(--danger-red)"
                      : "var(--slate-500)",
                  textAlign: "right",
                  marginTop: "4px",
                }}
              >
                {formData.title?.length || 0} / 120
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Link (Optional)</label>
              <input
                type="url"
                name="link"
                value={formData.link || ""}
                onChange={handleChange}
                placeholder="https://..."
                className="form-control"
              />
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="announcement-form"
            className="btn-primary"
          >
            {editingId ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AnnouncementModal;
