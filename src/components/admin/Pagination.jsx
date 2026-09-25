import { useState } from "react";
import { PAGE_SIZES } from "./usePagination";

const pageList = (page, pages) => {
  const out = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) out.push(p);
    else if (out[out.length - 1] !== "…") out.push("…");
  }
  return out;
};

export default function Pagination({ page, pages, pageSize, total, start, setPage, setPageSize, top = false }) {
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState(String(pageSize));
  if (total === 0) return null;

  const isPreset = PAGE_SIZES.includes(pageSize);
  const showCustom = custom || !isPreset;
  const applyCustom = () => setPageSize(draft);

  return (
    <div className={`pg-bar${top ? " pg-top" : ""}`}>
      <div className="pg-size">
        <label>Rows per page</label>
        <select
          value={showCustom ? "custom" : pageSize}
          onChange={(e) => {
            if (e.target.value === "custom") { setCustom(true); setDraft(String(pageSize)); }
            else { setCustom(false); setPageSize(e.target.value); }
          }}
        >
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          <option value="custom">Custom…</option>
        </select>
        {showCustom && (
          <input
            type="number"
            min="1"
            max="1000"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={applyCustom}
            onKeyDown={(e) => e.key === "Enter" && applyCustom()}
            aria-label="Custom rows per page"
          />
        )}
      </div>

      <span className="pg-range">
        {start + 1}–{Math.min(start + pageSize, total)} of {total}
      </span>

      <div className="pg-nav">
        <button onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <i className="bi bi-chevron-left"></i>
        </button>
        {pageList(page, pages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="pg-gap">…</span>
          ) : (
            <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
          )
        )}
        <button onClick={() => setPage(page + 1)} disabled={page >= pages} aria-label="Next page">
          <i className="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  );
}
