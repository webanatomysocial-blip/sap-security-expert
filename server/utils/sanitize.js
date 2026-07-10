const sanitizeHtml = require('sanitize-html');

// Blog content is authored as rich HTML (contributors + admins) and rendered
// via dangerouslySetInnerHTML on the frontend (DynamicBlog.jsx, SSR blog page).
// Strip anything that could execute script or exfiltrate data (script tags,
// event handlers, javascript: URLs) while keeping the formatting/embed tags
// blog content actually uses.
const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img', 'h1', 'h2', 'figure', 'figcaption', 'video', 'source', 'iframe', 'span',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    video: ['src', 'controls', 'width', 'height'],
    source: ['src', 'type'],
    iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'title'],
    '*': ['class', 'id'],
  },
  // Only allow embeds from trusted video/doc hosts — arbitrary iframe src is
  // itself an XSS/clickjacking vector even with sandboxing.
  allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com'],
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
};

function sanitizeBlogHtml(html) {
  if (typeof html !== 'string' || !html) return html;
  return sanitizeHtml(html, sanitizeOptions);
}

module.exports = { sanitizeBlogHtml };
