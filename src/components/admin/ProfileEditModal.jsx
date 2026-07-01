import React, { useState, useEffect, useRef } from "react";
import { LuUser, LuMail, LuUpload, LuX, LuTriangleAlert } from "react-icons/lu";
import { getAdminProfile, updateAdminProfile } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import useScrollLock from "../../hooks/useScrollLock";

const ProfileEditModal = ({ isOpen, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    email: "",
    bio: "",
    designation: "",
    linkedin: "",
    twitter_handle: "",
    personal_website: "",
  });
  const [preview, setPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();
  const { role } = useAuth();
  const isContributor = role === "contributor";

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setError("");
      setImageFile(null);
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    setFetching(true);
    try {
      const res = await getAdminProfile();
      if (res.data.status === "success") {
        const {
          full_name,
          username,
          email,
          profile_image,
          bio,
          designation,
          linkedin,
          twitter_handle,
          personal_website,
        } = res.data.user;
        setFormData({
          full_name: full_name || "",
          username: username || "",
          email: email || "",
          bio: bio || "",
          designation: designation || "",
          linkedin: linkedin || "",
          twitter_handle: twitter_handle || "",
          personal_website: personal_website || "",
        });
        setPreview(profile_image || null);
      }
    } catch (err) {
      setError("Failed to load profile data. Please try again.");
    } finally {
      setFetching(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const data = new FormData();
    data.append("full_name", formData.full_name);
    data.append("username", formData.username);
    data.append("email", formData.email);
    data.append("bio", formData.bio);
    data.append("designation", formData.designation);
    data.append("linkedin", formData.linkedin);
    data.append("twitter_handle", formData.twitter_handle);
    data.append("personal_website", formData.personal_website);
    if (imageFile) data.append("profile_image", imageFile);

    try {
      const res = await updateAdminProfile(data);
      if (res.data.status === "success") {
        addToast("Profile updated successfully!", "success");
        if (onUpdate) onUpdate(res.data.profile_image);
        onClose();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Profile</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <LuX />
          </button>
        </div>

        <div className="modal-body" data-lenis-prevent="true">
          {fetching ? (
            <div className="modal-loading">Loading profile...</div>
          ) : (
            <form id="profile-edit-form" onSubmit={handleSubmit}>
              {error && (
                <div className="form-error">
                  <LuTriangleAlert /> {error}
                </div>
              )}

              <div className="profile-image-section">
                <div className="avatar-preview">
                  {preview ? (
                    <img src={preview} alt="Profile preview" />
                  ) : (
                    <div className="avatar-placeholder">
                      <LuUser />
                    </div>
                  )}
                  <label className="upload-badge" title="Change Photo">
                    <LuUpload />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                    />
                  </label>
                </div>
                <p className="image-help">
                  Square JPG, PNG or WebP — min 300×300px, max 2MB
                </p>
              </div>

              <div className="form-group">
                <label>
                  <LuUser /> Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="Username"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <LuUser /> Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="Your full name"
                  required
                  disabled={isContributor}
                  className={isContributor ? "disabled-input" : ""}
                  style={
                    isContributor ? { cursor: "not-allowed", opacity: 0.7 } : {}
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  <LuMail /> Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="your@email.com"
                  required
                  disabled={isContributor}
                  className={isContributor ? "disabled-input" : ""}
                  style={
                    isContributor ? { cursor: "not-allowed", opacity: 0.7 } : {}
                  }
                />
              </div>

              <div className="form-group">
                <label>Short Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  placeholder="A brief introduction about yourself..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) =>
                    setFormData({ ...formData, designation: e.target.value })
                  }
                  placeholder="e.g. SAP Security Consultant"
                />
              </div>

              <div className="form-group">
                <label>LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedin: e.target.value })
                  }
                  placeholder="https://linkedin.com/in/username"
                />
              </div>

              <div className="form-group">
                <label>Twitter/X Handle</label>
                <input
                  type="text"
                  value={formData.twitter_handle}
                  onChange={(e) =>
                    setFormData({ ...formData, twitter_handle: e.target.value })
                  }
                  placeholder="@username"
                />
              </div>

              <div className="form-group">
                <label>Personal Website / Blog</label>
                <input
                  type="url"
                  value={formData.personal_website}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personal_website: e.target.value,
                    })
                  }
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </form>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="profile-edit-form"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;
