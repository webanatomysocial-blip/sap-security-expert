import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * ColumnToggle — "Show fields" popover for admin tables.
 *
 * Props:
 *   columns: Array<{ key: string, label: string, optional?: boolean }>
 *   visible: Set<string>  — keys of currently visible columns
 *   onChange: (newSet: Set<string>) => void
 */
export default function ColumnToggle({ columns, visible, onChange }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // Position the portal menu anchored to the button
  const updatePos = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + window.scrollY + 6,
      right: window.innerWidth - rect.right,
    });
  };

  const handleOpen = () => {
    updatePos();
    setOpen((p) => !p);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onScroll = () => { updatePos(); };
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const toggle = (key) => {
    const next = new Set(visible);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange(next);
  };

  const optionalCols = columns.filter((c) => c.optional);
  const visibleOptional = optionalCols.filter((c) => visible.has(c.key)).length;

  return (
    <div className="col-toggle-wrapper" ref={btnRef}>
      <button
        className="col-toggle-btn"
        onClick={handleOpen}
        title="Show / hide columns"
      >
        <i className="bi bi-layout-three-columns"></i>
        <span>Fields</span>
        {visibleOptional > 0 && (
          <span className="col-toggle-badge">{visibleOptional}</span>
        )}
        <i className={`bi bi-chevron-${open ? "up" : "down"} col-toggle-chevron`}></i>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="col-toggle-menu"
          style={{
            position: "absolute",
            top: menuPos.top,
            right: menuPos.right,
            left: "auto",
          }}
        >
          <div className="col-toggle-section-label">Optional columns</div>
          {optionalCols.map((col) => (
            <label key={col.key} className="col-toggle-item">
              <input
                type="checkbox"
                checked={visible.has(col.key)}
                onChange={() => toggle(col.key)}
              />
              <span>{col.label}</span>
            </label>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
