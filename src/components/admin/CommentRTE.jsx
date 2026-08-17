import React, { useRef, useEffect } from "react";

/**
 * Minimal RTE for comment editing.
 * Toolbar: Bold, Italic, Bullet list, Numbered list — no code, no source, no media.
 * Value in/out: plain HTML (p, ul, ol, li, strong, em).
 */
const CommentRTE = ({ value, onChange }) => {
  const editorRef = useRef(null);
  const lastSynced = useRef(null);

  // Sync incoming value → DOM only when it actually changed externally
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = toEditorHtml(value || "");
    if (html !== lastSynced.current) {
      lastSynced.current = html;
      el.innerHTML = html;
    }
  }, [value]);

  const exec = (cmd, arg = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const emit = () => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    lastSynced.current = html;
    onChange?.(fromEditorHtml(html));
  };

  const btnStyle = (active) => ({
    padding: "4px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    background: active ? "#f1f5f9" : "#fff",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#374151",
  });

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 4, padding: "6px 8px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap" }}>
        <button type="button" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); exec("bold"); }} title="Bold">
          <strong>B</strong>
        </button>
        <button type="button" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); exec("italic"); }} title="Italic">
          <em>I</em>
        </button>
        <div style={{ width: 1, background: "#e2e8f0", margin: "0 4px" }} />
        <button type="button" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }} title="Bullet list">
          ≡ Bullets
        </button>
        <button type="button" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }} title="Numbered list">
          1. Numbers
        </button>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        style={{
          minHeight: 140,
          maxHeight: 320,
          overflowY: "auto",
          padding: "10px 12px",
          fontSize: "0.88rem",
          lineHeight: 1.6,
          color: "#1e293b",
          outline: "none",
        }}
      />
    </div>
  );
};

// Plain text (newlines) → editor HTML
function toEditorHtml(text) {
  if (!text) return "<p><br></p>";
  // If already HTML (starts with a tag), return as-is
  if (/^\s*<[a-z]/i.test(text)) return text;
  // Convert plain text newlines to <p> tags
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("") || "<p><br></p>";
}

// Editor HTML → stored value: normalize browser divs → p, strip dangerous tags
function fromEditorHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    // Chrome wraps new lines in <div>; normalize to <p>
    .replace(/<div>/gi, "<p>")
    .replace(/<\/div>/gi, "</p>")
    .trim();
}

export default CommentRTE;
