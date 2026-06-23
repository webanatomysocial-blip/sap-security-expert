import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import {
  getAdminLearnings,
  saveLearning,
  deleteLearning,
  uploadBlogImage,
} from "../../services/api";

import BlogList from "./blogs/BlogList";
import { compressImage } from "../../utils/compressImage";
import BlogEditor from "./blogs/BlogEditor";
import SeoSettings from "./blogs/SeoSettings";
import SchemaSettings from "./blogs/SchemaSettings";
import CtaSettings from "./blogs/CtaSettings";
import FaqSettings from "./blogs/FaqSettings";

const MODULE_CATEGORIES = [
  { value: "security-fundamentals",  label: "Module 01 — Security Fundamentals" },
  { value: "user-management",        label: "Module 02 — User Management" },
  { value: "role-management",        label: "Module 03 — Role Management" },
  { value: "authorization-concepts", label: "Module 04 — Authorization Concepts" },
  { value: "audit-compliance",       label: "Module 05 — Audit & Compliance" },
  { value: "grc-advanced",           label: "Module 06 — GRC & Advanced Topics" },
];

const initialFormState = {
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  date: new Date().toISOString().split("T")[0],
  image: "",
  image_alt: "",
  category: "security-fundamentals",
  secondary_categories: [],
  tags: "",
  faqs: [],
  cta_title: "",
  cta_description: "",
  cta_button_text: "",
  cta_button_link: "",
  related_blogs: [],
  co_authors: [],
  schema_type: "Article",
  article_section: "",
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
};

const safeJsonParse = (val, fallback = []) => {
  if (!val || val === "null") return fallback;
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : fallback; } catch { return fallback; }
};

const getSeoScore = (data) => {
  let score = 100;
  if ((data.meta_title || "").length < 50 || (data.meta_title || "").length > 70) score -= 15;
  if ((data.meta_description || "").length < 140 || (data.meta_description || "").length > 165) score -= 15;
  const wc = (data.content || "").replace(/<[^>]*>/g, "").split(/\s+/).filter(w => w.trim()).length;
  if (wc < 600) score -= 20;
  if (!data.image) score -= 10;
  if ((data.meta_description || "").length >= 120) score += 5;
  if ((data.meta_keywords || "").split(",").length >= 3) score += 5;
  return Math.min(100, Math.max(0, score));
};

const getScoreColor = (s) => {
  if (s >= 80) return { bg: "#dcfce7", text: "#166534" };
  if (s >= 60) return { bg: "#fef9c3", text: "#ca8a04" };
  return { bg: "#fee2e2", text: "#991b1b" };
};

const generateSlug = (title) =>
  title.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");

