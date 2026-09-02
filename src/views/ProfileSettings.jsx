import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LuUser,
  LuPhone,
  LuMapPin,
  LuUpload,
  LuTriangleAlert,
  LuShieldCheck,
  LuKey,
  LuTrash2,
  LuEye,
} from "react-icons/lu";
import { updateMemberProfile, getMemberAchievements, memberChangePassword } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useMemberAuth } from "../context/MemberAuthContext";
import ProfilePictureCropModal from "../components/ProfilePictureCropModal";
import { COUNTRIES, statesForCountry, citiesForCountry } from "../constants/countries";
import SearchableSelect from "../components/SearchableSelect";
import AmbassadorBadge from "../components/AmbassadorBadge";
import useGeoCountryLock from "../hooks/useGeoCountryLock";

const REPUTATION_CONFIG = {
  Contributor: {
    label: "Contributor",
    icon: "bi-patch-check-fill",
    color: "#ee5e42",
    bg: "#fff5f3",
    border: "#ffd5cc",
    desc: "Verified expert contributor to the SAP Security community",
  },
  Explorer: {
    label: "Explorer",
    icon: "bi-compass-fill",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    desc: "Active member of the SAP Security Expert community",
  },
  CountryAmbassador: {
    label: "Country Ambassador",
    icon: "bi-award-fill",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fde68a",
    desc: "Official SAP Security Expert representative for their country",
  },
};

function ReputationBadge({ level }) {
  const cfg = REPUTATION_CONFIG[level] || REPUTATION_CONFIG.Explorer;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      marginTop: "14px", padding: "10px 16px",
      background: cfg.bg, border: `1.5px solid ${cfg.border}`,
      borderRadius: "10px", width: "100%",
    }}>
      <i className={`bi ${cfg.icon}`} style={{ fontSize: "1.25rem", color: cfg.color, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontWeight: 700, fontSize: "0.875rem", color: cfg.color }}>{cfg.label}</span>
          <span style={{ fontSize: "0.7rem", fontWeight: 600, background: cfg.color, color: "#fff", padding: "1px 7px", borderRadius: "20px" }}>
            Level
          </span>
        </div>
        <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b", lineHeight: 1.4 }}>{cfg.desc}</p>
      </div>
    </div>
  );
}

