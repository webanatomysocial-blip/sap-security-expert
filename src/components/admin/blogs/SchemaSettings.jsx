import React, { useState } from "react";

const SCHEMA_TYPES = [
  {
    value: "BlogPosting",
    label: "BlogPosting",
    desc: "Standard blog article. Use for most posts.",
    icon: "bi-journal-text",
  },
  {
    value: "Article",
    label: "Article",
    desc: "General news/editorial content.",
    icon: "bi-newspaper",
  },
  {
    value: "TechArticle",
    label: "TechArticle",
    desc: "Technical how-to or reference guide. Best for step-by-step SAP configuration posts.",
    icon: "bi-code-square",
  },
  {
    value: "HowToArticle",
    label: "HowToArticle",
    desc: "Process walkthrough with numbered steps.",
    icon: "bi-list-ol",
  },
];

const LABEL_MAP = {
  "sap-security": "SAP Security",
  "sap-s4hana-security": "SAP S/4HANA Security",
  "sap-fiori-security": "SAP Fiori Security",
  "sap-btp-security": "SAP BTP Security",
  "sap-public-cloud": "SAP Public Cloud",
  "sap-sac-security": "SAP Analytics Cloud Security",
  "sap-cis": "SAP CIS",
  "sap-successfactors-security": "SuccessFactors Security",
  "sap-security-other": "SAP Security",
  "sap-access-control": "SAP Access Control",
  "sap-process-control": "SAP Process Control",
  "sap-iag": "SAP IAG",
  "sap-grc": "SAP GRC",
  "sap-cybersecurity": "Cybersecurity",
  "product-reviews": "Product Reviews",
  "podcasts": "Expert Voices & Podcasts",
  "videos": "Videos",
  "expert-recommendations": "Expert Recommendations",
};

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").trim();
}

function buildPreview(formData) {
  const type = formData.schema_type || "BlogPosting";
  const section = formData.article_section || LABEL_MAP[formData.category] || formData.category || "";
  const wordCount = stripHtml(formData.content || "").split(/\s+/).filter(Boolean).length;
  const faqCount = (formData.faqs || []).filter((f) => f.question && f.answer).length;

  const schema = {
    "@context": "https://schema.org",
    "@type": type,
    headline: formData.meta_title || formData.title || "Article Title",
    description: formData.meta_description || formData.excerpt || "",
    ...(section && { articleSection: section }),
    ...(wordCount > 0 && { wordCount }),
    inLanguage: "en",
    isAccessibleForFree: !formData.is_members_only,
    author: { "@type": "Person", name: "Author Name" },
    publisher: {
      "@type": "Organization",
      name: "SAP Security Expert",
    },
  };

  const lines = [JSON.stringify(schema, null, 2)];

  if (faqCount > 0) {
    lines.push("\n// + FAQPage schema with " + faqCount + " Q&A pair" + (faqCount > 1 ? "s" : ""));
  }

  return lines.join("\n");
}