const formatDateLabel = (str) => {
  if (!str) return "No Date";
  const d = new Date(str.includes(" ") ? str.replace(" ", "T") + "Z" : str + "T00:00:00Z");
  return isNaN(d.getTime()) ? str : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const AdminLearnings = () => {
  const [learnings, setLearnings] = useState([]);
  const [view, setView] = useState("list");
  const [formData, setFormData] = useState(initialFormState);
  const [uploading, setUploading] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());
  const [activeTab, setActiveTab] = useState("live");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  const { addToast } = useToast();
  const { openConfirm } = useConfirm();

  useEffect(() => { fetchLearnings(); }, []);

  const fetchLearnings = async () => {
    try {
      const res = await getAdminLearnings();
      if (res.data) {
        setLearnings(res.data.map(item => ({
          ...item,
          faqs: safeJsonParse(item.faqs),
          secondary_categories: safeJsonParse(item.secondary_categories),
          co_authors: safeJsonParse(item.co_authors),
          related_blogs: safeJsonParse(item.related_blogs),
        })));
      }
    } catch { addToast("Could not load learnings.", "error"); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === "title" && !prev.id) next.slug = generateSlug(value);
      return next;
    });
  };

  const handleContentChange = (content) => setFormData(prev => ({ ...prev, content }));

  const handleFAQChange = (index, field, value) => {
    const updated = [...formData.faqs];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, faqs: updated }));
  };
  const addFAQ = () => setFormData(prev => ({ ...prev, faqs: [...prev.faqs, { question: "", answer: "" }] }));
  const removeFAQ = (index) => setFormData(prev => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== index) }));

  const rteImageUpload = async (file) => {
    const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200 });
    const body = new FormData();
    body.append("image", compressed); body.append("type", "content");
    try {
      const res = await uploadBlogImage(body);
      if (res.data.status === "success") return res.data.path;
      addToast(res.data.message || "Upload failed", "error");
    } catch { addToast("Connection error", "error"); }
    return null;
  };

  const handleImageUpload = async (file) => {
    setUploading(true);
    const compressed = await compressImage(file, { maxWidth: 1920, maxHeight: 1080 });
    const body = new FormData();
    body.append("image", compressed); body.append("type", "featured");
    try {
      const res = await uploadBlogImage(body);
      if (res.data.status === "success") {
        setFormData(prev => ({ ...prev, image: res.data.path }));
        setImageVersion(Date.now());
        addToast("Image uploaded", "success");
      } else { addToast(res.data.message || "Upload failed", "error"); }
    } catch { addToast("Connection error", "error"); }
    finally { setUploading(false); }
  };

  const handleEdit = (item) => {
    setFormData({
      ...initialFormState,
      ...item,
      date: item.date ? item.date.split(" ")[0].substring(0, 10) : new Date().toISOString().split("T")[0],
      faqs: safeJsonParse(item.faqs),
      secondary_categories: safeJsonParse(item.secondary_categories),
      co_authors: safeJsonParse(item.co_authors),
      related_blogs: safeJsonParse(item.related_blogs),
      schema_type: item.schema_type || "Article",
      article_section: item.article_section || "",
    });
    setView("editor");
  };

  const handleDelete = (id) => {
    openConfirm({
      title: "Delete Learning Article?",
      message: "Are you sure? This cannot be undone.",
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteLearning(id);
          fetchLearnings();
          addToast("Deleted successfully", "success");
        } catch { addToast("Delete failed", "error"); }
      },
    });
  };

  const handleSave = async (status = "approved") => {
    if (!formData.title || !formData.category) {
      addToast(!formData.title ? "Title is required" : "Please select a module", "error");
      return;
    }
    const payload = {
      ...formData,
      related_blogs: JSON.stringify(formData.related_blogs || []),
      seo_score: getSeoScore(formData),
      status,
    };
    delete payload.author;
    if (!payload.date) payload.date = new Date().toISOString().slice(0, 19).replace("T", " ");
    try {
      const res = await saveLearning(payload);
      if (res.data.status === "success") {
        fetchLearnings();
        setView("list");
        setFormData(initialFormState);
        addToast("Learning article saved", "success");
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Save failed", "error");
    }
  };

  const liveItems    = learnings.filter(i => i.status === "approved" || i.status === "published");
  const draftItems   = learnings.filter(i => i.status === "draft");
  const pendingItems = learnings.filter(i => i.submission_status === "submitted" || i.submission_status === "edited");
  const rejectedItems = learnings.filter(i => i.submission_status === "rejected");

  const visibleItems = learnings
    .filter(i => {
      if (activeTab === "live")     return i.status === "approved" || i.status === "published";
      if (activeTab === "drafts")   return i.status === "draft";
      if (activeTab === "pending")  return i.submission_status === "submitted" || i.submission_status === "edited";
      if (activeTab === "rejected") return i.submission_status === "rejected";
      return true;
    })
    .filter(i => {
      const matchSearch = i.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = filterCategory === "All" || i.category === filterCategory;
      return matchSearch && matchCat;
    });

  return (
    <div className="admin-page-wrapper">
      <div className="page-header">
        <h3>Learning Hub Management</h3>

        {view === "list" && (
          <div className="status-filter-tabs" style={{ margin: 0 }}>
            <button className={activeTab === "live" ? "active" : ""} onClick={() => setActiveTab("live")}>
              Live{liveItems.length > 0 && <span className="badge-count" style={{ background: "#16a34a", color: "#fff", borderRadius: "12px", padding: "1px 7px", fontSize: "0.72rem", marginLeft: "4px" }}>{liveItems.length}</span>}
            </button>
            <button className={activeTab === "drafts" ? "active" : ""} onClick={() => setActiveTab("drafts")}>
              Drafts{draftItems.length > 0 && <span className="badge-count" style={{ background: "#d97706", color: "#fff", borderRadius: "12px", padding: "1px 7px", fontSize: "0.72rem", marginLeft: "4px" }}>{draftItems.length}</span>}
            </button>
            <button className={activeTab === "pending" ? "active" : ""} onClick={() => setActiveTab("pending")}>
              Pending{pendingItems.length > 0 && <span className="badge-count" style={{ background: "#3b82f6", color: "#fff", borderRadius: "12px", padding: "1px 7px", fontSize: "0.72rem", marginLeft: "4px" }}>{pendingItems.length}</span>}
            </button>
            <button className={activeTab === "rejected" ? "active" : ""} onClick={() => setActiveTab("rejected")}>
              Rejected{rejectedItems.length > 0 && <span className="badge-count" style={{ background: "#ef4444", color: "#fff", borderRadius: "12px", padding: "1px 7px", fontSize: "0.72rem", marginLeft: "4px" }}>{rejectedItems.length}</span>}
            </button>
          </div>
        )}

        <div className="page-header-actions">
          {view === "list" ? (
            <button className="btn-approve btn-sm" onClick={() => { setFormData(initialFormState); setView("editor"); }}>
              + New Learning Article
            </button>
          ) : (
            <button className="btn-reject btn-sm" onClick={() => setView("list")}>Cancel</button>
          )}
        </div>
      </div>

      {view === "list" && (
        <div className="admin-filter-bar">
          <div className="search-box" style={{ flex: 1 }}>
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Search learning articles by title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="form-control"
            style={{ width: "240px", flexShrink: 0 }}
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="All">All Modules</option>
            {MODULE_CATEGORIES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      )}

      {view === "list" ? (
        <BlogList
          blogs={visibleItems}
          setBlogs={setLearnings}
          onEdit={handleEdit}
          onDelete={handleDelete}
          formatDate={formatDateLabel}
          getScoreColor={getScoreColor}
          isAdmin={true}
        />
      ) : (
        <BlogEditor
          formData={formData}
          handleInputChange={handleInputChange}
          handleContentChange={handleContentChange}
          rteImageUpload={rteImageUpload}
          handleImageUpload={handleImageUpload}
          uploading={uploading}
          imageVersion={imageVersion}
          blogs={learnings}
          authors={[]}
          isAdmin={true}
          customCategories={MODULE_CATEGORIES}
          categoryHint={`Learning article URL: /learning/${formData.category || "module"}/${formData.slug || "slug"}`}
          onSave={() => handleSave("approved")}
          onSaveDraft={() => handleSave("draft")}
        >
          <SeoSettings
            formData={formData}
            handleInputChange={handleInputChange}
            getSeoScore={getSeoScore}
            getScoreColor={getScoreColor}
          />
          <FaqSettings
            faqs={formData.faqs}
            handleFAQChange={handleFAQChange}
            addFAQ={addFAQ}
            removeFAQ={removeFAQ}
            rteImageUpload={rteImageUpload}
          />
          <SchemaSettings
            formData={formData}
            handleInputChange={handleInputChange}
          />
          <CtaSettings
            formData={formData}
            handleInputChange={handleInputChange}
          />
        </BlogEditor>
      )}
    </div>
  );
};

export default AdminLearnings;
