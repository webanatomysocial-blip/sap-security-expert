import React, { useState, useEffect } from "react";
import ActionMenu from "./ActionMenu";
// next-disabled: import "../../css/AdminDashboard.css";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import { useAuth } from "../../context/AuthContext";
import {
  getBlogs,
  saveBlog,
  deleteBlog,
  uploadBlogImage,
  bulkRecalculatePlagiarism,
  getAuthors,
} from "../../services/api";

import { compressImage } from "../../utils/compressImage";
// Refactored Sub-components
import BlogList from "./blogs/BlogList";
import BlogEditor from "./blogs/BlogEditor";
import SeoSettings from "./blogs/SeoSettings";
import SchemaSettings from "./blogs/SchemaSettings";
import CtaSettings from "./blogs/CtaSettings";
import FaqSettings from "./blogs/FaqSettings";

const AdminBlogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [view, setView] = useState("list"); // 'list' | 'editor'
  const { addToast } = useToast();
  const { openConfirm } = useConfirm();
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const initialFormState = {
    id: "",
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    date: new Date().toISOString().split("T")[0],
    image: "",
    image_alt: "",
    category: "",
    secondary_categories: [],
    tags: "",
    faqs: [],
    cta_title: "",
    cta_description: "",
    cta_button_text: "",
    cta_button_link: "",
    related_blogs: [],
    co_authors: [],
    author_id: "", // Admin-only: assign contributor as author
    schema_type: "BlogPosting",
    article_section: "",
    is_premium: 0,
    credits_required: 1,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("live"); // "live" | "drafts" | "pending" | "rejected"

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  useEffect(() => {
    fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAdmin) fetchAuthors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const safeJsonParse = (val, fallback = []) => {
    if (!val || val === "null") return fallback;
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  };

  const fetchAuthors = async () => {
    try {
      const res = await getAuthors();
      const list = Array.isArray(res.data) ? res.data : res.data?.data;
      if (list) setAuthors(list);
    } catch (err) {
      console.warn("Could not load authors", err);
    }
  };

  const fetchBlogs = async () => {
    try {
      const res = await getBlogs(role === "contributor" ? { author_only: 1 } : {});
      if (res.data) {
        const parsedData = res.data.map((blog) => ({
          ...blog,
          faqs: safeJsonParse(blog.faqs),
          draft_faqs: safeJsonParse(blog.draft_faqs),
          secondary_categories: safeJsonParse(blog.secondary_categories),
          draft_secondary_categories: safeJsonParse(blog.draft_secondary_categories),
        }));
        setBlogs(parsedData);
      }
    } catch (err) {
      console.error(err);
      addToast("We couldn't load the blogs right now.", "error");
    }
  };

  const getSeoScore = (data) => {
    let score = 100;
    const title = data.meta_title || "";
    const desc = data.meta_description || "";
    const content = data.content || "";

    if (title.length < 50 || title.length > 70) score -= 15;
    if (desc.length < 140 || desc.length > 165) score -= 15;

    const text = content.replace(/<[^>]*>/g, "");
    const wordCount = text
      .split(/\s+/)
      .filter((w) => w.trim().length > 0).length;
    if (wordCount < 600) score -= 20;

    if (!data.image) score -= 10;
    if (data.meta_description && data.meta_description.length >= 120) score += 5;
    if (data.meta_keywords && data.meta_keywords.split(",").length >= 3) score += 5;
    return Math.min(100, Math.max(0, score));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return { bg: "#dcfce7", text: "#166534" };
    if (score >= 60) return { bg: "#fef9c3", text: "#ca8a04" };
    return { bg: "#fee2e2", text: "#991b1b" };
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === "title" && !prev.id) newData.slug = generateSlug(value);
      return newData;
    });
  };

  const handleContentChange = (content) =>
    setFormData((prev) => ({ ...prev, content }));

  const handleFAQChange = (index, field, value) => {
    const newFAQs = [...formData.faqs];
    newFAQs[index][field] = value;
    setFormData((prev) => ({ ...prev, faqs: newFAQs }));
  };

  const addFAQ = () =>
    setFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { question: "", answer: "" }],
    }));
  const removeFAQ = (index) =>
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));

  const rteImageUpload = async (file) => {
    const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200 });
    const body = new FormData();
    body.append("image", compressed);
    body.append("type", "content");
    try {
      const res = await uploadBlogImage(body);
      if (res.data.status === "success") return res.data.path;
      addToast(res.data.message || "Upload failed", "error");
    } catch (err) {
      addToast("Connection error", "error");
    }
    return null;
  };

  const handleImageUpload = async (file) => {
    setUploading(true);
    const compressed = await compressImage(file, { maxWidth: 1920, maxHeight: 1080 });
    const body = new FormData();
    body.append("image", compressed);
    body.append("type", "featured");
    try {
      const res = await uploadBlogImage(body);
      if (res.data.status === "success") {
        setFormData((prev) => ({ ...prev, image: res.data.path }));
        setImageVersion(Date.now());
        addToast("Image uploaded", "success");
      } else {
        addToast(res.data.message || "Upload failed", "error");
      }
    } catch (err) {
      addToast("Connection error", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (blog) => {
    const isEdited = blog.submission_status === "edited";
    const faqsSource =
      isEdited && blog.draft_faqs ? blog.draft_faqs : blog.faqs;

    setFormData({
      ...initialFormState,
      ...blog,
      title: isEdited ? blog.draft_title || blog.title : blog.title,
      content: isEdited ? blog.draft_content || blog.content : blog.content,
      excerpt: isEdited ? blog.draft_excerpt || blog.excerpt : blog.excerpt,
      image: isEdited ? blog.draft_image || blog.image : blog.image,
      image_alt: isEdited ? blog.draft_image_alt || blog.image_alt || "" : blog.image_alt || "",
      category: isEdited ? blog.draft_category || blog.category : blog.category,
      secondary_categories: safeJsonParse(
        isEdited
          ? blog.draft_secondary_categories || blog.secondary_categories
          : blog.secondary_categories
      ),
      date: blog.date
        ? blog.date.split(" ")[0].substring(0, 10)
        : new Date().toISOString().split("T")[0],
      faqs:
        typeof faqsSource === "string"
          ? JSON.parse(faqsSource || "[]")
          : faqsSource || [],
      related_blogs: safeJsonParse(blog.related_blogs),
      co_authors: safeJsonParse(blog.co_authors),
      author_id: blog.author_id || "",
      schema_type: blog.schema_type || "BlogPosting",
      article_section: blog.article_section || "",
    });
    setView("editor");
  };

  const handleDelete = (id) => {
    openConfirm({
      title: "Delete Blog?",
      message: "Are you sure? This cannot be undone.",
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await deleteBlog(id);
          if (res.status === 200 || res.status === 204) {
            fetchBlogs();
            addToast("Deleted successfully", "success");
          }
        } catch (err) {
          console.error(err);
          addToast("Delete failed", "error");
        }
      },
    });
  };

  const handleSave = async (status = "approved") => {
    if (saving) return;
    if (
      !formData.title ||
      !formData.category ||
      formData.category === "Select Category"
    ) {
      addToast(
        !formData.title ? "Title is required" : "Please select a category",
        "error",
      );
      return;
    }
    const payload = {
      ...formData,
      related_blogs: JSON.stringify(formData.related_blogs || []),
      seo_score: getSeoScore(formData),
    };
    delete payload.author;

    if (!payload.date) {
      const now = new Date();
      payload.date = now.toISOString().slice(0, 19).replace("T", " ");
    }

    const finalPayload = { ...payload, status };

    setSaving(true);
    try {
      const res = await saveBlog(finalPayload);
      if (res.data.status === "success") {
        fetchBlogs();
        setView("list");
        setFormData(initialFormState);
        addToast("Blog saved successfully", "success");
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkRecalculate = () => {
    openConfirm({
      title: "Recalculate All Missing Scores?",
      message:
        "This will process all blogs with 0% or 'Check Failed' status. It may take some time. Proceed?",
      confirmText: "Recalculate All",
      onConfirm: async () => {
        setIsBulkProcessing(true);
        try {
          const res = await bulkRecalculatePlagiarism();
          if (res.data.status === "success") {
            addToast(res.data.message, "success");
            fetchBlogs(); // Refresh entire list after bulk update
          } else {
            addToast(res.data.message || "Bulk update failed.", "error");
          }
        } catch (err) {
          console.error(err);
          addToast("Error during bulk recalculation.", "error");
        } finally {
          setIsBulkProcessing(false);
        }
      },
    });
  };

  const formatDateLabel = (dateString) => {
    if (!dateString) return "No Date";
    const d = new Date(
      dateString.includes(" ")
        ? dateString.replace(" ", "T") + "Z"
        : dateString + "T00:00:00Z",
    );
    return isNaN(d.getTime())
      ? dateString
      : d.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
  };

  return (
    <div className="admin-page-wrapper">
      <div className="page-header">
        <h3>Blog Management</h3>
        {view === "list" && (
          <div className="status-filter-tabs" style={{ margin: 0 }}>
            <button
              className={activeTab === "live" ? "active" : ""}
              onClick={() => setActiveTab("live")}
            >
              Live
            </button>
            <button
              className={activeTab === "drafts" ? "active" : ""}
              onClick={() => setActiveTab("drafts")}
            >
              Drafts
            </button>
            <button
              className={activeTab === "pending" ? "active" : ""}
              onClick={() => setActiveTab("pending")}
            >
              Pending
            </button>
            <button
              className={activeTab === "rejected" ? "active" : ""}
              onClick={() => setActiveTab("rejected")}
            >
              Rejected
            </button>
          </div>
        )}
        <div className="page-header-actions">
          {view === "list" ? (
            <button
              className="btn-approve btn-sm"
              onClick={() => {
                setFormData(initialFormState);
                setView("editor");
              }}
            >
              + New Blog Post
            </button>
          ) : (
            <button className="btn-reject btn-sm" onClick={() => setView("list")}>
              Cancel
            </button>
          )}

          {view === "list" && isAdmin && (
            <button
              className="btn-secondary btn-sm"
              onClick={handleBulkRecalculate}
              disabled={isBulkProcessing}
            >
              <i className={`bi ${isBulkProcessing ? "bi-hourglass-split" : "bi-arrow-repeat"}`}></i>
              {isBulkProcessing ? "Processing..." : "Recalculate Plagiarism"}
            </button>
          )}
        </div>
      </div>

      {view === "list" && (
        <div className="admin-filter-bar">
          <div className="search-box" style={{ flex: 1 }}>
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Search blogs by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="form-control"
            style={{ width: "200px", flexShrink: 0 }}
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
      )}

      {view === "list" ? (
        <BlogList
          blogs={blogs
            .filter((b) => {
              if (activeTab === "live")
                return (
                  (b.status === "approved" || b.status === "published") &&
                  b.submission_status !== "rejected"
                );
              if (activeTab === "drafts") return b.status === "draft";
              if (activeTab === "pending")
                return (
                  b.submission_status === "submitted" ||
                  b.submission_status === "edited"
                );
              if (activeTab === "rejected")
                return b.submission_status === "rejected";
              return true;
            })
            .filter((b) => {
              const matchesSearch =
                b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.author_name || "").toLowerCase().includes(searchQuery.toLowerCase());
              const matchesCategory =
                filterCategory === "All" || b.category === filterCategory;
              return matchesSearch && matchesCategory;
            })}
          setBlogs={setBlogs}
          onEdit={handleEdit}
          onDelete={handleDelete}
          formatDate={formatDateLabel}
          getScoreColor={getScoreColor}
          isAdmin={isAdmin}
          fetchBlogs={fetchBlogs}
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
          blogs={blogs}
          authors={authors}
          isAdmin={isAdmin}
          saving={saving}
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

export default AdminBlogs;
