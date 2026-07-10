import React, { useState } from "react";
import { createPortal } from "react-dom";
import { LuKey, LuLock, LuX, LuTriangleAlert } from "react-icons/lu";
import { resetAdminPassword } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import useScrollLock from "../../hooks/useScrollLock";

const ResetPasswordModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const { addToast } = useToast();

  useScrollLock(isOpen);

  const resetForm = () => {
    setFormData({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (formData.new_password.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }
    if (formData.new_password !== formData.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    if (formData.new_password === formData.current_password) {
      setError("New password cannot be the same as current password");
      return;
    }

    setLoading(true);
    try {
      const res = await resetAdminPassword(formData);
      if (res.data.status === "success") {
        addToast("Password updated successfully", "success");
        resetForm();
        onClose();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to reset password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="modal-container">
        <div className="modal-header">
          <h3>Reset Password</h3>
          <button
            className="close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            <LuX />
          </button>
        </div>

        <div className="modal-body" data-lenis-prevent="true">
          <form id="reset-password-form" onSubmit={handleSubmit}>
            {error && (
              <div className="form-error">
                <LuTriangleAlert /> {error}
              </div>
            )}

            <div className="form-group">
              <label>
                <LuLock /> Current Password
              </label>
              <input
                type="password"
                value={formData.current_password}
                onChange={(e) =>
                  setFormData({ ...formData, current_password: e.target.value })
                }
                placeholder="Enter your current password"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="form-group">
              <label>
                <LuKey /> New Password
              </label>
              <input
                type="password"
                value={formData.new_password}
                onChange={(e) =>
                  setFormData({ ...formData, new_password: e.target.value })
                }
                placeholder="Minimum 8 characters"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>
                <LuKey /> Confirm New Password
              </label>
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) =>
                  setFormData({ ...formData, confirm_password: e.target.value })
                }
                placeholder="Re-enter your new password"
                required
                autoComplete="new-password"
              />
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="reset-password-form"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ResetPasswordModal;
