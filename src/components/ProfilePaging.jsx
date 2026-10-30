import { useState } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

// Numbered pagination (used for articles).
export function PaginatedList({ items, pageSize = 4, className, renderItem }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = items.slice(current * pageSize, current * pageSize + pageSize);
  return (
    <>
      <div className={className}>{visible.map(renderItem)}</div>
      {pages > 1 && (
        <nav className="pp-pager" aria-label="Pagination">
          <button type="button" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page">
            <LuChevronLeft size={16} />
          </button>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              className={i === current ? "on" : ""}
              aria-current={i === current ? "page" : undefined}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button type="button" onClick={() => setPage(current + 1)} disabled={current === pages - 1} aria-label="Next page">
            <LuChevronRight size={16} />
          </button>
        </nav>
      )}
      <style>{PP_CSS}</style>
    </>
  );
}

// Prev/next navigation in the section header (used for certifications).
export function CarouselSection({ items, pageSize = 3, title, sectionClassName, headerClassName, titleClassName, listClassName, renderItem }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = items.slice(current * pageSize, current * pageSize + pageSize);
  return (
    <section className={sectionClassName}>
      <div className={headerClassName}>
        <h2 className={titleClassName}>{title}</h2>
        {pages > 1 && (
          <div className="pp-nav">
            <span className="pp-nav-count">{current * pageSize + 1}–{Math.min(items.length, (current + 1) * pageSize)} of {items.length}</span>
            <button type="button" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous certifications">
              <LuChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => setPage(current + 1)} disabled={current === pages - 1} aria-label="Next certifications">
              <LuChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      <div className={listClassName}>{visible.map(renderItem)}</div>
      <style>{PP_CSS}</style>
    </section>
  );
}

const PP_CSS = `
.pp-pager { display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 16px; }
.pp-pager button, .pp-nav button {
  min-width: 32px; height: 32px; padding: 0 8px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff;
  color: #334155; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  transition: background .15s, border-color .15s, color .15s;
}
.pp-pager button:hover:not(:disabled), .pp-nav button:hover:not(:disabled) { border-color: #cbd5e1; background: #f8fafc; }
.pp-pager button.on { background: #ee5e42; border-color: #ee5e42; color: #fff; }
.pp-pager button:disabled, .pp-nav button:disabled { opacity: .4; cursor: not-allowed; }
.pp-nav { display: inline-flex; align-items: center; gap: 6px; }
.pp-nav-count { font-size: 12px; color: #94a3b8; margin-right: 4px; white-space: nowrap; }
`;
