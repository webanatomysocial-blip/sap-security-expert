import React from "react";
import SimpleRTE from "../SimpleRTE.jsx";

const FaqSettings = ({
  faqs,
  handleFAQChange,
  addFAQ,
  removeFAQ,
  rteImageUpload,
}) => {
  const [expandedIndex, setExpandedIndex] = React.useState(faqs.length - 1);

  const validCount = faqs.filter((f) => f.question && f.answer).length;

  return (
    <div className="admin-card">
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
        <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.2rem" }}>FAQs</h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {validCount > 0 ? (
            <span
              style={{
                background: "#fef3c7",
                color: "#92400e",
                fontSize: "0.72rem",
                fontWeight: "700",
                padding: "3px 10px",
                borderRadius: "50px",
                border: "1px solid #fde68a",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <i className="bi bi-stars" />
              {validCount} FAQ{validCount > 1 ? "s" : ""} → Google FAQ Rich Result
            </span>
          ) : (
            <span
              style={{
                background: "#f1f5f9",
                color: "#94a3b8",
                fontSize: "0.72rem",
                fontWeight: "600",
                padding: "3px 10px",
                borderRadius: "50px",
                border: "1px solid #e2e8f0",
              }}
            >
              No FAQs — no FAQ rich result
            </span>
          )}
        </div>
      </div>
      {validCount > 0 && (
        <div
          style={{
            background: "#fefce8",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "16px",
            fontSize: "0.8rem",
            color: "#78350f",
            lineHeight: "1.5",
          }}
        >
          <i className="bi bi-info-circle-fill" style={{ marginRight: "6px" }} />
          <strong>FAQ Schema active.</strong> Each Q&A below is automatically included as a{" "}
          <code style={{ background: "#fef9c3", padding: "1px 4px", borderRadius: "3px" }}>FAQPage</code>{" "}
          JSON-LD block. Answers are stripped to plain text in the schema — rich formatting
          still appears on the published page.
        </div>
      )}
      {faqs.map((faq, index) => {
        const isExpanded = expandedIndex === index;
        return (
          <div
            key={index}
            className="faq-editor-item"
            style={{
              background: "#f8fafc",
              padding: isExpanded ? "24px" : "12px 24px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              marginBottom: "16px",
              position: "relative",
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "800",
                    color: "var(--slate-500)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  FAQ #{index + 1}
                </span>
                {!isExpanded && (
                  <span style={{ fontWeight: 600, color: "var(--slate-900)", fontSize: "0.95rem" }}>
                    {faq.question || "(Empty Question)"}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFAQ(index);
                  }}
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    borderRadius: "6px",
                  }}
                >
                  Remove
                </button>
                <i className={`bi bi-chevron-${isExpanded ? "up" : "down"}`} style={{ color: "var(--slate-400)" }}></i>
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px dashed #e2e8f0" }}>
                <div style={{ marginBottom: "20px" }}>
                  <label
                    className="form-label"
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                      color: "#475569",
                    }}
                  >
                    Question
                  </label>
                  <input
                    placeholder="What is the main question?"
                    value={faq.question}
                    onChange={(e) =>
                      handleFAQChange(index, "question", e.target.value)
                    }
                    className="form-control"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label
                    className="form-label"
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                      color: "#475569",
                    }}
                  >
                    Answer (Rich Text)
                  </label>
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      overflow: "hidden",
                    }}
                  >
                    <SimpleRTE
                      value={faq.answer}
                      onChange={(content) =>
                        handleFAQChange(index, "answer", content)
                      }
                      onImageUpload={rteImageUpload}
                      minHeight="150px"
                      maxHeight="500px"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        className="btn-edit"
        onClick={addFAQ}
        style={{ marginTop: "12px" }}
      >
        + Add FAQ
      </button>
    </div>
  );
};

export default FaqSettings;
