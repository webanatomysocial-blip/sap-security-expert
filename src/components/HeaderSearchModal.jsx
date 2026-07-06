import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchSite } from "../services/api";

export default function HeaderSearchModal({ onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    const timeout = setTimeout(() => {
      searchSite(q)
        .then((r) => { setResults(r.data?.results || []); setSearched(true); })
        .catch(() => { setResults([]); setSearched(true); })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const goTo = (blog) => {
    onClose();
    navigate(`/${blog.category}/${blog.slug}`);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        zIndex: 10000, display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "10vh 20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <i className="bi bi-search" style={{ color: "#94a3b8", fontSize: 18 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 16, color: "#1e293b" }}
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", fontSize: 20, display: "flex" }}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
          {loading && (
            <div style={{ padding: "24px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Searching…</div>
          )}
          {!loading && searched && results.length === 0 && (
            <div style={{ padding: "24px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
              No articles found for "{query}"
            </div>
          )}
          {!loading && results.map((blog) => (
            <button
              key={blog.id}
              onClick={() => goTo(blog)}
              style={{
                display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left",
                padding: "12px 20px", border: "none", background: "transparent", cursor: "pointer",
                borderBottom: "1px solid #f1f5f9",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <img
                src={blog.image || "/assets/placeholder.webp"}
                alt=""
                style={{ width: 56, height: 32, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "#f1f5f9" }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {blog.title}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{blog.category}</div>
              </div>
            </button>
          ))}
          {!loading && !searched && (
            <div style={{ padding: "24px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
              Type at least 2 characters to search
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
