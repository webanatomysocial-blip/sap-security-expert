import { useState, useRef, useEffect, useMemo } from "react";

// Custom combobox: text input + filtered dropdown panel styled to match the
// app's form controls (native <datalist> renders unstyleable browser chrome).
const SearchableSelect = ({
  value = "",
  onChange,
  options,
  placeholder,
  disabled,
  required,
  className,
  style,
  onUseCurrentLocation,
  locationTooltip = "Use current location",
}) => {
  // Some countries repeat city names across states (e.g. India has multiple
  // "Bilaspur"), so de-dupe before rendering to keep list keys unique.
  const names = useMemo(() => [...new Set(options.map((o) => (typeof o === "string" ? o : o.name)))], [options]);
  const [open, setOpen] = useState(false);
  // Only holds in-progress typed text while the dropdown is open; the
  // committed `value` prop is the source of truth otherwise, so there's no
  // effect needed to keep this in sync with it.
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const displayValue = open ? query : (value || "");

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? names.filter((n) => n.toLowerCase().includes(q)) : names;
    return list.slice(0, 100);
  }, [query, names]);

  const select = (name) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
      <input
        type="text"
        className={className}
        style={{
          ...style,
          ...(onUseCurrentLocation ? { paddingRight: "38px" } : {}),
        }}
        value={displayValue}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => { setQuery(value || ""); setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); if (!e.target.value) onChange(""); }}
      />
      {onUseCurrentLocation && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setQuery("");
            setOpen(false);
            onUseCurrentLocation();
          }}
          title={locationTooltip}
          aria-label={locationTooltip}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            cursor: "pointer",
            width: "28px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#16a34a",
            borderRadius: "7px",
            zIndex: 3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            transition: "all 0.18s ease-in-out",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#ffffff";
            e.currentTarget.style.background = "#16a34a";
            e.currentTarget.style.borderColor = "#16a34a";
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(22,163,74,0.3)";
            e.currentTarget.style.transform = "translateY(-50%) scale(1.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#16a34a";
            e.currentTarget.style.background = "#f0fdf4";
            e.currentTarget.style.borderColor = "#bbf7d0";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
          }}
        >
          {/* Classic Map Pin Icon */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
        </button>
      )}
      {open && !disabled && filtered.length > 0 && (
        <div
          data-lenis-prevent
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
            boxShadow: "0 12px 32px rgba(15,23,42,0.12)", maxHeight: 240, overflowY: "auto",
            padding: 4,
          }}
        >
          {filtered.map((name) => (
            <div
              key={name}
              onMouseDown={(e) => { e.preventDefault(); select(name); }}
              style={{
                padding: "9px 12px", fontSize: "0.9rem", borderRadius: 6, cursor: "pointer",
                color: "#1e293b", background: name === value ? "#fff5f3" : "transparent",
                fontWeight: name === value ? 600 : 400,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = name === value ? "#fff5f3" : "transparent"; }}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