const SchemaSettings = ({ formData, handleInputChange }) => {
  const [showPreview, setShowPreview] = useState(false);

  const currentType = formData.schema_type || "BlogPosting";
  const faqCount = (formData.faqs || []).filter((f) => f.question && f.answer).length;
  const wordCount = stripHtml(formData.content || "").split(/\s+/).filter(Boolean).length;

  return (
    <div className="admin-card">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          paddingBottom: "12px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "#eff6ff",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1e40af",
              fontSize: "1rem",
            }}
          >
            <i className="bi bi-diagram-3" />
          </div>
          <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.2rem" }}>
            Schema / Structured Data
          </h3>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Status badges */}
          <span
            style={{
              background: "#dcfce7",
              color: "#15803d",
              fontSize: "0.72rem",
              fontWeight: "700",
              padding: "3px 10px",
              borderRadius: "50px",
              border: "1px solid #bbf7d0",
            }}
          >
            <i className="bi bi-check-circle-fill" style={{ marginRight: "4px" }} />
            {currentType}
          </span>
          {faqCount > 0 && (
            <span
              style={{
                background: "#fef3c7",
                color: "#92400e",
                fontSize: "0.72rem",
                fontWeight: "700",
                padding: "3px 10px",
                borderRadius: "50px",
                border: "1px solid #fde68a",
              }}
            >
              <i className="bi bi-question-circle-fill" style={{ marginRight: "4px" }} />
              {faqCount} FAQ{faqCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "20px",
          fontSize: "0.82rem",
          color: "#1e40af",
          lineHeight: "1.6",
        }}
      >
        <strong>Google Rich Results:</strong> These settings control the JSON-LD structured data
        embedded in the page. The correct schema type can unlock Article, FAQ, and How-To rich
        results in Google Search.{" "}
        <a
          href="https://search.google.com/test/rich-results"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#1d4ed8", fontWeight: "600" }}
        >
          Test with Rich Results Tool ↗
        </a>
      </div>

      {/* Schema Type selector */}
      <div className="form-group">
        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <i className="bi bi-tag-fill" style={{ color: "#6366f1" }} />
          Article @type
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {SCHEMA_TYPES.map((t) => (
            <div
              key={t.value}
              onClick={() =>
                handleInputChange({ target: { name: "schema_type", value: t.value } })
              }
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                border: `2px solid ${currentType === t.value ? "#3b82f6" : "#e2e8f0"}`,
                background: currentType === t.value ? "#eff6ff" : "#f8fafc",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <i
                  className={`bi ${t.icon}`}
                  style={{ color: currentType === t.value ? "#1e40af" : "#94a3b8", fontSize: "1rem" }}
                />
                <span
                  style={{
                    fontWeight: "700",
                    fontSize: "0.85rem",
                    color: currentType === t.value ? "#1e40af" : "#334155",
                  }}
                >
                  {t.label}
                </span>
                {currentType === t.value && (
                  <i className="bi bi-check-circle-fill" style={{ marginLeft: "auto", color: "#3b82f6", fontSize: "0.85rem" }} />
                )}
              </div>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b", lineHeight: "1.4" }}>
                {t.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Article Section */}
      <div className="form-group">
        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <i className="bi bi-bookmark-fill" style={{ color: "#6366f1" }} />
          Article Section
          <span style={{ fontWeight: "400", color: "#94a3b8", fontSize: "0.78rem" }}>
            (articleSection in schema)
          </span>
        </label>
        <input
          className="form-control"
          name="article_section"
          value={formData.article_section || ""}
          onChange={handleInputChange}
          placeholder={
            LABEL_MAP[formData.category] ||
            "e.g. SAP GRC, Identity Governance, Cloud Security"
          }
        />
        <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px", display: "block" }}>
          Leave blank to auto-use the primary category label. Helps Google understand
          the subject area of this article.
        </span>
      </div>

      {/* Auto-calculated stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {[
          {
            label: "Word Count",
            value: wordCount,
            good: wordCount >= 600,
            hint: wordCount < 600 ? "Aim for 600+" : "Good",
            icon: "bi-file-word",
          },
          {
            label: "FAQ Pairs",
            value: faqCount,
            good: faqCount > 0,
            hint: faqCount === 0 ? "Add FAQs below" : "FAQ schema active",
            icon: "bi-question-lg",
          },
          {
            label: "Members Only",
            value: formData.is_members_only ? "Yes" : "No",
            good: !formData.is_members_only,
            hint: formData.is_members_only ? "isAccessibleForFree: false" : "isAccessibleForFree: true",
            icon: "bi-shield-lock",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: stat.good ? "#f0fdf4" : "#fff7ed",
              border: `1px solid ${stat.good ? "#bbf7d0" : "#fed7aa"}`,
              borderRadius: "8px",
              padding: "10px 12px",
              textAlign: "center",
            }}
          >
            <i
              className={`bi ${stat.icon}`}
              style={{
                fontSize: "1.1rem",
                color: stat.good ? "#16a34a" : "#ea580c",
                display: "block",
                marginBottom: "4px",
              }}
            />
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: "800",
                color: stat.good ? "#15803d" : "#c2410c",
                lineHeight: 1,
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
              {stat.label}
            </div>
            <div
              style={{
                fontSize: "0.65rem",
                color: stat.good ? "#16a34a" : "#ea580c",
                fontWeight: "600",
                marginTop: "2px",
              }}
            >
              {stat.hint}
            </div>
          </div>
        ))}
      </div>

      {/* JSON-LD Preview toggle */}
      <button
        type="button"
        onClick={() => setShowPreview((v) => !v)}
        style={{
          background: "none",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "8px 14px",
          fontSize: "0.8rem",
          color: "#475569",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          width: "100%",
          justifyContent: "center",
          fontWeight: "600",
        }}
      >
        <i className={`bi bi-${showPreview ? "eye-slash" : "eye"}`} />
        {showPreview ? "Hide" : "Preview"} JSON-LD Output
      </button>

      {showPreview && (
        <pre
          style={{
            marginTop: "12px",
            background: "#0f172a",
            color: "#7dd3fc",
            borderRadius: "10px",
            padding: "16px",
            fontSize: "0.72rem",
            overflowX: "auto",
            lineHeight: "1.6",
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          {buildPreview(formData)}
        </pre>
      )}
    </div>
  );
};

export default SchemaSettings;
