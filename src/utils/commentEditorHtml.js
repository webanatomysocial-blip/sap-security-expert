// Comment text is visitor-written and stored raw. Before it is loaded into the
// admin rich-text editor (which assigns innerHTML), it must be either escaped
// (plain text) or reduced to a small formatting allowlist (HTML).
const ALLOWED_TAGS = /^(p|br|ul|ol|li|strong|em|b|i)$/i;
const P_STYLE = 'style="margin:0 0 10px 0"';

const escapeText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function sanitizeCommentHtml(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?(script|style)\b[^>]*>?/gi, "")
    .replace(/<(\/?)([a-z][a-z0-9]*)[^>]*>?/gi, (_, slash, tag) => {
      if (!ALLOWED_TAGS.test(tag)) return "";
      return tag.toLowerCase() === "p" && !slash ? `<p ${P_STYLE}>` : `<${slash}${tag.toLowerCase()}>`;
    });
}

export function commentToEditorHtml(text) {
  if (!text) return "<p><br></p>";
  if (/<[a-z/!]/i.test(text)) {
    const clean = sanitizeCommentHtml(text);
    return clean.trim() ? clean.replace(/<p(?![^>]*style)[^>]*>/gi, `<p ${P_STYLE}>`) : "<p><br></p>";
  }
  return text
    .split(/\n+/)
    .map((para) => `<p ${P_STYLE}>${para ? escapeText(para) : "<br>"}</p>`)
    .join("") || `<p ${P_STYLE}><br></p>`;
}
