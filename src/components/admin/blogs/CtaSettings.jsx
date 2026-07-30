import React from "react";

const CtaSettings = ({ formData, handleInputChange }) => {
  return (
    <div className="admin-card">
      <h3
        style={{
          marginBottom: "20px",
          color: "#1e293b",
          fontSize: "1.2rem",
          paddingBottom: "12px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        Call to Action (CTA)
      </h3>
      <div className="form-group">
        <label className="form-label">CTA Title</label>
        <input
          name="cta_title"
          value={formData.cta_title || ""}
          onChange={handleInputChange}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label className="form-label">CTA Description</label>
        <textarea
          name="cta_description"
          value={formData.cta_description || ""}
          onChange={handleInputChange}
          className="form-control"
          rows="2"
        />
      </div>
      <div className="form-row">
        <div className="form-group half">
          <label className="form-label">Button Text</label>
          <input
            name="cta_button_text"
            value={formData.cta_button_text || ""}
            onChange={handleInputChange}
            className="form-control"
          />
        </div>
        <div className="form-group half">
          <label className="form-label">Button Link</label>
          <input
            type="url"
            name="cta_button_link"
            value={formData.cta_button_link || ""}
            onChange={handleInputChange}
            className="form-control"
            placeholder="https://..."
          />
        </div>
      </div>
    </div>
  );
};

export default CtaSettings;