export default function ProfileSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { member, updateMember, isLoggedIn } = useMemberAuth();
  
  // Set active tab based on router state or fallback to profile
  const [activeTab, setActiveTab] = useState(location.state?.tab || "profile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    location: "",
    country: "",
    state: "",
    company_name: "",
    job_role: "",
    receive_blog_emails: true,
  });
  const stateOptions = useMemo(() => statesForCountry(formData.country), [formData.country]);
  const cityOptions = useMemo(() => citiesForCountry(formData.country, formData.state), [formData.country, formData.state]);

  // Automatically updates country, state, and city to wherever the browser detects the user
  // is currently located (e.g. India, Telangana, Hyderabad) and locks the country.
  const geo = useGeoCountryLock();
  useEffect(() => {
    if (geo.status !== "ready" || !geo.country) return;
    setFormData((f) => ({
      ...f,
      country: geo.country,
      state: geo.state || f.state,
      location: geo.city || f.location,
    }));
  }, [geo.status, geo.country, geo.state, geo.city]);
  const countryMismatch = false;

  const [preview, setPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [visibility, setVisibility] = useState({
    show_name: true,
    show_picture: true,
    show_company: false,
    show_email: false,
    show_country: true,
    show_in_directory: true,
    show_stats: true,
    show_badges: true,
  });
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/member/login?return=/member/settings");
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (activeTab === 'achievements' && achievements.length === 0 && !achievementsLoading) {
      setAchievementsLoading(true);
      getMemberAchievements()
        .then(res => { if (res.data?.achievements) setAchievements(res.data.achievements); })
        .catch(() => {})
        .finally(() => setAchievementsLoading(false));
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || "",
        phone: member.phone || "",
        location: member.location || "",
        country: member.country || "",
        company_name: member.company_name || "",
        job_role: member.job_role || "",
        receive_blog_emails: member.receive_blog_emails !== undefined ? (member.receive_blog_emails == 1) : false,
      });
      setPreview(member.profile_image || null);
      setError("");
      setImageFile(null);
      const defaultVis = { show_name: true, show_picture: true, show_company: false, show_email: false, show_country: true, show_in_directory: true, show_stats: true, show_badges: true };
      try {
        const parsed = member.profile_visibility ? JSON.parse(member.profile_visibility) : {};
        setVisibility({ ...defaultVis, ...parsed });
      } catch {
        setVisibility(defaultVis);
      }
    }
  }, [member]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be less than 2MB");
      return;
    }

    setCropSrc(URL.createObjectURL(file));
    setError("");
    e.target.value = ""; // allow re-selecting the same file later
  };

  const handleCropConfirm = (croppedFile) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setImageFile(croppedFile);
    setPreview(URL.createObjectURL(croppedFile));
    setCropSrc(null);
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("phone", formData.phone);
    data.append("location", formData.location);
    data.append("country", formData.country);
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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.new_password.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('Passwords do not match.'); return; }
    if (pwForm.new_password === pwForm.current_password) { setPwError('New password cannot be the same as current password.'); return; }
    setPwLoading(true);
    try {
      const res = await memberChangePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      if (res.data.status === 'success') {
        addToast('Password changed successfully.', 'success');
        setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        setPwError(res.data.message || 'Failed to change password.');
      }
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleVisibilitySave = async () => {
    setVisibilitySaving(true);
    try {
      const data = new FormData();
      data.append("profile_visibility", JSON.stringify(visibility));
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

  const openDeleteAccount = () => {
    window.dispatchEvent(new CustomEvent('open-delete-account'));
  };

  if (!isLoggedIn || !member) return null;

  return (
    <div className="category-page-wrapper">
      {/* Header */}
      <div className="cat-hero-light" style={{ backgroundImage: "url('/assets/images/hero-sap-access-control.png')" }}>
        <div className="container">
          <nav className="blog-breadcrumb cat-hero-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
            <span className="breadcrumb-current">Account Settings</span>
          </nav>
          <div className="cat-hero-inner">
            <div className="cat-hero-text">
              <h1 className="cat-hero-title">ACCOUNT SETTINGS</h1>
              <p className="cat-hero-desc">Manage your profile, password, visibility, and track your achievements.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="category-content container">
        <div className="profile-settings-layout" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px', alignItems: 'start' }}>
          {/* Left Sidebar Tabs */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { key: 'profile',      icon: <LuUser size={18} />,        label: 'Profile Info' },
              { key: 'security',     icon: <LuShieldCheck size={18} />, label: 'Security & PW' },
              { key: 'visibility',   icon: <LuEye size={18} />,         label: 'Visibility Settings' },
              { key: 'achievements', icon: <i className="bi bi-award-fill" style={{ fontSize: '1.1rem' }} />, label: 'Achievements' },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === key ? 'rgba(238,94,66,0.08)' : 'transparent',
                  color: activeTab === key ? '#ee5e42' : '#475569',
                  fontWeight: activeTab === key ? '700' : '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <span>{icon}</span>
                <span style={{ fontSize: '0.9rem' }}>{label}</span>
              </button>
            ))}
          </div>

          {/* Right Content Card */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
            {activeTab === 'profile' && (
              <form onSubmit={handleSubmit}>
                <h3 style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: 700 }}>Profile Information</h3>
                
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

                  {member?.is_public_profile_pending && (
                    <div style={{
                      display: "flex", alignItems: "flex-start", gap: 8, marginTop: 12, width: "100%",
                      background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px",
                    }}>
                      <i className="bi bi-info-circle-fill" style={{ color: "#d97706", fontSize: "0.95rem", marginTop: 1 }} />
                      <p style={{ margin: 0, fontSize: "0.78rem", color: "#92400e", lineHeight: 1.5 }}>
                        Your profile photo and public profile aren't visible to others yet — they'll appear once you publish your first article.
                      </p>
                    </div>
                  )}

                  <ReputationBadge level={member?.is_ambassador ? "CountryAmbassador" : member?.reputation_level} />

                  {member?.ambassador_has_badge && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "14px", width: "100%" }}>
                      <AmbassadorBadge country={member.ambassador_badge_country} year={member.ambassador_badge_year} size={180} />
                    </div>
                  )}
                </div>

                {member?.ambassador_badge_years?.length > 1 && (
                  <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Badges — {member.ambassador_badge_years.length} Years as Country Ambassador
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px', justifyContent: 'center' }}>
                      {member.ambassador_badge_years.map((y) => (
                        <AmbassadorBadge key={y} country={member.ambassador_badge_country} year={y} size={100} />
                      ))}
                    </div>
                  </div>
                )}

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
                    <label className="form-label">Country *</label>
                    <SearchableSelect
                      className="form-control"
                      value={formData.country}
                      onChange={(v) => setFormData({ ...formData, country: v, state: "", location: "" })}
                      options={COUNTRIES}
                      placeholder={geo.status === "loading" ? "Detecting your location..." : "Type to search your country"}
                      disabled={geo.status === "ready"}
                      required
                    />
                    {geo.status === "denied" && (
                      <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                        <span>
                          <i className="bi bi-info-circle-fill" style={{ marginRight: 4 }} />
                          Location access denied. You can select country manually, or allow location to auto-detect.
                        </span>
                        {geo.requestLocation && (
                          <button
                            type="button"
                            onClick={geo.requestLocation}
                            style={{
                              background: "#fef3c7",
                              border: "1px solid #fde68a",
                              borderRadius: "4px",
                              padding: "2px 8px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "#b45309",
                              cursor: "pointer",
                            }}
                          >
                            📍 Retry Permission
                          </button>
                        )}
                      </p>
                    )}
                    {geo.status === "ready" && (
                      <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                        <i className="bi bi-geo-alt-fill" style={{ marginRight: 4 }} />
                        Auto-detected from your location and locked for accuracy.
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">State / Province</label>
                    <SearchableSelect
                      className="form-control"
                      value={formData.state}
                      onChange={(v) => setFormData({ ...formData, state: v, location: "" })}
                      options={stateOptions}
                      placeholder={formData.country ? "Type to search" : "Select a country first"}
                      disabled={!formData.country || stateOptions.length === 0}
                      onUseCurrentLocation={
                        geo.status === "ready" && geo.state
                          ? () => setFormData((f) => ({ ...f, state: geo.state, location: geo.city || f.location }))
                          : undefined
                      }
                      locationTooltip={`Use detected state (${geo.state || "current location"})`}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">City</label>
                    <div style={{ position: "relative" }}>
                      <LuMapPin style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", zIndex: 2 }} />
                      <SearchableSelect
                        className="form-control"
                        style={{ paddingLeft: "40px" }}
                        value={formData.location}
                        onChange={(v) => setFormData({ ...formData, location: v })}
                        options={cityOptions}
                        placeholder={formData.country ? "Type to search" : "Select a country first"}
                        disabled={!formData.country}
                        onUseCurrentLocation={
                          geo.status === "ready" && geo.city
                            ? () => setFormData((f) => ({ ...f, location: geo.city }))
                            : undefined
                        }
                        locationTooltip={`Use detected city (${geo.city || "current location"})`}
                      />
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

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 24px', backgroundColor: "#ee5e42" }}>
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <div className="security-settings">
                <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 700 }}>Security & Password</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '24px' }}>
                  Keep your account secure with a strong, unique password.
                </p>

                <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '480px' }}>
                  {pwError && (
                    <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <LuTriangleAlert size={15} /> {pwError}
                    </div>
                  )}
                  {[
                    { key: 'current_password', label: 'Current Password', placeholder: 'Enter current password' },
                    { key: 'new_password',     label: 'New Password',     placeholder: 'Minimum 8 characters' },
                    { key: 'confirm_password', label: 'Confirm New Password', placeholder: 'Re-enter new password' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>{label}</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder={placeholder}
                        value={pwForm[key]}
                        onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                        required
                        autoComplete={key === 'current_password' ? 'current-password' : 'new-password'}
                      />
                    </div>
                  ))}
                  <button type="submit" disabled={pwLoading} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 24px', fontSize: '0.88rem', marginTop: '10px' }}>
                    {pwLoading ? 'Updating…' : 'Update Password'}
                  </button>
                </form>

                <div className="settings-section" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '32px', marginTop: '32px' }}>
                  <h4 style={{ fontSize: '1.1rem', color: '#dc2626', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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

            {activeTab === 'visibility' && (
              <div className="visibility-settings">
                <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 700 }}>Visibility Settings</h3>
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
                    { key: 'show_country', label: 'Show my country on my public profile' },
                    { key: 'show_in_directory', label: 'Show my profile in the public community directory' },
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

                <div style={{ marginBottom: '24px' }}>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button type="button" onClick={handleVisibilitySave} disabled={visibilitySaving} className="btn-primary" style={{ padding: '10px 24px', backgroundColor: "#ee5e42" }}>
                    {visibilitySaving ? "Saving..." : "Save Visibility"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 700 }}>Achievements</h3>
                {achievementsLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    <i className="bi bi-hourglass-split" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }} />
                    Loading…
                  </div>
                ) : (
                  <>
                    {achievements.length > 0 && (
                      <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px' }}>
                          <span>Progress</span>
                          <span style={{ fontWeight: '700', color: '#ee5e42' }}>
                            {achievements.filter(a => a.earned).length} / {achievements.length}
                          </span>
                        </div>
                        <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '7px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.round((achievements.filter(a => a.earned).length / achievements.length) * 100)}%`,
                            background: 'linear-gradient(90deg, #ee5e42, #f97316)',
                            borderRadius: '999px',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                      {achievements.map(a => (
                        <div key={a.id} style={{
                          border: `1px solid ${a.earned ? a.color + '33' : '#e2e8f0'}`,
                          borderRadius: '12px',
                          padding: '16px',
                          background: a.earned ? a.bg : '#f8fafc',
                          opacity: a.earned ? 1 : 0.6,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '50%',
                            background: a.earned ? '#fff' : '#e2e8f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            filter: a.earned ? 'none' : 'grayscale(1)',
                          }}>
                            <i className={`bi ${a.icon}`} style={{ fontSize: '1.1rem', color: a.earned ? a.color : '#94a3b8' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0f172a', lineHeight: '1.3' }}>{a.label}</div>
                            {a.earned ? (
                              <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '600' }}>✓ Earned</span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>🔒 Not yet earned</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {cropSrc && (
        <ProfilePictureCropModal
          imageSrc={cropSrc}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
