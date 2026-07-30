import React, { useRef, useEffect } from "react";
import "../../css/AdminDashboard.css"; // Ensure styling
import { useConfirm } from "../../context/ConfirmationContext";
import AccordionModal from "./AccordionModal";

const SimpleRTE = ({ value, onChange, onImageUpload, onReady, minHeight = "400px", maxHeight = "800px" }) => {
  const editorRef = useRef(null);
  const [isSourceView, setIsSourceView] = React.useState(false);
  const { openConfirm } = useConfirm();
  const savedSelection = useRef(null);
  // Always-current value ref so toggleSourceView can read latest HTML without stale closures
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  // ── HTML Block Modal ──────────────────────────────────────────────────────
  const [htmlModal, setHtmlModal] = React.useState({ open: false, code: '' });

  // ── CTA Block Modal ───────────────────────────────────────────────────────
  const [ctaModal, setCtaModal] = React.useState({
    open: false,
    title: '',
    description: '',
    btnText: '',
    btnUrl: '',
  });

  // ── Accordion Block Modal ─────────────────────────────────────────────────
  const [accordionModal, setAccordionModal] = React.useState({
    open: false,
    items: [], // { question, answer } pairs already added to this group
    question: '',
    answer: '',
    answerSyncKey: 0, // incremented to imperatively sync innerHTML into the mini-RTE
  });

  // Track the last value we wrote to the DOM so we never overwrite our own onChange
  const lastSyncedValue = useRef(null);

  // Focus preservation logic
  const saveSelection = () => {
    if (editorRef.current && !isSourceView) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          savedSelection.current = range.cloneRange();
        }
      }
    }
  };

  const restoreSelection = () => {
    if (savedSelection.current && !isSourceView && editorRef.current) {
      try {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelection.current);
      } catch { /* range may be stale if DOM changed */ }
      editorRef.current.focus();
    }
  };

  // Only sync prop → DOM when the value changes from an external source,
  // never when the change originated from the editor itself.
  useEffect(() => {
    document.execCommand("defaultParagraphSeparator", false, "p");
  }, []);

  const focusEnd = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  useEffect(() => {
    if (onReady) onReady({ saveSelection, insertHtmlBlock, focusEnd });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editorRef.current || isSourceView) return;
    // Skip if this value was produced by our own cleanAndDispatch
    if (value === lastSyncedValue.current) return;
    // Skip if the editor is focused (user is actively typing)
    if (document.activeElement === editorRef.current) return;
    lastSyncedValue.current = value;
    editorRef.current.innerHTML = value || "<p><br></p>";
  }, [value, isSourceView]);

  // Clean HTML before dispatching onChange
  const cleanAndDispatch = () => {
    if (!editorRef.current || isSourceView) return;
    let html = editorRef.current.innerHTML;

    // Use a temporary DOM parser to clean up IMG styles only.
    // All other elements keep their inline styles exactly as authored —
    // stripping styles from inline elements (strong, em, span, etc.) was
    // causing user-authored source-mode inline styles to be lost whenever
    // the browser's execCommand moved a style property onto one of those elements.
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    doc.querySelectorAll("img").forEach((el) => {
      const style = el.getAttribute("style");
      if (style) {
        const allowed = style
          .split(";")
          .map((s) => s.trim())
          .filter(
            (s) =>
              s.toLowerCase().startsWith("width") ||
              s.toLowerCase().startsWith("height"),
          )
          .join("; ");
        if (allowed) el.setAttribute("style", allowed);
        else el.removeAttribute("style");
      }
    });
    html = doc.body.innerHTML;

    // Preserve all custom classes; only strip known browser-injected garbage
    // (MS Office MsoXxx, Gmail gmail_*, Apple apple-* classes added during paste).
    const classDoc = parser.parseFromString(html, "text/html");
    classDoc.querySelectorAll("*").forEach((el) => {
      const cls = el.getAttribute("class");
      if (cls) {
        const cleaned = cls
          .split(" ")
          .filter(
            (c) =>
              c &&
              !c.startsWith("Mso") &&
              !c.startsWith("gmail_") &&
              !c.startsWith("apple-") &&
              !c.startsWith("x_"),
          )
          .join(" ");
        if (cleaned) el.setAttribute("class", cleaned);
        else el.removeAttribute("class");
      }
    });
    html = classDoc.body.innerHTML;

    // Remove empty block tags and trailing line breaks
    html = html.replace(/<(p|h2|h3|h4|div)>\s*<\/\1>/gi, "");
    html = html.replace(/<br\s*\/?>\s*<\/p>/gi, "</p>");

    // Mark this as an internal change so the sync useEffect won't overwrite the DOM
    lastSyncedValue.current = html;
    onChange(html);
  };

  const execCmd = (command, value = null) => {
    if (isSourceView) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    cleanAndDispatch();
  };

  const handleKeyDown = (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'z' && !e.shiftKey) {
      // Let the browser handle undo natively; sync React state afterward
      setTimeout(() => cleanAndDispatch(), 0);
      return;
    }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      setTimeout(() => cleanAndDispatch(), 0);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '    ');
    }
  };

  const formatHTML = (html) => {
    let formatted = "";
    let indent = 0;
    const tokens = html.split(/(<[^>]*>)/);
    
    tokens.forEach((token) => {
      if (token.startsWith("</")) {
        indent--;
        formatted += "\n" + "  ".repeat(Math.max(0, indent)) + token;
      } else if (token.startsWith("<") && !token.startsWith("<!") && !token.endsWith("/>")) {
        const tagName = token.match(/<([a-zA-Z0-9]+)/)?.[1]?.toLowerCase();
        formatted += "\n" + "  ".repeat(Math.max(0, indent)) + token;
        if (!["img", "br", "hr", "input", "meta", "link"].includes(tagName)) {
          indent++;
        }
      } else if (token.trim()) {
        formatted += "\n" + "  ".repeat(Math.max(0, indent)) + token.trim();
      }
    });
    
    return formatted.trim();
  };

  const handleFormat = () => {
    if (isSourceView) {
      const formatted = formatHTML(value);
      onChange(formatted);
    } else {
      // In visual mode, we can try to clean the innerHTML
      cleanAndDispatch();
      const currentHTML = editorRef.current.innerHTML;
      editorRef.current.innerHTML = formatHTML(currentHTML);
      cleanAndDispatch();
    }
  };

  const handleChange = () => {
    cleanAndDispatch();
  };

  const handlePaste = async (e) => {
    if (isSourceView) return;

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // ---------- IMAGE PASTE ----------
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];

      if (item.type.startsWith("image/")) {
        e.preventDefault();

        const file = item.getAsFile();
        if (!file || !onImageUpload) return;

        saveSelection();

        try {
          const url = await onImageUpload(file);
          if (!url) return;

          openConfirm({
            title: "Image Alt Text",
            message: "Enter descriptive alt text for the pasted image:",
            confirmText: "Insert Image",
            cancelText: "Skip",
            showInput: true,
            inputPlaceholder: "e.g. SAP role conflict matrix screenshot",
            onConfirm: (alt) => insertImageWithAlt(url, alt),
            onCancel: () => insertImageWithAlt(url, ""),
          });
        } catch (err) {
          console.error("Image paste upload failed:", err);
        }

        return;
      }
    }

    // ---------- HTML PASTE ----------
    const htmlText = clipboardData.getData("text/html");
    const plainText = clipboardData.getData("text/plain");

    if (htmlText) {
      e.preventDefault();

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      const allowedTags = [
        "DIV",
        "P",
        "H2",
        "H3",
        "H4",
        "UL",
        "OL",
        "LI",
        "STRONG",
        "EM",
        "U",
        "A",
        "BLOCKQUOTE",
        "IMG",
        "PRE",
        "CODE",
        "SPAN",
        "IFRAME",
        "FIGURE",
        "FIGCAPTION",
        "TABLE",
        "THEAD",
        "TBODY",
        "TR",
        "TH",
        "TD",
      ];

      const sanitizeNode = (node) => {
        if (node.nodeType === 3) {
          return document.createTextNode(node.textContent);
        }

        if (node.nodeType !== 1) return null;

        const tag = node.tagName.toUpperCase();

        if (!allowedTags.includes(tag)) {
          const fragment = document.createDocumentFragment();
          node.childNodes.forEach((child) => {
            const clean = sanitizeNode(child);
            if (clean) fragment.appendChild(clean);
          });
          return fragment;
        }

        const el = document.createElement(tag);

        if (tag === "A" && node.href) el.href = node.href;
        if ((tag === "DIV" || tag === "SPAN") && node.getAttribute("style")) {
          el.setAttribute("style", node.getAttribute("style"));
        }
        if (tag === "IMG" && node.src) {
          el.src = node.src;
          // Preserve dimensions if they exist in source
          if (node.style.width) el.style.width = node.style.width;
          if (node.style.height) el.style.height = node.style.height;
          if (node.width) el.setAttribute("width", node.width);
          if (node.height) el.setAttribute("height", node.height);
          if (node.className) el.className = node.className;
        }
        if (tag === "IFRAME") {
          const attrs = ["src", "width", "height", "frameborder", "scrolling", "seamless", "allow", "allowfullscreen", "title", "style", "class", "id", "loading", "name"];
          attrs.forEach((attr) => {
            if (node.hasAttribute(attr)) {
              el.setAttribute(attr, node.getAttribute(attr));
            }
          });
        }

        node.childNodes.forEach((child) => {
          const clean = sanitizeNode(child);
          if (clean) el.appendChild(clean);
        });

        return el;
      };

      // Serialize sanitized nodes back to HTML string
      const tempDiv = document.createElement("div");
      doc.body.childNodes.forEach((child) => {
        const clean = sanitizeNode(child);
        if (clean) tempDiv.appendChild(clean);
      });
      const cleanedHTML = tempDiv.innerHTML;

      // Use execCommand('insertHTML') so the browser correctly handles
      // block-level elements (p, ul, h2 etc.) at the cursor position.
      // range.insertNode() would nest blocks inside the current paragraph,
      // causing the browser to reorganize the DOM and wipe previous content.
      document.execCommand("insertHTML", false, cleanedHTML);

      cleanAndDispatch();
    } else if (plainText) {
      e.preventDefault();
      document.execCommand("insertText", false, plainText);
      cleanAndDispatch();
    }
  };

  const handleSourceChange = (e) => {
    onChange(e.target.value);
  };

  const toggleSourceView = () => {
    const nextSourceView = !isSourceView;
    setIsSourceView(nextSourceView);
    if (!nextSourceView) {
      // Switching back to visual mode: explicitly load the source HTML into the editor.
      // requestAnimationFrame waits for the div.rte-content to mount before writing.
      requestAnimationFrame(() => {
        if (editorRef.current) {
          const html = valueRef.current || '<p><br></p>';
          lastSyncedValue.current = html;
          editorRef.current.innerHTML = html;
        }
      });
    }
  };

  const handleAlign = (alignment) => {
    if (isSourceView) return;
    saveSelection();
    restoreSelection();

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    let targetElement =
      container.nodeType === 3 ? container.parentNode : container;

    // Look for image specifically
    let img = null;
    if (targetElement.nodeName === "IMG") {
      img = targetElement;
    } else if (targetElement.querySelector) {
      img = targetElement.querySelector("img");
    }

    if (img) {
      // Remove other alignment classes
      img.classList.remove("align-left", "align-center", "align-right");
      img.classList.add(`align-${alignment}`);
    } else {
      // For text elements, we need a block element to properly align
      while (
        targetElement &&
        targetElement !== editorRef.current &&
        !["P", "H2", "H3", "H4", "DIV", "LI", "BLOCKQUOTE"].includes(
          targetElement.nodeName,
        )
      ) {
        targetElement = targetElement.parentNode;
      }

      // If we made it up to the editor without finding a block, we need to format block
      if (targetElement === editorRef.current) {
        document.execCommand("formatBlock", false, "P");
        // Rekey the target Element
        const newSelection = window.getSelection();
        if (newSelection.rangeCount) {
          let newContainer = newSelection.getRangeAt(0).commonAncestorContainer;
          targetElement =
            newContainer.nodeType === 3
              ? newContainer.parentNode
              : newContainer;
        }
      }

      if (targetElement && targetElement !== editorRef.current) {
        targetElement.classList.remove(
          "text-left",
          "text-center",
          "text-right",
        );
        targetElement.classList.add(`text-${alignment}`);
      }
    }

    cleanAndDispatch();
  };

  const insertImageWithAlt = (url, alt) => {
    restoreSelection();
    editorRef.current?.focus();
    // Use execCommand so the insertion is tracked in the browser's undo history
    const imgHtml = `<img src="${url}" alt="${alt || ''}" class="align-center" />`;
    document.execCommand('insertHTML', false, imgHtml);
    cleanAndDispatch();
  };

  const handleImageClick = async () => {
    if (isSourceView) return;

    saveSelection();

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file && onImageUpload) {
        const url = await onImageUpload(file);
        if (url) {
          saveSelection();
          openConfirm({
            title: "Image Alt Text",
            message: "Enter descriptive alt text for this image (improves accessibility & SEO):",
            confirmText: "Insert Image",
            cancelText: "Skip",
            showInput: true,
            inputPlaceholder: "e.g. SAP GRC dashboard showing role assignments",
            onConfirm: (alt) => insertImageWithAlt(url, alt),
            onCancel: () => insertImageWithAlt(url, ""),
          });
        }
      }
    };
    input.click();
  };

  const handleDoubleClick = (e) => {
    if (isSourceView) return;
    if (e.target.tagName === "IMG") {
      const img = e.target;

      // Add selection state
      editorRef.current
        .querySelectorAll("img")
        .forEach((i) => i.classList.remove("selected-image"));
      img.classList.add("selected-image");

      saveSelection();
      openConfirm({
        title: "Resize Image",
        message: "Enter width (e.g., 300px, 50%):",
        confirmText: "Apply",
        showInput: true,
        initialValue: img.style.width || img.getAttribute("width") || "",
        onConfirm: (width) => {
          img.classList.remove("selected-image");
          if (width) {
            const cleanWidth = width.trim();
            const valid = /^(\d+px|\d+%)$/.test(cleanWidth);
            if (!valid) {
              alert("Error: Please enter a valid size (e.g., 300px or 50%)");
              restoreSelection();
              return;
            }
            img.style.width = cleanWidth;
            img.style.height = "auto";
          } else {
            img.style.width = "";
            img.style.height = "";
          }
          cleanAndDispatch();

          // After resize, prompt for alt text
          setTimeout(() => {
            openConfirm({
              title: "Image Alt Text",
              message: "Update alt text for this image:",
              confirmText: "Save",
              cancelText: "Skip",
              showInput: true,
              initialValue: img.alt || "",
              inputPlaceholder: "Describe the image for accessibility & SEO",
              onConfirm: (alt) => {
                img.alt = alt || "";
                cleanAndDispatch();
                restoreSelection();
              },
              onCancel: () => restoreSelection(),
            });
          }, 50);
        },
        onCancel: () => {
          img.classList.remove("selected-image");
          restoreSelection();
        },
      });
    }
  };

  // Strip <script> tags and event-handler attributes.
  // NOTE: <iframe> and <style> are intentionally preserved —
  // admins legitimately embed podcast/video iframes in article content.
  const sanitizeInsertedHtml = (html) => {
    // Use a template element to parse without a full document context so
    // the browser doesn't block iframe srcs the way DOMParser does.
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const root = tpl.content;
    root.querySelectorAll('script').forEach(el => el.remove());
    root.querySelectorAll('*').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
      });
    });
    const div = document.createElement('div');
    div.appendChild(root.cloneNode(true));
    return div.innerHTML;
  };

  // ── Insert raw HTML block at cursor ────────────────────────────────────────
  // Uses direct DOM range insertion instead of execCommand('insertHTML') because
  // browsers strip <iframe> and other "unsafe" tags when going through execCommand.
  const insertHtmlBlock = (html) => {
    if (!html.trim()) return;
    const safeHtml = sanitizeInsertedHtml(html);
    if (!safeHtml.trim()) return;
    restoreSelection();
    editorRef.current?.focus();

    const tpl = document.createElement('template');
    tpl.innerHTML = safeHtml + '<p><br></p>';
    const frag = tpl.content;

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      // insertNode inserts the fragment at the current cursor position
      range.insertNode(frag);
      // Move cursor after inserted content
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      // No selection — append to end of editor
      editorRef.current.appendChild(frag);
    }

    // Trigger onChange with the updated innerHTML directly (skip DOMParser
    // so iframes in the content are not sanitized away)
    const updated = editorRef.current.innerHTML;
    lastSyncedValue.current = updated;
    onChange(updated);
  };

  // ── Insert CTA block at cursor ──────────────────────────────────────────────
  const insertCtaBlock = ({ title, description, btnText, btnUrl }) => {
    const html = `<div class="rte-cta-block">
  <h3 class="rte-cta-title">${title}</h3>
  ${description ? `<p class="rte-cta-desc">${description}</p>` : ''}
  <a href="${btnUrl || '#'}" class="rte-cta-btn">${btnText || 'Learn More'}</a>
</div>`;
    insertHtmlBlock(html);
  };

  // ── Insert Accordion block at cursor ────────────────────────────────────────
  // Items sharing a `name` use the native <details> exclusive-open behavior —
  // opening one auto-closes the others in the same group, no JS needed.
  const insertAccordionBlock = (items) => {
    const groupName = `acc-${Date.now()}`;
    const html = items.map(({ question, answer }) => `<details class="rte-accordion-item" name="${groupName}">
  <summary class="rte-accordion-question">${question}</summary>
  <div class="rte-accordion-answer">${answer}</div>
</details>`).join('\n');
    insertHtmlBlock(html);
  };

  return (
    <div className={`simple-rte ${isSourceView ? "source-mode" : ""}`}>
      <div className="rte-toolbar">
        <div className="rte-group">
          <button
            type="button"
            onClick={() => execCmd("formatBlock", "H2")}
            title="Heading 2"
            disabled={isSourceView}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => execCmd("formatBlock", "H3")}
            title="Heading 3"
            disabled={isSourceView}
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => execCmd("formatBlock", "H4")}
            title="Heading 4"
            disabled={isSourceView}
          >
            H4
          </button>
        </div>

        <div className="rte-divider"></div>

        <div className="rte-group">
          <button
            type="button"
            onClick={() => execCmd("bold")}
            title="Bold"
            disabled={isSourceView}
          >
            <b>B</b>
          </button>
          <button
            type="button"
            onClick={() => execCmd("italic")}
            title="Italic"
            disabled={isSourceView}
          >
            <i>I</i>
          </button>
          <button
            type="button"
            onClick={() => execCmd("underline")}
            title="Underline"
            disabled={isSourceView}
          >
            <u>U</u>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isSourceView) return;
              const selection = window.getSelection();
              const selectedText = selection && selection.rangeCount > 0
                ? selection.toString()
                : '';
              const codeContent = selectedText.trim() || '// Paste your code here';
              document.execCommand('insertHTML', false, `<pre><code>${codeContent}</code></pre><p><br></p>`);
              cleanAndDispatch();
            }}
            title="Code Block"
            disabled={isSourceView}
          >
            <i className="bi bi-code-square"></i>
          </button>
        </div>

        <div className="rte-divider"></div>

        <div className="rte-group">
          <button
            type="button"
            onClick={() => handleAlign("left")}
            title="Align Left"
            disabled={isSourceView}
          >
            <i className="bi bi-text-left"></i>
          </button>
          <button
            type="button"
            onClick={() => handleAlign("center")}
            title="Align Center"
            disabled={isSourceView}
          >
            <i className="bi bi-text-center"></i>
          </button>
          <button
            type="button"
            onClick={() => handleAlign("right")}
            title="Align Right"
            disabled={isSourceView}
          >
            <i className="bi bi-text-right"></i>
          </button>
        </div>

        <div className="rte-divider"></div>

        <div className="rte-group">
          <button
            type="button"
            onClick={() => execCmd("insertUnorderedList")}
            title="Bullet List"
            disabled={isSourceView}
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => execCmd("insertOrderedList")}
            title="Ordered List"
            disabled={isSourceView}
          >
            1. List
          </button>
        </div>

        <div className="rte-divider"></div>

        <div className="rte-group">
          <button
            type="button"
            onClick={() => {
              saveSelection();
              openConfirm({
                title: "Insert Link",
                message: "Enter the URL for the link:",
                confirmText: "Insert",
                showInput: true,
                inputPlaceholder: "https://example.com",
                onConfirm: (url) => {
                  restoreSelection();
                  if (url) execCmd("createLink", url);
                },
                onCancel: () => restoreSelection(),
              });
            }}
            title="Link"
            disabled={isSourceView}
          >
            🔗 Link
          </button>
          <button
            type="button"
            onClick={handleImageClick}
            title="Insert Image"
            disabled={isSourceView}
          >
            🖼️ Image
          </button>
        </div>

        <div className="rte-divider"></div>

        <div className="rte-group">
          <button
            type="button"
            onClick={() => {
              saveSelection();
              setHtmlModal({ open: true, code: '' });
            }}
            title="Insert Raw HTML"
            disabled={isSourceView}
          >
            &lt;/&gt; HTML
          </button>
          <button
            type="button"
            onClick={() => {
              saveSelection();
              setCtaModal({ open: true, title: '', description: '', btnText: '', btnUrl: '' });
            }}
            title="Insert CTA Block"
            disabled={isSourceView}
          >
            📣 CTA
          </button>
          <button
            type="button"
            onClick={() => {
              saveSelection();
              setAccordionModal({ open: true, items: [], question: '', answer: '', answerSyncKey: 1 });
            }}
            title="Insert Accordion"
            disabled={isSourceView}
          >
            🔽 Accordion
          </button>
        </div>

        <div className="rte-group">
          <button
            type="button"
            onClick={() => execCmd("undo")}
            title="Undo (Ctrl+Z)"
            disabled={isSourceView}
          >
            <i className="bi bi-arrow-counterclockwise"></i>
          </button>
          <button
            type="button"
            onClick={() => execCmd("redo")}
            title="Redo (Ctrl+Y)"
            disabled={isSourceView}
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>

        <button
          type="button"
          onClick={toggleSourceView}
          title={isSourceView ? "WYSIWYG Mode" : "Source Code Mode"}
          className="mode-toggle-btn"
        >
          {isSourceView ? (
            <>
              <i className="bi bi-eye"></i> Visual
            </>
          ) : (
            <>
              <i className="bi bi-code-slash"></i> Source
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleFormat}
          title="Format Code / Content"
          className="format-btn"
          style={{ marginLeft: "4px" }}
        >
          <i className="bi bi-magic"></i> Format
        </button>
      </div>

      {isSourceView ? (
        <textarea
          className="rte-source-textarea"
          data-lenis-prevent
          value={value}
          onChange={handleSourceChange}
          onBlur={handleChange}
          placeholder="Type or paste HTML here..."
          style={{ minHeight, maxHeight }}
        />
      ) : (
        <div
          className="rte-content"
          contentEditable
          data-lenis-prevent
          ref={editorRef}
          onInput={handleChange}
          onBlur={handleChange}
          onKeyDown={handleKeyDown}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onPaste={handlePaste}
          onDoubleClick={handleDoubleClick}
          style={{ minHeight, maxHeight }}
        />
      )}

      <style>{`
        .simple-rte {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #fff;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .simple-rte:focus-within {
            border-color: #1e293b;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .rte-toolbar {
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 10px 14px;
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .rte-group {
            display: flex;
            gap: 2px;
        }
        .rte-divider {
            width: 1px;
            height: 24px;
            background: #cbd5e1;
            margin: 0 8px;
        }
        .rte-toolbar button {
            background: transparent;
            border: 1px solid transparent;
            padding: 8px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: #475569;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 36px;
            height: 36px;
        }
        .rte-toolbar button:hover:not(:disabled) {
            background: #f1f5f9;
            color: #1e293b;
        }
        .rte-toolbar button:active:not(:disabled) {
            background: #e2e8f0;
        }
        .rte-toolbar button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .mode-toggle-btn {
            margin-left: auto;
            background: #f1f5f9 !important;
            color: #1e293b !important;
            padding: 0 16px !important;
            font-size: 13px !important;
            gap: 6px;
        }
        .format-btn {
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            color: #64748b !important;
            padding: 0 12px !important;
            font-size: 13px !important;
            gap: 6px;
        }
        .format-btn:hover {
            background: #f1f5f9 !important;
            color: #1e293b !important;
            border-color: #cbd5e1 !important;
        }
        .rte-content {
            min-height: 400px;
            overflow-y: auto;
            padding: 24px 32px;
            outline: none;
            font-size: 16px;
            line-height: 1.8;
            color: #334155;
            background: #fff;
        }
        .rte-source-textarea {
            width: 100%;
            min-height: 400px;
            overflow-y: auto;
            padding: 24px;
            font-family: 'Fira Code', 'Monaco', 'Courier New', Courier, monospace;
            font-size: 14px;
            line-height: 1.8;
            background: #0f172a;
            color: #e2e8f0;
            border: none;
            outline: none;
            resize: vertical;
            white-space: pre-wrap;
            word-break: break-all;
        }

        /* Content Styling inside Editor */
        .rte-content h2 { font-size: 2rem; font-weight: 800; color: #1e293b; margin-top: 1.5em; margin-bottom: 0.5em; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; }
        .rte-content h3 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-top: 1.25em; margin-bottom: 0.5em; }
        .rte-content h4 { font-size: 1.25rem; font-weight: 600; color: #1e293b; margin-top: 1em; }
        .rte-content p { margin-bottom: 1.25em; }
        .rte-content ul, .rte-content ol { padding-left: 1.5em; margin-bottom: 1.25em; }
        .rte-content blockquote { border-left: 4px solid #1e293b; padding: 16px 24px; margin: 24px 0; background: #f8fafc; color: #475569; font-style: italic; border-radius: 0 8px 8px 0; }
        
        /* Editor Image Alignment Classes */
        .rte-content img { 
            max-width: 100%; 
            height: auto; 
            border-radius: 8px; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            transition: transform 0.2s;
            cursor: pointer;
        }
        .rte-content img:hover { transform: scale(1.01); }
        
        .rte-content img.selected-image {
            outline: 3px solid #1e293b;
            outline-offset: 4px;
        }
        
        .rte-content img.align-left { 
            float: left; 
            margin: 0 24px 16px 0; 
        }
        .rte-content img.align-right { 
            float: right; 
            margin: 0 0 16px 24px; 
        }
        .rte-content img.align-center { 
            display: block; 
            margin: 32px auto; 
        }
        
        .rte-content a { color: #1e293b; text-decoration: underline; font-weight: 500; }
        
        /* Clearfix for floats */
        .rte-content::after {
            content: "";
            display: table;
            clear: both;
        }

        /* Text Alignment */
        .rte-content .text-left { text-align: left !important; }
        .rte-content .text-center { text-align: center !important; }
        .rte-content .text-right { text-align: right !important; }

        /* Code Block Styling in Editor */
        .rte-content pre {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 16px;
            border-radius: 8px;
            margin: 16px 0;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 14px;
            overflow-x: auto;
            white-space: pre;
        }
        .rte-content code {
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            color: #e11d48;
        }
        .rte-content pre code {
            background: transparent;
            padding: 0;
            color: inherit;
            border: none;
        }
        /* ── RTE Modals ──────────────────────────────────────────── */
        .rte-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        .rte-modal {
            background: #fff;
            border-radius: 14px;
            padding: 28px 32px;
            width: 520px;
            max-width: 96vw;
            box-shadow: 0 20px 60px rgba(0,0,0,0.18);
        }
        .rte-modal h4 {
            margin: 0 0 18px;
            font-size: 1.1rem;
            color: #1e293b;
            font-weight: 700;
        }
        .rte-modal label {
            display: block;
            font-size: 0.82rem;
            font-weight: 600;
            color: #475569;
            margin-bottom: 4px;
        }
        .rte-modal textarea,
        .rte-modal input[type="text"],
        .rte-modal input[type="url"] {
            width: 100%;
            padding: 9px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.875rem;
            margin-bottom: 14px;
            font-family: inherit;
            box-sizing: border-box;
            background: #f8fafc;
            outline: none;
            transition: border-color 0.2s;
        }
        .rte-modal textarea:focus,
        .rte-modal input:focus {
            border-color: #3b82f6;
            background: #fff;
        }
        .rte-modal textarea {
            min-height: 130px;
            resize: vertical;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }
        .rte-modal-note {
            font-size: 12.5px;
            color: #64748b;
            margin: 8px 0 4px;
            line-height: 1.5;
        }
        .rte-modal-note code {
            background: #f1f5f9;
            padding: 1px 5px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 11.5px;
            color: #b91c1c;
        }
.rte-accordion-item-list {
            list-style: none;
            margin: 0 0 12px;
            padding: 0;
            max-height: 160px;
            overflow-y: auto;
        }
        .rte-accordion-item-list li {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 6px;
            font-size: 13px;
        }
        .rte-accordion-item-list li span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .rte-accordion-item-edit {
            cursor: pointer;
            flex: 1;
        }
        .rte-accordion-item-edit:hover {
            text-decoration: underline;
        }
        .rte-accordion-item-move {
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
        }
        .rte-accordion-item-move button {
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 9px;
            line-height: 1;
            padding: 2px;
        }
        .rte-accordion-item-move button:hover:not(:disabled) { color: #3b82f6; }
        .rte-accordion-item-move button:disabled {
            color: #e2e8f0;
            cursor: default;
        }
        .rte-accordion-item-remove {
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 13px;
            flex-shrink: 0;
        }
        .rte-accordion-item-remove:hover { color: #ef4444; }
        .rte-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 4px;
        }
        .rte-modal-actions button {
            padding: 9px 22px;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
        }
        .rte-modal-actions .btn-insert {
            background: #1e293b;
            color: #fff;
        }
        .rte-modal-actions .btn-cancel {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #e2e8f0;
        }
        /* ── CTA Block display in editor & published blog ─────────── */
        .rte-cta-block {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: #fff;
            border-radius: 14px;
            padding: 32px 36px;
            text-align: center;
            margin: 32px 0;
            box-shadow: 0 10px 25px -5px rgba(59,130,246,0.4);
        }
        .rte-cta-block h3,
        .rte-cta-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0 0 10px;
            color: #fff !important;
        }
        .rte-cta-block > p,
        .rte-cta-desc {
            font-size: 1rem;
            opacity: 0.9;
            margin: 0 0 20px;
            color: #fff;
        }
        .rte-cta-block a,
        .rte-cta-btn {
            display: inline-block;
            background: #fff;
            color: #1e40af !important;
            padding: 11px 30px;
            border-radius: 50px;
            font-weight: 700;
            text-decoration: none !important;
            font-size: 0.95rem;
            transition: transform 0.15s;
        }
        .rte-cta-block a:hover,
        .rte-cta-btn:hover { transform: scale(1.04); }

        /* ── Accordion Block display in editor & published blog ───── */
        .rte-accordion-item {
            border-bottom: 1px solid #e2e8f0;
            margin: 0;
        }
        .rte-accordion-item + .rte-accordion-item { border-top: none; }
        .rte-accordion-question {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 0;
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            cursor: pointer;
            list-style: none;
        }
        .rte-accordion-question::-webkit-details-marker { display: none; }
        .rte-accordion-question::after {
            content: "+";
            font-size: 24px;
            color: #3b82f6;
            transition: transform 0.3s ease;
            flex-shrink: 0;
            margin-left: 12px;
        }
        .rte-accordion-item[open] > .rte-accordion-question::after {
            transform: rotate(45deg);
        }
        .rte-accordion-answer {
            padding: 0 0 20px;
        }
        .rte-accordion-answer p {
            margin: 0;
            font-size: 16px;
            line-height: 1.6;
            color: #334155;
        }

        /* ── Download Block in editor ─────────────────────────────── */
        .rte-content .sap-download-block {
          display: flex;
          align-items: center;
          gap: 14px;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1.5px solid #7dd3fc;
          border-radius: 12px;
          padding: 14px 18px;
          margin: 20px 0;
          user-select: none;
          cursor: default;
          position: relative;
        }
        .rte-content .sap-download-block .sdb-icon {
          font-size: 1.75rem;
          flex-shrink: 0;
          line-height: 1;
        }
        .rte-content .sap-download-block .sdb-icon::before {
          content: "⬇";
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: #0284c7;
          border-radius: 10px;
          font-size: 1.1rem;
          color: #fff;
        }
        .rte-content .sap-download-block .sdb-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .rte-content .sap-download-block .sdb-info strong {
          color: #0f172a;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rte-content .sap-download-block .sdb-info small {
          color: #64748b;
          font-size: 0.78rem;
        }
        .rte-content .sap-download-block .sdb-action {
          background: #0284c7;
          color: #fff;
          border-radius: 8px;
          padding: 7px 16px;
          font-size: 0.82rem;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
          letter-spacing: 0.01em;
        }
        /* Cursor marker — invisible placeholder inserted when modal opens */
        .rte-content [data-sap-cursor] { display: inline; }
      `}</style>

      {/* ── HTML Code Modal ───────────────────────────────────── */}
      {htmlModal.open && (
        <div className="rte-modal-overlay" onMouseDown={(e) => e.stopPropagation()}>
          <div className="rte-modal">
            <h4>&lt;/&gt; Insert HTML Code</h4>
            <label>Paste or type your HTML:</label>
            <textarea
              autoFocus
              value={htmlModal.code}
              onChange={(e) => setHtmlModal((m) => ({ ...m, code: e.target.value }))}
              placeholder="<div class=&quot;my-block&quot;>...</div>"
            />
            <p className="rte-modal-note">
              Note: <code>&lt;style&gt;</code> and <code>&lt;script&gt;</code> tags are not
              supported and will be removed automatically on insert.
            </p>
            <div className="rte-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setHtmlModal({ open: false, code: '' });
                  restoreSelection();
                }}
              >
                Cancel
              </button>
              <button
                className="btn-insert"
                onClick={() => {
                  insertHtmlBlock(htmlModal.code);
                  setHtmlModal({ open: false, code: '' });
                }}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CTA Block Modal ───────────────────────────────────── */}
      {ctaModal.open && (
        <div className="rte-modal-overlay" onMouseDown={(e) => e.stopPropagation()}>
          <div className="rte-modal">
            <h4>📣 Insert CTA Block</h4>
            <label>Heading *</label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Ready to get started?"
              value={ctaModal.title}
              onChange={(e) => setCtaModal((m) => ({ ...m, title: e.target.value }))}
            />
            <label>Description (optional)</label>
            <input
              type="text"
              placeholder="A short supporting sentence"
              value={ctaModal.description}
              onChange={(e) => setCtaModal((m) => ({ ...m, description: e.target.value }))}
            />
            <label>Button Text</label>
            <input
              type="text"
              placeholder="Learn More"
              value={ctaModal.btnText}
              onChange={(e) => setCtaModal((m) => ({ ...m, btnText: e.target.value }))}
            />
            <label>Button URL</label>
            <input
              type="url"
              placeholder="https://sapsecurityexpert.com/..."
              value={ctaModal.btnUrl}
              onChange={(e) => setCtaModal((m) => ({ ...m, btnUrl: e.target.value }))}
            />
            <div className="rte-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setCtaModal({ open: false, title: '', description: '', btnText: '', btnUrl: '' });
                  restoreSelection();
                }}
              >
                Cancel
              </button>
              <button
                className="btn-insert"
                disabled={!ctaModal.title.trim()}
                onClick={() => {
                  insertCtaBlock({
                    title: ctaModal.title,
                    description: ctaModal.description,
                    btnText: ctaModal.btnText,
                    btnUrl: ctaModal.btnUrl,
                  });
                  setCtaModal({ open: false, title: '', description: '', btnText: '', btnUrl: '' });
                }}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Accordion Block Modal ─────────────────────────────── */}
      {accordionModal.open && (
        <AccordionModal
          modal={accordionModal}
          setModal={setAccordionModal}
          rteImageUpload={onImageUpload}
          onInsert={(items) => {
            insertAccordionBlock(items);
            setAccordionModal({ open: false, items: [], question: '', answer: '', answerSyncKey: 0 });
          }}
          onCancel={() => {
            setAccordionModal({ open: false, items: [], question: '', answer: '', answerSyncKey: 0 });
            restoreSelection();
          }}
        />
      )}
    </div>
  );
};

export default SimpleRTE;
