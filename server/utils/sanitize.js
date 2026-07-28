const sanitizeHtml = require('sanitize-html');

// Blog content is authored as rich HTML (contributors + admins) and rendered
// via dangerouslySetInnerHTML on the frontend (DynamicBlog.jsx, SSR blog page).
// Strip anything that could execute script or exfiltrate data (script tags,
// event handlers, javascript: URLs) while keeping the formatting/embed tags
// blog content actually uses.
const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    // Media
    'img', 'figure', 'figcaption', 'video', 'audio', 'source', 'iframe',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Inline
    'span', 'mark', 'sub', 'sup', 'small', 'abbr', 's', 'del', 'ins', 'cite',
    // Table
    'table', 'caption', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    // Layout / semantic
    'section', 'article', 'aside', 'header', 'footer', 'nav', 'main',
    // Interactive / disclosure
    'details', 'summary',
    // Definition lists
    'dl', 'dt', 'dd',
  ]),
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'class', 'id', 'style', 'title'],
    img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'class', 'id', 'style', 'align'],
    video: ['src', 'controls', 'autoplay', 'muted', 'loop', 'poster', 'width', 'height', 'class', 'id', 'style'],
    source: ['src', 'srcset', 'type', 'media', 'sizes'],
    audio: ['src', 'controls', 'autoplay', 'muted', 'loop', 'class', 'id', 'style'],
    iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'title', 'style', 'class', 'id', 'loading', 'scrolling', 'name', 'seamless'],
    table: ['width', 'cellpadding', 'cellspacing', 'border', 'align', 'bgcolor', 'summary', 'class', 'id', 'style'],
    thead: ['class', 'id', 'style', 'align', 'valign'],
    tbody: ['class', 'id', 'style', 'align', 'valign'],
    tfoot: ['class', 'id', 'style', 'align', 'valign'],
    tr: ['class', 'id', 'style', 'align', 'valign', 'bgcolor', 'height'],
    th: ['colspan', 'rowspan', 'width', 'height', 'align', 'valign', 'bgcolor', 'scope', 'abbr', 'class', 'id', 'style', 'nowrap'],
    td: ['colspan', 'rowspan', 'width', 'height', 'align', 'valign', 'bgcolor', 'scope', 'abbr', 'class', 'id', 'style', 'nowrap'],
    col: ['span', 'width', 'align', 'valign', 'class', 'id', 'style'],
    colgroup: ['span', 'width', 'class', 'id', 'style'],
    figure: ['class', 'id', 'style'],
    figcaption: ['class', 'id', 'style'],
    caption: ['align', 'class', 'id', 'style'],
    details: ['open', 'class', 'id', 'style'],
    summary: ['class', 'id', 'style'],
    blockquote: ['cite', 'class', 'id', 'style'],
    cite: ['class', 'id', 'style'],
    pre: ['class', 'id', 'style'],
    code: ['class', 'id', 'style'],
    span: ['class', 'id', 'style', 'title', 'lang', 'dir'],
    div: ['class', 'id', 'style', 'align', 'dir', 'lang', 'title', 'role', 'aria-label', 'data-*'],
    p: ['class', 'id', 'style', 'align', 'dir'],
    h1: ['class', 'id', 'style', 'dir'],
    h2: ['class', 'id', 'style', 'dir'],
    h3: ['class', 'id', 'style', 'dir'],
    h4: ['class', 'id', 'style', 'dir'],
    h5: ['class', 'id', 'style', 'dir'],
    h6: ['class', 'id', 'style', 'dir'],
    ul: ['class', 'id', 'style', 'type'],
    ol: ['class', 'id', 'style', 'type', 'start', 'reversed'],
    li: ['class', 'id', 'style', 'value'],
    strong: ['class', 'id', 'style'],
    em: ['class', 'id', 'style'],
    b: ['class', 'id', 'style'],
    i: ['class', 'id', 'style'],
    u: ['class', 'id', 'style'],
    s: ['class', 'id', 'style'],
    del: ['class', 'id', 'style', 'cite', 'datetime'],
    ins: ['class', 'id', 'style', 'cite', 'datetime'],
    mark: ['class', 'id', 'style'],
    sub: ['class', 'id', 'style'],
    sup: ['class', 'id', 'style'],
    small: ['class', 'id', 'style'],
    abbr: ['title', 'class', 'id', 'style'],
    hr: ['class', 'id', 'style', 'align', 'width'],
    br: ['class', 'style'],
    section: ['class', 'id', 'style', 'aria-label', 'role'],
    article: ['class', 'id', 'style', 'aria-label', 'role'],
    aside: ['class', 'id', 'style', 'aria-label', 'role'],
    header: ['class', 'id', 'style', 'aria-label', 'role'],
    footer: ['class', 'id', 'style', 'aria-label', 'role'],
    nav: ['class', 'id', 'style', 'aria-label', 'role'],
    main: ['class', 'id', 'style', 'aria-label', 'role'],
    dl: ['class', 'id', 'style'],
    dt: ['class', 'id', 'style'],
    dd: ['class', 'id', 'style'],
  },
  // Only allow embeds from trusted video/doc hosts — arbitrary iframe src is
  // itself an XSS/clickjacking vector even with sandboxing.
  allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com', 'share.transistor.fm', 'transistor.fm', 'open.spotify.com'],
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
};

function sanitizeBlogHtml(html) {
  if (typeof html !== 'string' || !html) return html;
  return sanitizeHtml(html, sanitizeOptions);
}

module.exports = { sanitizeBlogHtml };
