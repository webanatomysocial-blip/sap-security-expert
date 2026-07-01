import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  LuUser,
  LuPhone,
  LuMapPin,
  LuUpload,
  LuX,
  LuTriangleAlert,
  LuShieldCheck,
  LuKey,
  LuTrash2,
  LuCoins,
  LuEye,
} from "react-icons/lu";
import useScrollLock from "../hooks/useScrollLock";
import { updateMemberProfile } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useMemberAuth } from "../context/MemberAuthContext";

const MemberProfileModal = ({ isOpen, onClose, initialTab = "profile" }) => {
  const navigate = useNavigate();
  const { member, updateMember } = useMemberAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    location: "",
    company_name: "",
    job_role: "",
    receive_blog_emails: true,
  });
  const [preview, setPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [visibility, setVisibility] = useState({
    show_name: true,
    show_picture: true,
    show_company: false,
    show_email: false,
    show_stats: true,
    show_badges: true,
  });
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (member) {
        setFormData({
          name: member.name || "",
          phone: member.phone || "",
          location: member.location || "",
          company_name: member.company_name || "",
          job_role: member.job_role || "",
          receive_blog_emails: member.receive_blog_emails !== undefined ? (member.receive_blog_emails == 1) : false,
        });
        setPreview(member.profile_image || null);
        setError("");
        setImageFile(null);
        const defaultVis = { show_name: true, show_picture: true, show_company: false, show_email: false, show_stats: true, show_badges: true };
        try {
          const parsed = member.profile_visibility ? JSON.parse(member.profile_visibility) : {};
          setVisibility({ ...defaultVis, ...parsed });
        } catch {
          setVisibility(defaultVis);
        }
      }
    }
  }, [isOpen, member, initialTab]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be less than 2MB");
      return;
    }

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("phone", formData.phone);
    data.append("location", formData.location);
    data.append("company_name", formData.company_name);
    data.append("job_role", formData.job_role);
    data.append("receive_blog_emails", formData.receive_blog_emails);
    if (imageFile) {
      data.append("profile_image", imageFile);
    }
    if (member?.profile_image) {
      data.append("current_image", member.profile_image);
    }

    try {
      const res = await updateMemberProfile(data);
      if (res.data.status === "success") {
        addToast("Profile updated successfully", "success");
        updateMember(res.data.member);
        onClose();
      } else {
        setError(res.data.message || "Failed to update profile.");
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

  const openResetPassword = () => {
    onClose();
    // Use the event system established in the footer/header if needed, 
    // but here we can just dispatch a specific event or use Header's state via context if it existed.
    // Since Header has the state, we can use a custom event.
    window.dispatchEvent(new CustomEvent('open-reset-password'));
  };

  const openDeleteAccount = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('open-delete-account'));
  };

  const handleVisibilitySave = async () => {
    setVisibilitySaving(true);
    try {
      const data = new FormData();
      data.append("profile_visibility", JSON.stringify(visibility));
      // Include required name field so the update endpoint doesn't null it
      data.append("name", formData.name || member?.name || "");
      const res = await updateMemberProfile(data);
      if (res.data.status === "success") {
        addToast("Visibility settings saved", "success");
        updateMember(res.data.member);
      } else {
        addToast(res.data.message || "Failed to save visibility", "error");
      }
    } catch {
      addToast("Failed to save visibility settings", "error");
    } finally {
      setVisibilitySaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container profile-modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Account Settings</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <LuX />
          </button>
        </div>

        <div className="modal-tabs" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 20px' }}>
          <button 
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'profile' ? '600' : '400',
              color: activeTab === 'profile' ? '#1e293b' : '#64748b',
              borderBottom: activeTab === 'profile' ? '2px solid #ee5e42' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <LuUser size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Profile Info
          </button>
          <button 
            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'security' ? '600' : '400',
              color: activeTab === 'security' ? '#1e293b' : '#64748b',
              borderBottom: activeTab === 'security' ? '2px solid #ee5e42' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <LuShieldCheck size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Security & Privacy
          </button>
          <button
            className={`tab-btn ${activeTab === 'visibility' ? 'active' : ''}`}
            onClick={() => setActiveTab('visibility')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'visibility' ? '600' : '400',
              color: activeTab === 'visibility' ? '#1e293b' : '#64748b',
              borderBottom: activeTab === 'visibility' ? '2px solid #ee5e42' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <LuEye size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Visibility
          </button>
          <button
            className="tab-btn"
            onClick={() => { onClose(); navigate("/member/credits"); }}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              fontSize: '0.9rem',
              fontWeight: '400',
              color: '#64748b',
              borderBottom: '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <LuCoins size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Credits
          </button>
        </div>

        <div className="modal-body" data-lenis-prevent="true" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '24px' }}>
          {activeTab === 'visibility' ? (
            <div className="visibility-settings">
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
                Control what information is visible to others on your public profile.
              </p>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  Public Profile
                </h4>
                {[
                  { key: 'show_name',    label: 'Display my name' },
                  { key: 'show_picture', label: 'Display my profile picture' },
                  { key: 'show_company', label: 'Display company' },
                  { key: 'show_email',   label: 'Display email' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!visibility[key]}
                      onChange={(e) => setVisibility((v) => ({ ...v, [key]: e.target.checked }))}
                      style={{ width: '18px', height: '18px', accentColor: '#ee5e42', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '0.9rem', color: '#1e293b' }}>{label}</span>
                  </label>
                ))}
              </div>

              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  Activity & Achievements
                </h4>
                {[
                  { key: 'show_stats',  label: 'Show contribution statistics' },
                  { key: 'show_badges', label: 'Show badges' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!visibility[key]}
                      onChange={(e) => setVisibility((v) => ({ ...v, [key]: e.target.checked }))}
                      style={{ width: '18px', height: '18px', accentColor: '#ee5e42', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '0.9rem', color: '#1e293b' }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : activeTab === 'profile' ? (
            <form id="member-profile-form" onSubmit={handleSubmit}>
              {error && (
                <div className="form-error" style={{ marginBottom: "20px", padding: "12px", background: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <LuTriangleAlert /> {error}
                </div>
              )}

              <div className="profile-image-section" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
                <div className="avatar-preview" style={{ position: "relative", width: "90px", height: "90px", borderRadius: "50%", background: "#f8fafc", border: "2px solid #e2e8f0", display: "flex", alignItems: "center", justifyCenter: "center", overflow: "visible", marginBottom: "12px" }}>
                  {preview ? (
                    <img src={preview} alt="Profile" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <LuUser size={40} color="#cbd5e1" style={{ margin: 'auto' }} />
                  )}
                  <label className="upload-badge" style={{ position: "absolute", bottom: "2px", right: "2px", width: "28px", height: "28px", background: "#1e293b", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px solid white", fontSize: "12px" }}>
                    <LuUpload />
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png,image/webp" hidden />
                  </label>
                </div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>Recommended: Square JPG, PNG or WebP</p>
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Full Name</label>
                  <div style={{ position: "relative" }}>
                    <LuUser style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Full Name" required style={{ paddingLeft: "40px" }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div style={{ position: "relative" }}>
                    <LuPhone style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input type="tel" className="form-control" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone Number" style={{ paddingLeft: "40px" }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <div style={{ position: "relative" }}>
                    <LuMapPin style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input type="text" className="form-control" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="City, Country" style={{ paddingLeft: "40px" }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <div style={{ position: "relative" }}>
                    <i className="bi bi-building" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input type="text" className="form-control" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="Company Name" style={{ paddingLeft: "40px" }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Job Role</label>
                  <div style={{ position: "relative" }}>
                    <i className="bi bi-briefcase" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input type="text" className="form-control" value={formData.job_role} onChange={(e) => setFormData({ ...formData, job_role: e.target.value })} placeholder="Job Role" style={{ paddingLeft: "40px" }} />
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginTop: "8px" }}>
                  <label className="form-label" style={{ display: "flex", alignItems: "center", cursor: "pointer", fontWeight: "normal", color: "#1e293b" }}>
                    <input
                      type="checkbox"
                      name="receive_blog_emails"
                      checked={formData.receive_blog_emails}
                      onChange={(e) => setFormData({ ...formData, receive_blog_emails: e.target.checked })}
                      style={{ marginRight: "10px", width: "18px", height: "18px", accentColor: "#ee5e42" }}
                    />
                    Subscribe to receive the latest blog articles and updates via email
                  </label>
                </div>
              </div>
            </form>
          ) : (
            <div className="security-settings">
              <div className="settings-section" style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LuKey size={18} /> Password Settings
                </h4>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '16px' }}>
                  Keep your account secure by using a strong, unique password.
                </p>
                <button 
                  onClick={openResetPassword}
                  className="btn-outline"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '10px 20px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: '#fff',
                    color: '#1e293b',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <LuKey size={16} /> Change Password
                </button>
              </div>

              <div className="settings-section" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '32px' }}>
                <h4 style={{ fontSize: '1rem', color: '#dc2626', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LuTrash2 size={18} /> Delete Account
                </h4>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '16px' }}>
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button 
                  onClick={openDeleteAccount}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '10px 20px',
                    border: '1px solid #fee2e2',
                    borderRadius: '8px',
                    background: '#fff',
                    color: '#dc2626',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <LuTrash2 size={16} /> Delete my Account
                </button>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'profile' && (
          <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" className="btn-cancel" onClick={onClose} style={{ flex: 1, padding: '10px' }}>
              Cancel
            </button>
            <button form="member-profile-form" type="submit" disabled={loading} className="btn-primary" style={{ flex: 1, backgroundColor: "#ee5e42", padding: '10px' }}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
        {activeTab === 'visibility' && (
          <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" className="btn-cancel" onClick={onClose} style={{ flex: 1, padding: '10px' }}>
              Cancel
            </button>
            <button type="button" onClick={handleVisibilitySave} disabled={visibilitySaving} className="btn-primary" style={{ flex: 1, backgroundColor: "#ee5e42", padding: '10px' }}>
              {visibilitySaving ? "Saving..." : "Save Visibility"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default MemberProfileModal;
