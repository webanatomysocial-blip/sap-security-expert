import { useState, useEffect, useRef } from "react";
import { PaginatedList, CarouselSection } from "../components/ProfilePaging";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LuUser,
  LuPhone,
  LuMapPin,
  LuUpload,
  LuTriangleAlert,
  LuShieldCheck,
  LuTrash2,
  LuEye,
  LuInfo,
  LuLinkedin,
  LuBriefcase,
  LuCalendar,
  LuLayers,
  LuStar,
  LuFileText,
  LuChevronRight,
  LuX,
  LuCircleCheck,
  LuMessageSquare,
  LuAward,
} from "react-icons/lu";
import {
  updateMemberProfile,
  getMemberAchievements,
  memberChangePassword,
  getAmbassadorMemberProfile,
  updateAmbassadorAboutMe,
} from "../services/api";
import { useToast } from "../context/ToastContext";
import { useMemberAuth } from "../context/MemberAuthContext";
import ProfilePictureCropModal from "../components/ProfilePictureCropModal";
import { COUNTRIES, useGeoOptions } from "../constants/countries";
import SearchableSelect from "../components/SearchableSelect";
import AmbassadorBadge from "../components/AmbassadorBadge";
import useGeoCountryLock from "../hooks/useGeoCountryLock";
import useScrollLock from "../hooks/useScrollLock";

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

export default function ProfileSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { member, updateMember, isLoggedIn } = useMemberAuth();

  const [activeTab, setActiveTab] = useState(location.state?.tab || "profile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [aboutMeSaving, setAboutMeSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [preview, setPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);

  // Lock background scroll and prevent Lenis from intercepting modal wheel events
  useScrollLock(showPreviewModal || Boolean(cropSrc));

  const [formData, setFormData] = useState({
    name: "",
    headline: "",
    bio: "",
    phone: "",
    linkedin: "",
    country: "",
    state: "",
    location: "",
    company_name: "",
    job_role: "",
    expertise_tags: [],
    sap_certifications: [{ name: "", issuer: "", issue_date: "", url: "" }],
    receive_blog_emails: true,
  });

  const { stateOptions, cityOptions } = useGeoOptions(formData.country, formData.state);

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

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/member/login?return=/member/settings");
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!member?.is_ambassador) return;
    getAmbassadorMemberProfile()
      .then((res) => setAboutMe(res.data?.ambassador?.about_me || ""))
      .catch(() => {});
  }, [member?.is_ambassador]);

  const handleAboutMeSave = async () => {
    setAboutMeSaving(true);
    try {
      await updateAmbassadorAboutMe(aboutMe);
      addToast("About Me updated", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to save About Me", "error");
    } finally {
      setAboutMeSaving(false);
    }
  };

  useEffect(() => {
    if (activeTab === "achievements" && achievements.length === 0 && !achievementsLoading) {
      setAchievementsLoading(true);
      getMemberAchievements()
        .then((res) => {
          if (res.data?.achievements) setAchievements(res.data.achievements);
        })
        .catch(() => {})
        .finally(() => setAchievementsLoading(false));
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (member) {
      let parsedExpertise = [];
      if (Array.isArray(member.expertise_tags)) {
        parsedExpertise = member.expertise_tags;
      } else if (typeof member.expertise_tags === "string") {
        try {
          const parsed = JSON.parse(member.expertise_tags);
          parsedExpertise = Array.isArray(parsed) ? parsed : [member.expertise_tags];
        } catch {
          parsedExpertise = member.expertise_tags.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }

      let parsedCerts = [];
      if (Array.isArray(member.sap_certifications)) {
        parsedCerts = member.sap_certifications;
      } else if (typeof member.sap_certifications === "string") {
        try {
          const parsed = JSON.parse(member.sap_certifications);
          parsedCerts = Array.isArray(parsed) ? parsed : [];
        } catch {
          parsedCerts = member.sap_certifications
            .split("\n")
            .map((c) => ({ name: c.trim(), issuer: "SAP", issue_date: "", url: "" }))
            .filter((c) => c.name);
        }
      }
      if (!parsedCerts || parsedCerts.length === 0) {
        parsedCerts = [{ name: "", issuer: "", issue_date: "", url: "" }];
      }

      const memberBio = member.bio || "";
      setFormData({
        name: member.name || "",
        headline: member.headline || "",
        bio: memberBio,
        phone: member.phone || "",
        linkedin: member.linkedin || "",
        location: member.location || "",
        country: member.country || "",
        state: member.state || "",
        company_name: member.company_name || "",
        job_role: member.job_role || "",
        expertise_tags: parsedExpertise,
        sap_certifications: parsedCerts,
        receive_blog_emails: member.receive_blog_emails !== undefined ? member.receive_blog_emails == 1 : true,
      });
      if (memberBio) {
        setAboutMe(memberBio);
      }

      setPreview(member.profile_image || null);
      setError("");
      setImageFile(null);

      const defaultVis = {
        show_name: true,
        show_picture: true,
        show_company: false,
        show_email: false,
        show_country: true,
        show_in_directory: true,
        show_stats: true,
        show_badges: true,
      };
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
    e.target.value = "";
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

  const addExpertiseTag = (tagToAdd) => {
    const trimmed = tagToAdd?.trim();
    if (!trimmed) return;
    if (!formData.expertise_tags.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        expertise_tags: [...prev.expertise_tags, trimmed],
      }));
    }
    setTagInput("");
  };

  const removeExpertiseTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      expertise_tags: prev.expertise_tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addExpertiseTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && formData.expertise_tags.length > 0) {
      removeExpertiseTag(formData.expertise_tags[formData.expertise_tags.length - 1]);
    }
  };

  const addCertification = () => {
    setFormData((prev) => ({
      ...prev,
      sap_certifications: [
        ...prev.sap_certifications,
        { name: "", issuer: "", issue_date: "", url: "" },
      ],
    }));
  };

  const updateCertification = (index, field, value) => {
    setFormData((prev) => {
      const next = [...prev.sap_certifications];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, sap_certifications: next };
    });
  };

  const removeCertification = (index) => {
    setFormData((prev) => {
      const next = prev.sap_certifications.filter((_, i) => i !== index);
      return {
        ...prev,
        sap_certifications: next.length > 0 ? next : [{ name: "", issuer: "", issue_date: "", url: "" }],
      };
    });
  };

  const checklistCol1 = [
    { key: "name", label: "Full name", isComplete: Boolean(formData.name?.trim()) },
    { key: "state", label: "State / Province", isComplete: Boolean(formData.state?.trim()) },
    { key: "photo", label: "Profile photo", isComplete: Boolean(preview || member?.profile_image) },
    { key: "phone", label: "Phone number", isComplete: Boolean(formData.phone?.trim()) },
    { key: "company", label: "Company", isComplete: Boolean(formData.company_name?.trim()) },
    { key: "expertise", label: "Expertise tags", isComplete: Boolean(formData.expertise_tags?.length > 0) },
  ];

  const checklistCol2 = [
    { key: "country", label: "Country", isComplete: Boolean(formData.country?.trim()) },
    { key: "city", label: "City", isComplete: Boolean(formData.location?.trim()) },
    { key: "headline", label: "Headline", isComplete: Boolean(formData.headline?.trim()) },
    { key: "linkedin", label: "LinkedIn", isComplete: Boolean(formData.linkedin?.trim()) },
    { key: "job_role", label: "Job role", isComplete: Boolean(formData.job_role?.trim()) },
    {
      key: "certifications",
      label: "SAP certifications",
      isComplete: Boolean(formData.sap_certifications?.some((c) => c.name?.trim())),
    },
  ];

  const allChecklistItems = [...checklistCol1, ...checklistCol2];
  const completedCount = allChecklistItems.filter((item) => item.isComplete).length;

  // Level reflects contribution (Explorer/Contributor); ambassadorship is shown separately.
  const repLevel = member?.is_real_contributor ? "Contributor" : member?.reputation_level || "Explorer";
  const ambCfg = REPUTATION_CONFIG.CountryAmbassador;
  const repCfg = REPUTATION_CONFIG[repLevel] || REPUTATION_CONFIG.Explorer;

  const handleCancel = () => {
    if (member) {
      let parsedExpertise = [];
      if (Array.isArray(member.expertise_tags)) {
        parsedExpertise = member.expertise_tags;
      } else if (typeof member.expertise_tags === "string") {
        try {
          const parsed = JSON.parse(member.expertise_tags);
          parsedExpertise = Array.isArray(parsed) ? parsed : [member.expertise_tags];
        } catch {
          parsedExpertise = member.expertise_tags.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }

      let parsedCerts = [];
      if (Array.isArray(member.sap_certifications)) {
        parsedCerts = member.sap_certifications;
      } else if (typeof member.sap_certifications === "string") {
        try {
          const parsed = JSON.parse(member.sap_certifications);
          parsedCerts = Array.isArray(parsed) ? parsed : [];
        } catch {
          parsedCerts = member.sap_certifications
            .split("\n")
            .map((c) => ({ name: c.trim(), issuer: "SAP", issue_date: "", url: "" }))
            .filter((c) => c.name);
        }
      }
      if (!parsedCerts || parsedCerts.length === 0) {
        parsedCerts = [{ name: "", issuer: "", issue_date: "", url: "" }];
      }

      setFormData({
        name: member.name || "",
        headline: member.headline || "",
        phone: member.phone || "",
        linkedin: member.linkedin || "",
        location: member.location || "",
        country: member.country || "",
        state: member.state || "",
        company_name: member.company_name || "",
        job_role: member.job_role || "",
        expertise_tags: parsedExpertise,
        sap_certifications: parsedCerts,
        receive_blog_emails: member.receive_blog_emails !== undefined ? member.receive_blog_emails == 1 : true,
      });
      setPreview(member.profile_image || null);
      setImageFile(null);
      setError("");
      addToast("Changes discarded", "info");
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (geo.status === "ready" && geo.country && formData.country !== geo.country) {
      setError(`Profile update not allowed: your detected country is ${geo.country}, which does not match "${formData.country}".`);
      addToast(`Profile update not allowed: your detected country is ${geo.country}.`, "error");
      setFormData((f) => ({ ...f, country: geo.country, state: geo.state || f.state, location: geo.city || f.location }));
      return;
    }

    setLoading(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("headline", formData.headline);
    data.append("bio", (aboutMe || formData.bio || "").trim());
    data.append("phone", formData.phone);
    data.append("linkedin", formData.linkedin);
    data.append("location", formData.location);
    data.append("country", formData.country);
    data.append("state", formData.state);
    data.append("company_name", formData.company_name);
    data.append("job_role", formData.job_role);
    data.append("expertise_tags", JSON.stringify(formData.expertise_tags));
    data.append(
      "sap_certifications",
      JSON.stringify(formData.sap_certifications.filter((c) => c.name?.trim() || c.issuer?.trim()))
    );
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
        setShowPreviewModal(false);
      } else {
        setError(res.data.message || "Failed to update profile.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to update profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError("");
    if (pwForm.new_password.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError("Passwords do not match.");
      return;
    }
    if (pwForm.new_password === pwForm.current_password) {
      setPwError("New password cannot be the same as current password.");
      return;
    }
    setPwLoading(true);
    try {
      const res = await memberChangePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      if (res.data.status === "success") {
        addToast("Password changed successfully.", "success");
        setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      } else {
        setPwError(res.data.message || "Failed to change password.");
      }
    } catch (err) {
      setPwError(err.response?.data?.message || "Failed to change password.");
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
    window.dispatchEvent(new CustomEvent("open-delete-account"));
  };

  if (!isLoggedIn || !member) return null;

  // Dynamic articles vs comments based on member's real contributions
  const hasArticles = Boolean(member?.recent_articles && member.recent_articles.length > 0);
  const canPublishArticles = Boolean(member?.is_real_contributor || hasArticles);

  // Real user certifications (only active entered ones)
  const activeCertifications = (formData.sap_certifications || []).filter((c) => c.name?.trim());

  // Real user expertise tags
  const activeExpertise = formData.expertise_tags || [];

  const memberSinceStr = member?.created_at
    ? `Member since ${new Date(member.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
    : "";

  const isRaghu = Boolean(
    (member?.email && member.email.toLowerCase().includes("raghu")) ||
    (member?.name && member.name.toLowerCase().includes("raghu")) ||
    (formData.name && formData.name.toLowerCase().includes("raghu")) ||
    (member?.username && member.username.toLowerCase().includes("raghu"))
  );

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "36px 0 60px" }}>
      <div className="container">
        {/* Main Grid: Left Sidebar + Right Content */}
        <div
          className="profile-settings-layout"
          style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "28px", alignItems: "start" }}
        >
          {/* Left Sidebar Tabs */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              padding: "16px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            {[
              { key: "profile", icon: <LuUser size={18} />, label: "Profile Info" },
              { key: "security", icon: <LuShieldCheck size={18} />, label: "Security & PW" },
              { key: "visibility", icon: <LuEye size={18} />, label: "Visibility Settings" },
              {
                key: "achievements",
                icon: <i className="bi bi-award-fill" style={{ fontSize: "1.05rem" }} />,
                label: "Achievements",
              },
            ].map(({ key, icon, label }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "11px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: isActive ? "#fff1f0" : "transparent",
                    color: isActive ? "#ee5e42" : "#475569",
                    fontWeight: isActive ? "700" : "500",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ color: isActive ? "#ee5e42" : "#64748b", display: "flex" }}>{icon}</span>
                  <span style={{ fontSize: "0.88rem" }}>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Content Area */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              padding: "32px",
              boxShadow: "0 2px 8px -2px rgba(0,0,0,0.04)",
            }}
          >
            {/* TAB: PROFILE INFO */}
            {activeTab === "profile" && (
              <form onSubmit={handleSubmit}>
                {/* Header Row: Title on Left, Completeness Box on Right */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "20px",
                    marginBottom: "24px",
                  }}
                >
                  <div style={{ flex: "1 1 360px", maxWidth: "620px", minWidth: 0 }}>
                    <h1
                      style={{
                        fontSize: "1.6rem",
                        fontWeight: 800,
                        color: "#0f172a",
                        margin: "0 0 6px",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Profile Information
                    </h1>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
                      Edit the details that appear on your public profile, manage your SAP credentials, and keep your
                      personal contact information up to date.
                    </p>
                  </div>

                  {/* Profile Completeness Box */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      width: "280px",
                      flexShrink: 0,
                      marginLeft: "auto",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>
                        Profile completeness
                      </span>
                      <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ee5e42" }}>
                        {completedCount} / 12
                      </span>
                    </div>
                    <div
                      style={{
                        background: "#f1f5f9",
                        borderRadius: "999px",
                        height: "6px",
                        overflow: "hidden",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round((completedCount / 12) * 100)}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #ee5e42, #f97316)",
                          borderRadius: "999px",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b", lineHeight: 1.4 }}>
                      {completedCount} of 12 suggested profile details are filled in. The checklist below shows what is
                      still missing.
                    </p>
                  </div>
                </div>

                {error && (
                  <div
                    className="form-error"
                    style={{
                      marginBottom: "20px",
                      padding: "12px 16px",
                      background: "#fef2f2",
                      color: "#991b1b",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <LuTriangleAlert /> {error}
                  </div>
                )}

                {/* Top 3 Cards Row */}
                <div
                  className="profile-top-cards-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "250px 1.05fr 1.35fr",
                    gap: "16px",
                    marginBottom: "28px",
                  }}
                >
                  {/* Card 1: Photo card + level box + ambassador strip (stacked) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1.5px dashed #cbd5e1",
                      borderRadius: "12px",
                      padding: "20px 16px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      flex: 1,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          position: "relative",
                          width: "74px",
                          height: "74px",
                          borderRadius: "50%",
                          background: "#eff6ff",
                          border: "1px solid #dbeafe",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          marginBottom: "10px",
                          overflow: "hidden",
                        }}
                        title="Click to upload profile photo"
                      >
                        {preview ? (
                          <img src={preview} alt="" onError={() => setPreview(null)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <LuUser size={38} color="#94a3b8" />
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/jpeg,image/png,image/webp"
                          hidden
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          margin: "0 0 2px",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "#0f172a",
                          cursor: "pointer",
                        }}
                      >
                        Upload a square photo
                      </button>
                      <p style={{ margin: 0, fontSize: "0.7rem", color: "#64748b" }}>
                        Recommended: Square JPG, PNG or WebP
                      </p>
                    </div>

                  </div>

                    {/* Level box */}
                    <div
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: repCfg.bg,
                        border: `1px solid ${repCfg.border}`,
                      }}
                    >
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: repCfg.color }}>
                        {repCfg.label}
                      </span>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          background: repCfg.color,
                          color: "#ffffff",
                          padding: "1px 8px",
                          borderRadius: "20px",
                          letterSpacing: "0.02em",
                        }}
                      >
                        Level
                      </span>
                      <span
                        title={repCfg.desc}
                        style={{ display: "inline-flex", cursor: "help", color: repCfg.color }}
                      >
                        <i className="bi bi-info-circle" style={{ fontSize: "0.85rem" }} />
                      </span>
                    </div>

                    {/* Ambassador strip — sits under the level so identity stays in one place */}
                    {member?.is_ambassador && (
                      <div
                        title={ambCfg.desc}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "6px 12px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
                          border: `1px solid ${ambCfg.border}`,
                          textAlign: "left",
                        }}
                      >
                        <i className={`bi ${ambCfg.icon}`} style={{ color: ambCfg.color, fontSize: "1rem" }} />
                        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, minWidth: 0 }}>
                          <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "#92400e" }}>Country Ambassador</span>
                          <span style={{ fontSize: "0.68rem", color: "#b45309", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {[member.ambassador_badge_country, member.ambassador_badge_year].filter(Boolean).join(" · ") || "Official representative"}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 2: Articles Contribution Card */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "18px 20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-start",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>
                          {canPublishArticles ? "Articles Contribution" : "Comments"}{" "}
                          <span style={{ color: "#64748b", fontWeight: 600 }}>
                            ({canPublishArticles ? (member?.articles_count ?? member?.recent_articles?.length ?? 0) : (member?.comment_count ?? 0)})
                          </span>
                        </h3>
                        {canPublishArticles && member?.is_real_contributor && (
                          <Link to="/admin/blogs" style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", textDecoration: "none", whiteSpace: "nowrap", marginLeft: "12px" }}>
                            View more
                          </Link>
                        )}
                      </div>
                      <p style={{ margin: "4px 0 14px", fontSize: "0.72rem", color: "#64748b" }}>
                        {canPublishArticles ? "Recent contributions by the user" : "Your latest comments on articles"}
                      </p>
                    </div>

                    <div>
                      {canPublishArticles ? (
                        member?.recent_articles?.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {member.recent_articles.slice(0, 3).map((art) => (
                              <Link
                                key={art.id || art.slug}
                                to={`/${(art.category || "blogs").toLowerCase()}/${art.slug}`}
                                style={{ fontSize: "0.78rem", color: "#334155", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px", fontWeight: 500 }}
                              >
                                <i className="bi bi-file-earmark-text" style={{ color: "#ee5e42" }} />
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{art.title}</span>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: "inline-block", background: "#f1f5f9", color: "#64748b", fontSize: "0.72rem", fontWeight: 500, padding: "5px 14px", borderRadius: "999px" }}>
                            No recent contributions
                          </div>
                        )
                      ) : member?.recent_comments?.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {member.recent_comments.slice(0, 3).map((c) => (
                            <Link
                              key={c.id}
                              to={`/${(c.post_category || "blogs").toLowerCase()}/${c.post_slug || c.post_id}`}
                              style={{ fontSize: "0.78rem", color: "#334155", textDecoration: "none", display: "flex", gap: "6px", alignItems: "flex-start" }}
                            >
                              <i className="bi bi-chat-left-text" style={{ color: "#2563eb", marginTop: 2 }} />
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                                  {c.post_title || "Article"}
                                </span>
                                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#64748b" }}>
                                  “{String(c.content || "").replace(/<[^>]*>/g, "").slice(0, 80)}”
                                </span>
                              </span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: "inline-block", background: "#f1f5f9", color: "#64748b", fontSize: "0.72rem", fontWeight: 500, padding: "5px 14px", borderRadius: "999px" }}>
                          No comments yet · 0
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Profile Completeness Checklist Card */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "18px 20px",
                    }}
                  >
                    <h3 style={{ margin: "0 0 12px", fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>
                      Profile completeness checklist
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "6px 20px",
                      }}
                    >
                      {/* Column 1 */}
                      <div>
                        {checklistCol1.map((item) => (
                          <div
                            key={item.key}
                            style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}
                          >
                            {item.isComplete ? (
                              <i className="bi bi-check-circle-fill" style={{ color: "#ee5e42", fontSize: "0.85rem" }} />
                            ) : (
                              <span
                                style={{
                                  width: "13px",
                                  height: "13px",
                                  borderRadius: "50%",
                                  border: "1.5px solid #cbd5e1",
                                  display: "inline-block",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: item.isComplete ? "#1e293b" : "#64748b",
                                fontWeight: item.isComplete ? 600 : 400,
                              }}
                            >
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Column 2 */}
                      <div>
                        {checklistCol2.map((item) => (
                          <div
                            key={item.key}
                            style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}
                          >
                            {item.isComplete ? (
                              <i className="bi bi-check-circle-fill" style={{ color: "#ee5e42", fontSize: "0.85rem" }} />
                            ) : (
                              <span
                                style={{
                                  width: "13px",
                                  height: "13px",
                                  borderRadius: "50%",
                                  border: "1.5px solid #cbd5e1",
                                  display: "inline-block",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: item.isComplete ? "#1e293b" : "#64748b",
                                fontWeight: item.isComplete ? 600 : 400,
                              }}
                            >
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Personal and Location */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "24px 28px",
                    marginBottom: "24px",
                  }}
                >
                  <h3 style={{ margin: "0 0 4px", fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                    Personal and location
                  </h3>
                  <p style={{ margin: "0 0 20px", fontSize: "0.8rem", color: "#64748b" }}>
                    These details help other members understand your background and location.
                  </p>

                  <div
                    className="form-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "18px 24px",
                    }}
                  >
                    {/* Full name */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                        Full name
                      </label>
                      <input
                        type="text"
                        className="form-control profile-settings-input"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Full Name"
                        required
                        style={{ height: "42px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
                      />
                    </div>

                    {/* Headline */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                        Headline
                      </label>
                      <input
                        type="text"
                        className="form-control profile-settings-input"
                        value={formData.headline}
                        onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                        placeholder="e.g. SAP Security Consultant"
                        style={{ height: "42px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
                      />
                    </div>

                    {/* Phone number */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                        Phone number
                      </label>
                      <input
                        type="tel"
                        className="form-control profile-settings-input"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. +91 00000 00000"
                        style={{ height: "42px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
                      />
                    </div>

                    {/* LinkedIn */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                        LinkedIn
                      </label>
                      <input
                        type="text"
                        className="form-control profile-settings-input"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                        placeholder="e.g. linkedin.com/in/your-profile"
                        style={{ height: "42px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
                      />
                    </div>

                    {/* Country * */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                        Country *
                      </label>
                      <SearchableSelect
                        className="form-control"
                        value={formData.country}
                        onChange={(v) => {
                          if (geo.status === "ready" && geo.country && v && v !== geo.country) {
                            addToast(`Only your detected country (${geo.country}) is allowed. Selecting a different country is not permitted.`, "error");
                            setFormData((f) => ({
                              ...f,
                              country: geo.country,
                              state: geo.state || f.state,
                              location: geo.city || f.location,
                            }));
                            return;
                          }
                          setFormData({ ...formData, country: v, state: "", location: "" });
                        }}
                        options={geo.status === "ready" && geo.country ? COUNTRIES.filter((c) => c.name === geo.country) : COUNTRIES}
                        placeholder={geo.status === "loading" ? "Detecting your location..." : "Type to search your country"}
                        required
                        onUseCurrentLocation={
                          geo.status === "ready" && geo.country
                            ? () =>
                                setFormData((f) => ({
                                  ...f,
                                  country: geo.country,
                                  state: geo.state || f.state,
                                  location: geo.city || f.location,
                                }))
                            : undefined
                        }
                        locationTooltip={`Use detected country (${geo.country || "current location"})`}
                      />

                      {geo.status === "ready" && (
                        <p
                          style={{
                            margin: "6px 0 0",
                            fontSize: "0.74rem",
                            color: "#16a34a",
                            fontWeight: 500,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <i className="bi bi-geo-alt-fill" />
                          Verified from your current location ({geo.country}). Other countries are not allowed.
                        </p>
                      )}

                      {geo.status === "denied" && (
                        <div
                          style={{
                            margin: "8px 0 0",
                            padding: "8px 12px",
                            background: "#fffbeb",
                            border: "1px solid #fde68a",
                            borderRadius: "6px",
                            fontSize: "0.76rem",
                            color: "#92400e",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                            <span>
                              <i className="bi bi-geo-alt-fill" style={{ marginRight: 5, color: "#d97706" }} />
                              Location access is blocked in your browser.
                            </span>
                            {geo.requestLocation && (
                              <button
                                type="button"
                                onClick={geo.requestLocation}
                                style={{
                                  background: "#fef3c7",
                                  border: "1px solid #fcd34d",
                                  borderRadius: "4px",
                                  padding: "3px 10px",
                                  fontSize: "0.73rem",
                                  fontWeight: 600,
                                  color: "#b45309",
                                  cursor: "pointer",
                                }}
                              >
                                📍 Retry Location
                              </button>
                            )}
                          </div>
                          {geo.showHelp && (
                            <div
                              style={{
                                marginTop: "6px",
                                paddingTop: "6px",
                                borderTop: "1px dashed #fde68a",
                                fontSize: "0.72rem",
                                color: "#78350f",
                              }}
                            >
                              To allow: Click the <strong>lock / tune icon 🔒</strong> next to the URL in your browser bar ➔ change <strong>Location</strong> to <em>Allow</em> ➔ then click <strong>Retry Location</strong>.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* State / Province */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                        State / Province
                      </label>
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

                    {/* City */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                        City
                      </label>
                      <SearchableSelect
                        className="form-control"
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

                    {/* Company */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                        Company
                      </label>
                      <input
                        type="text"
                        className="form-control profile-settings-input"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        placeholder="e.g. Acme Consulting"
                        style={{ height: "42px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
                      />
                    </div>

                    {/* Job role */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                        Job role
                      </label>
                      <input
                        type="text"
                        className="form-control profile-settings-input"
                        value={formData.job_role}
                        onChange={(e) => setFormData({ ...formData, job_role: e.target.value })}
                        placeholder="e.g. Security Consultant"
                        style={{ height: "42px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
                      />
                    </div>

                    {/* Expertise tags */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                        Expertise tags
                      </label>
                      <div
                        style={{
                          minHeight: "42px",
                          padding: "5px 10px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: "6px",
                          background: "#ffffff",
                        }}
                      >
                        {formData.expertise_tags.map((tag, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "#f1f5f9",
                              color: "#334155",
                              padding: "2px 8px",
                              borderRadius: "16px",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                            }}
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeExpertiseTag(tag)}
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                color: "#94a3b8",
                                fontSize: "0.95rem",
                                lineHeight: 1,
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagKeyDown}
                          placeholder={
                            formData.expertise_tags.length === 0
                              ? "Search and add expertise tags.."
                              : "Add tag..."
                          }
                          style={{
                            border: "none",
                            outline: "none",
                            fontSize: "0.82rem",
                            flex: "1 1 140px",
                            minWidth: "120px",
                            padding: "4px 4px",
                            background: "transparent",
                          }}
                        />
                      </div>
                      <div style={{ marginTop: "6px", fontSize: "0.72rem", color: "#64748b" }}>
                        Suggestions:{" "}
                        {["SAP Security", "SAP GRC", "SAP BTP Security"].map((sug, i, arr) => (
                          <span key={sug}>
                            <button
                              type="button"
                              onClick={() => addExpertiseTag(sug)}
                              style={{
                                background: "none",
                                border: "none",
                                color: formData.expertise_tags.includes(sug) ? "#16a34a" : "#64748b",
                                padding: 0,
                                cursor: "pointer",
                                fontWeight: formData.expertise_tags.includes(sug) ? 600 : 400,
                                textDecoration: "underline",
                              }}
                            >
                              {sug}
                            </button>
                            {i < arr.length - 1 && " • "}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* About Me / Bio for All Members */}
                  <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", display: "block" }}>
                      About Me / Bio
                      <span style={{ fontWeight: 400, color: "#64748b", marginLeft: "6px", fontSize: "0.75rem" }}>
                        (Shown on your community profile & live preview)
                      </span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={aboutMe}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAboutMe(val);
                        setFormData((f) => ({ ...f, bio: val }));
                      }}
                      placeholder="Share a brief overview of your background, experience, or areas of interest..."
                      style={{ marginTop: 8, borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
                    />
                    {member?.is_ambassador && (
                      <button
                        type="button"
                        className="profile-settings-btn-primary"
                        onClick={handleAboutMeSave}
                        disabled={aboutMeSaving}
                        style={{ marginTop: 10, padding: "8px 18px", fontSize: "0.8rem" }}
                      >
                        {aboutMeSaving ? "Saving..." : "Save About Me"}
                      </button>
                    )}
                  </div>

                  {member?.ambassador_has_badge && (
                    <div className="ps-amb-card">
                      <div className="ps-amb-badge">
                        <AmbassadorBadge country={member.ambassador_badge_country} year={member.ambassador_badge_year} size={112} />
                      </div>
                      <div className="ps-amb-body">
                        <span className="ps-amb-eyebrow"><i className="bi bi-award-fill" /> Official badge</span>
                        <h4>Country Ambassador</h4>
                        <p className="ps-amb-meta">
                          {[member.ambassador_badge_country, member.ambassador_badge_year].filter(Boolean).join(" · ")}
                        </p>
                        <p className="ps-amb-desc">
                          You represent SAP Security Expert in your country. This badge appears on your public profile. Click it to view or download.
                        </p>
                        <Link to="/member/ambassador" className="ps-amb-link">
                          Open ambassador dashboard <i className="bi bi-arrow-right" />
                        </Link>
                      </div>
                      <style>{`
                        .ps-amb-card { margin-top: 22px; display: flex; gap: 20px; align-items: center; padding: 18px 20px;
                          border-radius: 14px; border: 1px solid #fde68a; background: linear-gradient(135deg, #fffbeb 0%, #fff 60%); }
                        .ps-amb-badge { flex-shrink: 0; filter: drop-shadow(0 6px 14px rgba(146,64,14,.18)); }
                        .ps-amb-body { min-width: 0; }
                        .ps-amb-eyebrow { display: inline-flex; gap: 6px; align-items: center; font-size: 0.68rem; font-weight: 800;
                          letter-spacing: .08em; text-transform: uppercase; color: #b45309; }
                        .ps-amb-body h4 { margin: 4px 0 2px; font-size: 1.05rem; font-weight: 800; color: #0f172a; }
                        .ps-amb-meta { margin: 0 0 8px; font-size: 0.82rem; font-weight: 700; color: #92400e; }
                        .ps-amb-desc { margin: 0 0 10px; font-size: 0.8rem; color: #64748b; line-height: 1.5; max-width: 460px; }
                        .ps-amb-link { font-size: 0.8rem; font-weight: 700; color: #b45309; text-decoration: none; display: inline-flex; gap: 6px; align-items: center; }
                        .ps-amb-link:hover { color: #92400e; text-decoration: underline; }
                        @media (max-width: 560px) { .ps-amb-card { flex-direction: column; text-align: center; } }
                      `}</style>
                    </div>
                  )}

                  {member?.is_public_profile_pending && (
                    <div
                      style={{
                        marginTop: "20px",
                        padding: "12px 16px",
                        background: "#fffbeb",
                        border: "1.5px solid #fde68a",
                        borderRadius: "10px",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#b45309", fontWeight: 600 }}>
                        <i className="bi bi-eye-slash-fill" style={{ marginRight: "6px" }} />
                        Public Profile Hidden
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: "0.74rem", color: "#78350f" }}>
                        Your profile will become visible in the public Contributors directory once your first article is submitted and published.
                      </p>
                    </div>
                  )}
                </div>

                {/* Section 2: SAP Certifications */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "24px 28px",
                    marginBottom: "24px",
                  }}
                >
                  <h3 style={{ margin: "0 0 4px", fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                    SAP certifications
                  </h3>
                  <p style={{ margin: "0 0 20px", fontSize: "0.8rem", color: "#64748b" }}>
                    Add your verified SAP credentials. These will appear on your public profile and help other members
                    understand your SAP background.
                  </p>

                  {formData.sap_certifications.map((cert, index) => (
                    <div
                      key={index}
                      style={{
                        padding: formData.sap_certifications.length > 1 ? "16px" : "0",
                        marginBottom: "16px",
                        border: formData.sap_certifications.length > 1 ? "1px dashed #e2e8f0" : "none",
                        borderRadius: "8px",
                        position: "relative",
                        background: formData.sap_certifications.length > 1 ? "#fafbfd" : "transparent",
                      }}
                    >
                      {formData.sap_certifications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCertification(index)}
                          title="Remove certification"
                          style={{
                            position: "absolute",
                            top: "10px",
                            right: "12px",
                            background: "none",
                            border: "none",
                            color: "#dc2626",
                            cursor: "pointer",
                            fontSize: "0.88rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <LuTrash2 /> <span style={{ fontSize: "0.75rem" }}>Remove</span>
                        </button>
                      )}

                      <div
                        className="form-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "18px 24px",
                        }}
                      >
                        {/* Credential name */}
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                            Credential name
                          </label>
                          <input
                            type="text"
                            className="form-control profile-settings-input"
                            value={cert.name}
                            onChange={(e) => updateCertification(index, "name", e.target.value)}
                            placeholder="e.g. SAP Certified Technology Associate - SAP S/4HANA Security"
                            style={{ height: "42px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
                          />
                        </div>

                        {/* Issuer */}
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                            Issuer
                          </label>
                          <input
                            type="text"
                            className="form-control profile-settings-input"
                            value={cert.issuer}
                            onChange={(e) => updateCertification(index, "issuer", e.target.value)}
                            placeholder="e.g. SAP"
                            style={{ height: "42px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
                          />
                        </div>

                        {/* Issued date */}
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                            Issued date
                          </label>
                          <input
                            type="text"
                            className="form-control profile-settings-input"
                            value={cert.issue_date}
                            onChange={(e) => updateCertification(index, "issue_date", e.target.value)}
                            placeholder="e.g. MM / YYYY"
                            style={{ height: "42px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
                          />
                        </div>

                        {/* Credential link */}
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                            Credential link
                          </label>
                          <input
                            type="text"
                            className="form-control profile-settings-input"
                            value={cert.url}
                            onChange={(e) => updateCertification(index, "url", e.target.value)}
                            placeholder="e.g. https://your-credential-link.com"
                            style={{ height: "42px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addCertification}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ee5e42",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "4px 0",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "6px",
                    }}
                  >
                    <span style={{ fontSize: "1rem", lineHeight: 1 }}>+</span> Add another SAP certification
                  </button>
                </div>

                {/* Section 3: Notifications */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "24px 28px",
                    marginBottom: "28px",
                  }}
                >
                  <h3 style={{ margin: "0 0 4px", fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                    Notifications
                  </h3>
                  <p style={{ margin: "0 0 16px", fontSize: "0.8rem", color: "#64748b" }}>
                    Keep your email preferences up to date so you receive the right updates from the community.
                  </p>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      margin: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.receive_blog_emails}
                      onChange={(e) => setFormData({ ...formData, receive_blog_emails: e.target.checked })}
                      style={{ width: "18px", height: "18px", accentColor: "#ee5e42", cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "0.85rem", color: "#1e293b", fontWeight: 500 }}>
                      Subscribe to receive the latest blog articles and updates via email
                    </span>
                  </label>
                </div>

                {/* Footer Action Bar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                    paddingTop: "12px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.75rem",
                      color: "#64748b",
                      maxWidth: "400px",
                      lineHeight: 1.4,
                    }}
                  >
                    Preview Public Profile shows how your current edits will appear to other members before you save.
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button
                      type="button"
                      className="profile-settings-btn-secondary"
                      onClick={() => setShowPreviewModal(true)}
                    >
                      Preview Public Profile
                    </button>

                    <button
                      type="button"
                      className="profile-settings-btn-cancel"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="profile-settings-btn-primary"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TAB: SECURITY & PW */}
            {activeTab === "security" && (
              <div className="security-settings">
                <h2 style={{ margin: "0 0 6px", fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>
                  Security & Password
                </h2>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "28px" }}>
                  Keep your account secure with a strong, unique password.
                </p>

                <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "480px" }}>
                  {pwError && (
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        color: "#991b1b",
                        fontSize: "0.83rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <LuTriangleAlert size={15} /> {pwError}
                    </div>
                  )}

                  {[
                    { key: "current_password", label: "Current Password", placeholder: "Enter current password" },
                    { key: "new_password", label: "New Password", placeholder: "Minimum 8 characters" },
                    { key: "confirm_password", label: "Confirm New Password", placeholder: "Re-enter new password" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>
                        {label}
                      </label>
                      <input
                        type="password"
                        className="form-control profile-settings-input"
                        placeholder={placeholder}
                        value={pwForm[key]}
                        onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))}
                        required
                        autoComplete={key === "current_password" ? "current-password" : "new-password"}
                        style={{ height: "42px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                      />
                    </div>
                  ))}

                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="profile-settings-btn-primary"
                    style={{ alignSelf: "flex-start", marginTop: "8px" }}
                  >
                    {pwLoading ? "Updating…" : "Update Password"}
                  </button>
                </form>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "32px", marginTop: "36px" }}>
                  <h4
                    style={{
                      fontSize: "1.05rem",
                      color: "#dc2626",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontWeight: 700,
                    }}
                  >
                    <LuTrash2 size={18} /> Delete Account
                  </h4>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "16px" }}>
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <button
                    type="button"
                    onClick={openDeleteAccount}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      border: "1px solid #fee2e2",
                      borderRadius: "8px",
                      background: "#fff",
                      color: "#dc2626",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <LuTrash2 size={16} /> Delete my Account
                  </button>
                </div>
              </div>
            )}

            {/* TAB: VISIBILITY SETTINGS */}
            {activeTab === "visibility" && (
              <div className="visibility-settings">
                <h2 style={{ margin: "0 0 6px", fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>
                  Visibility Settings
                </h2>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "28px", lineHeight: "1.6" }}>
                  Control what information is visible to others on your public profile.
                </p>

                <div style={{ marginBottom: "28px" }}>
                  <h4
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: "700",
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "12px",
                    }}
                  >
                    Public Profile
                  </h4>
                  {[
                    { key: "show_name", label: "Display my name" },
                    { key: "show_picture", label: "Display my profile picture" },
                    { key: "show_company", label: "Display company" },
                    { key: "show_email", label: "Display email" },
                    { key: "show_country", label: "Show my country on my public profile" },
                    { key: "show_in_directory", label: "Show my profile in the public community directory" },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 0",
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!visibility[key]}
                        onChange={(e) => setVisibility((v) => ({ ...v, [key]: e.target.checked }))}
                        style={{ width: "18px", height: "18px", accentColor: "#ee5e42", flexShrink: 0 }}
                      />
                      <span style={{ fontSize: "0.88rem", color: "#1e293b" }}>{label}</span>
                    </label>
                  ))}
                </div>

                <div style={{ marginBottom: "28px" }}>
                  <h4
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: "700",
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "12px",
                    }}
                  >
                    Activity & Achievements
                  </h4>
                  {[
                    { key: "show_stats", label: "Show contribution statistics" },
                    { key: "show_badges", label: "Show badges" },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 0",
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!visibility[key]}
                        onChange={(e) => setVisibility((v) => ({ ...v, [key]: e.target.checked }))}
                        style={{ width: "18px", height: "18px", accentColor: "#ee5e42", flexShrink: 0 }}
                      />
                      <span style={{ fontSize: "0.88rem", color: "#1e293b" }}>{label}</span>
                    </label>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
                  <button
                    type="button"
                    onClick={handleVisibilitySave}
                    disabled={visibilitySaving}
                    className="profile-settings-btn-primary"
                  >
                    {visibilitySaving ? "Saving..." : "Save Visibility"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB: ACHIEVEMENTS */}
            {activeTab === "achievements" && (
              <div>
                <h2 style={{ margin: "0 0 6px", fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>
                  Achievements
                </h2>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "24px" }}>
                  Track your community contributions and milestones.
                </p>

                {achievementsLoading ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                    <i className="bi bi-hourglass-split" style={{ fontSize: "1.5rem", display: "block", marginBottom: "8px" }} />
                    Loading…
                  </div>
                ) : (
                  <>
                    {achievements.length > 0 && (
                      <div style={{ marginBottom: "28px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.82rem",
                            color: "#64748b",
                            marginBottom: "6px",
                          }}
                        >
                          <span>Progress</span>
                          <span style={{ fontWeight: "700", color: "#ee5e42" }}>
                            {achievements.filter((a) => a.earned).length} / {achievements.length}
                          </span>
                        </div>
                        <div style={{ background: "#f1f5f9", borderRadius: "999px", height: "7px", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.round(
                                (achievements.filter((a) => a.earned).length / achievements.length) * 100
                              )}%`,
                              background: "linear-gradient(90deg, #ee5e42, #f97316)",
                              borderRadius: "999px",
                              transition: "width 0.5s ease",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                        gap: "16px",
                      }}
                    >
                      {achievements.map((a) => (
                        <div
                          key={a.id}
                          style={{
                            border: `1px solid ${a.earned ? a.color + "33" : "#e2e8f0"}`,
                            borderRadius: "12px",
                            padding: "16px",
                            background: a.earned ? a.bg : "#f8fafc",
                            opacity: a.earned ? 1 : 0.65,
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "50%",
                              background: a.earned ? "#fff" : "#e2e8f0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              filter: a.earned ? "none" : "grayscale(1)",
                            }}
                          >
                            <i className={`bi ${a.icon}`} style={{ fontSize: "1.1rem", color: a.earned ? a.color : "#94a3b8" }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#0f172a", lineHeight: "1.3" }}>
                              {a.label}
                            </div>
                            <p style={{ margin: "4px 0", fontSize: "0.74rem", color: "#64748b", lineHeight: 1.4 }}>
                              {a.description}
                            </p>
                            {a.earned ? (
                              <span style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: "600" }}>✓ Earned</span>
                            ) : (
                              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>🔒 Not yet earned</span>
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

      {/* MODAL: LIVE PREVIEW OF THE PROFILE MATCHING THE DESIGN SCREENSHOT */}
      {showPreviewModal && (
        <div
          className="preview-modal-overlay"
          data-lenis-prevent="true"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="preview-modal-dialog"
            data-lenis-prevent="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Control Bar - Sticky */}
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 30,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 28px",
                background: "#ffffff",
                borderBottom: "1px solid #eef2f6",
                borderRadius: "24px 24px 0 0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#16a34a",
                  }}
                />
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Live Profile Preview
                </span>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  — Showing how community members view your public profile
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  padding: "6px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
                title="Close Preview"
              >
                <LuX size={18} />
              </button>
            </div>

            {/* Profile Card Body (Matching the exact design screenshot) */}
            <div style={{ padding: "24px" }} data-lenis-prevent="true">
              <div className="auth-profile-card">
                {/* Left Sidebar Profile */}
                <aside className="auth-sidebar">
                  {/* Banner with pattern + centered avatar */}
                  <div className="auth-banner">
                    <div className="auth-avatar-holder">
                      {preview || member?.profile_image ? (
                        <img
                          src={preview || member?.profile_image}
                          alt={formData.name || member?.name || "Member"}
                          className="auth-avatar-img"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="auth-avatar-fallback">
                          {(formData.name || member?.name || "M").charAt(0).toUpperCase()}
                        </div>
                      )}
                      {(member?.is_real_contributor || member?.ambassador_has_badge || member?.status === "approved") && (
                        <div className="auth-verified-badge" title="Verified Member">
                          <LuShieldCheck size={12} color="#ffffff" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="auth-sidebar-body">
                    {/* Name + Role */}
                    <div className="auth-name-group">
                      <h1 className="auth-name">{formData.name || member?.name || "Community Member"}</h1>
                      <p className="auth-role">
                        {formData.headline || formData.job_role || (member?.is_real_contributor ? "SAP Security Contributor" : "Community Member")}
                      </p>
                    </div>

                    {/* Details List */}
                    {(formData.company_name?.trim() || [formData.location, formData.state, formData.country].filter(Boolean).length > 0 || memberSinceStr) && (
                      <div className="auth-details-list">
                        {Boolean(formData.company_name?.trim()) && (
                          <div className="auth-detail-item">
                            <LuBriefcase />
                            <span>{formData.company_name}</span>
                          </div>
                        )}
                        {Boolean([formData.location, formData.state, formData.country].filter(Boolean).join(", ")) && (
                          <div className="auth-detail-item">
                            <LuMapPin />
                            <span>{[formData.location, formData.state, formData.country].filter(Boolean).join(", ")}</span>
                          </div>
                        )}
                        {Boolean(memberSinceStr) && (
                          <div className="auth-detail-item">
                            <LuCalendar />
                            <span>{memberSinceStr}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* About Section */}
                    <div>
                      <h3 className="auth-section-heading">About</h3>
                      {(aboutMe || formData.bio)?.trim() ? (
                        <p className="auth-about-text" style={{ whiteSpace: "pre-line" }}>
                          {(aboutMe || formData.bio).trim()}
                        </p>
                      ) : (
                        <p className="auth-about-text" style={{ fontStyle: "italic", color: "#94a3b8" }}>
                          No bio added yet. Add a short bio in your profile settings to introduce yourself.
                        </p>
                      )}
                    </div>

                    {/* Action Button: View Public Profile - Dedicated public page only for Raghu Boddu */}
                    {isRaghu && (
                      <button
                        type="button"
                        className="auth-btn-profile"
                        onClick={() => {
                          window.open("/experts/raghu-boddu", "_blank");
                        }}
                        style={{ cursor: "pointer", border: "none" }}
                      >
                        View Public Profile
                      </button>
                    )}

                    {/* Connect Section - Only render if user has LinkedIn */}
                    {Boolean(formData.linkedin?.trim()) && (
                      <div>
                        <h3 className="auth-section-heading">Connect</h3>
                        <a
                          href={formData.linkedin.startsWith("http") ? formData.linkedin : `https://${formData.linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="auth-connect-btn"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a66c2" style={{ flexShrink: 0 }}>
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                          </svg>
                          <span>LinkedIn Profile</span>
                        </a>
                      </div>
                    )}

                    {/* Expertise Section - Only render if tags are entered */}
                    {Boolean(activeExpertise && activeExpertise.length > 0) && (
                      <div>
                        <h3 className="auth-section-heading">Expertise</h3>
                        <div className="auth-expertise-tags">
                          {activeExpertise.map((tag, idx) => (
                            <span key={idx} className="auth-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Achievements Badges */}
                    {Boolean(member?.badges && member.badges.length > 0) && (
                      <div>
                        <h3 className="auth-section-heading">Achievements</h3>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {member.badges.map((b) => (
                            <span
                              key={b.id}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                              }}
                            >
                              <i className={`bi ${b.icon}`} style={{ color: b.color || "#ee5e42" }} />
                              {b.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </aside>

                {/* Right Main Content Area */}
                <main className="auth-main">
                  {/* Top Stats Strip */}
                  <div className="auth-stats-grid">
                    {/* Stat 1: Reputation / Level */}
                    <div className="auth-stat-box">
                      <div className="auth-stat-icon">
                        <LuShieldCheck />
                      </div>
                      <div className="auth-stat-info">
                        <div className="auth-stat-num">{repCfg.label}</div>
                        <div className="auth-stat-label">Member Level</div>
                        <div className="auth-stat-sub" style={member?.is_ambassador ? { color: "#b45309", fontWeight: 700 } : undefined}>
                          {member?.is_ambassador ? "Country Ambassador" : "Community standing"}
                        </div>
                      </div>
                    </div>

                    {/* Stat 2: Comments / Discussions */}
                    <div className="auth-stat-box">
                      <div className="auth-stat-icon">
                        <LuMessageSquare />
                      </div>
                      <div className="auth-stat-info">
                        <div className="auth-stat-num">
                          {member?.comment_count != null ? member.comment_count : (member?.recent_comments?.length || 0)}
                        </div>
                        <div className="auth-stat-label">Comments</div>
                        <div className="auth-stat-sub">Discussion contributions</div>
                      </div>
                    </div>

                    {/* Stat 3: Certifications */}
                    <div className="auth-stat-box">
                      <div className="auth-stat-icon">
                        <LuAward />
                      </div>
                      <div className="auth-stat-info">
                        <div className="auth-stat-num">{activeCertifications.length}</div>
                        <div className="auth-stat-label">SAP Certifications</div>
                        <div className="auth-stat-sub">Verified credentials</div>
                      </div>
                    </div>

                    {/* Stat 4: Articles (for contributors) OR Achievements (for members) */}
                    {canPublishArticles ? (
                      <div className="auth-stat-box">
                        <div className="auth-stat-icon">
                          <LuFileText />
                        </div>
                        <div className="auth-stat-info">
                          <div className="auth-stat-num">
                            {member?.articles_count || member?.recent_articles?.length || 0}
                          </div>
                          <div className="auth-stat-label">Articles</div>
                          <div className="auth-stat-sub">Knowledge resources</div>
                        </div>
                      </div>
                    ) : (
                      <div className="auth-stat-box">
                        <div className="auth-stat-icon">
                          <LuStar />
                        </div>
                        <div className="auth-stat-info">
                          <div className="auth-stat-num">{member?.badges?.length || 0}</div>
                          <div className="auth-stat-label">Badges Earned</div>
                          <div className="auth-stat-sub">Community milestones</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Main Section: Articles for Contributors vs Comments for Members */}
                  {canPublishArticles ? (
                    <section className="auth-articles-section">
                      <div className="auth-articles-header">
                        <h2 className="auth-block-title">
                          Articles ({member?.articles_count || member?.recent_articles?.length || 0})
                        </h2>
                      </div>

                      {hasArticles ? (
                        <PaginatedList
                          items={member.recent_articles}
                          pageSize={4}
                          className="auth-articles-list"
                          renderItem={(art) => (
                            <div
                              key={art.id || art.slug}
                              className="auth-article-row"
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                const url = `/${(art.category || "blogs").toLowerCase()}/${art.slug}`;
                                window.open(url, "_blank");
                              }}
                            >
                              {art.featured_image || art.image ? (
                                <img
                                  src={art.featured_image || art.image}
                                  alt={art.title}
                                  className="auth-article-thumb"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="auth-article-thumb-placeholder">
                                  <LuFileText size={20} color="#94a3b8" />
                                </div>
                              )}
                              <div className="auth-article-content">
                                <span className="auth-article-badge">
                                  {(art.category || "SECURITY INSIGHT").replace(/-/g, " ").toUpperCase()}
                                </span>
                                <h3 className="auth-article-title">{art.title}</h3>
                                <div className="auth-article-meta">
                                  <span>
                                    <i className="bi bi-calendar3" />{" "}
                                    {art.published_at || art.date
                                      ? new Date(art.published_at || art.date).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })
                                      : ""}
                                  </span>
                                  <span>
                                    <i className="bi bi-eye" /> {art.view_count || art.views || 0}
                                  </span>
                                </div>
                              </div>
                              <div className="auth-article-arrow">
                                <LuChevronRight />
                              </div>
                            </div>
                          )}
                        />
                      ) : (
                        <div style={{ padding: "36px 20px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", textAlign: "center" }}>
                          <LuFileText size={32} style={{ color: "#94a3b8", marginBottom: "8px" }} />
                          <h4 style={{ margin: "0 0 6px", fontSize: "0.95rem", color: "#334155", fontWeight: 600 }}>No published articles yet</h4>
                          <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                            Articles you publish as a contributor will appear here on your public profile.
                          </p>
                        </div>
                      )}
                    </section>
                  ) : (
                    <section className="auth-articles-section">
                      <div className="auth-articles-header">
                        <h2 className="auth-block-title">
                          Recent Comments & Discussions ({member?.comment_count != null ? member.comment_count : (member?.recent_comments?.length || 0)})
                        </h2>
                      </div>

                      {member?.recent_comments && member.recent_comments.length > 0 ? (
                        <div className="auth-articles-list">
                          {member.recent_comments.map((comm) => (
                            <div
                              key={comm.id}
                              className="auth-article-row"
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                const url = `/${(comm.post_category || "blogs").toLowerCase()}/${comm.post_slug || comm.post_id}`;
                                window.open(url, "_blank");
                              }}
                            >
                              {comm.post_image ? (
                                <img
                                  src={comm.post_image}
                                  alt={comm.post_title || "Article"}
                                  className="auth-article-thumb"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div
                                  className="auth-article-thumb-placeholder"
                                  style={{
                                    background: "#fff7ed",
                                    borderColor: "#fed7aa",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <LuMessageSquare size={22} color="#ea580c" />
                                </div>
                              )}
                              <div className="auth-article-content">
                                <span className="auth-article-badge" style={{ background: "#eff6ff", color: "#2563eb" }}>
                                  {(comm.post_category || "COMMUNITY DISCUSSION").replace(/-/g, " ").toUpperCase()}
                                </span>
                                <h3 className="auth-article-title" style={{ fontSize: "0.88rem", color: "#0f172a" }}>
                                  {comm.post_title || comm.post_id || "Article Discussion"}
                                </h3>
                                <p style={{ margin: "2px 0 6px", fontSize: "0.78rem", color: "#475569", lineHeight: 1.4, fontStyle: "italic" }}>
                                  "{comm.content?.length > 120 ? comm.content.substring(0, 120) + "..." : comm.content}"
                                </p>
                                <div className="auth-article-meta">
                                  <span>
                                    <i className="bi bi-calendar3" />{" "}
                                    {comm.timestamp
                                      ? new Date(comm.timestamp).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })
                                      : ""}
                                  </span>
                                  <span style={{ color: "#16a34a", fontWeight: 600 }}>
                                    <i className="bi bi-check2-circle" /> Approved Contribution
                                  </span>
                                </div>
                              </div>
                              <div className="auth-article-arrow">
                                <LuChevronRight />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: "36px 20px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", textAlign: "center" }}>
                          <LuMessageSquare size={32} style={{ color: "#94a3b8", marginBottom: "8px" }} />
                          <h4 style={{ margin: "0 0 6px", fontSize: "0.95rem", color: "#334155", fontWeight: 600 }}>No community comments yet</h4>
                          <p style={{ margin: "0 0 12px", fontSize: "0.82rem", color: "#64748b" }}>
                            Participate in discussions on SAP Security articles to share insights and build your profile reputation.
                          </p>
                          <a href="/learning" className="auth-tag" style={{ textDecoration: "none", display: "inline-block" }}>
                            Explore Articles & Join Discussions →
                          </a>
                        </div>
                      )}
                    </section>
                  )}

                  {/* SAP Certifications Section - Only render if real certifications exist */}
                  {activeCertifications.length > 0 && (
                    <CarouselSection
                      items={activeCertifications}
                      pageSize={3}
                      title={`SAP Certifications (${activeCertifications.length})`}
                      sectionClassName="auth-cert-section"
                      headerClassName="auth-cert-header"
                      titleClassName="auth-block-title"
                      listClassName="auth-cert-cards-grid"
                      renderItem={(cert, idx) => (
                          <div key={idx} className="auth-cert-box">
                            <div className="auth-cert-icon">
                              <LuCircleCheck size={18} />
                            </div>
                            <div>
                              <p className="auth-cert-title">{cert.name}</p>
                              {cert.issuer && (
                                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                  {cert.issuer} {cert.issue_date && `• ${cert.issue_date}`}
                                </span>
                              )}
                            </div>
                          </div>
                      )}
                    />
                  )}
                </main>
              </div>
            </div>

            {/* Modal Bottom Footer Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                padding: "16px 28px",
                borderTop: "1px solid #eef2f6",
                background: "#ffffff",
                borderRadius: "0 0 24px 24px",
              }}
            >
              <button
                type="button"
                className="profile-settings-btn-cancel"
                onClick={() => setShowPreviewModal(false)}
              >
                Close Preview
              </button>
              <button
                type="button"
                className="profile-settings-btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop Modal */}
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
