import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Reusable Ambassador Badge component that uses the high-quality 3D rendered template image
 * and overlays the dynamic country name and year over the bottom gold pill.
 */
const AmbassadorBadge = ({ country = "USA", year = "2026", size = 280, style, isLightbox = false, onClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const displayCountry = String(country || "USA").trim().toUpperCase();
  const displayYear = String(year || "2026").trim();
  const numSize = Number(size) || 280;
  const isSmall = numSize < 200;
  const fontSize = isSmall ? 7.5 : Math.max(8, Math.round(numSize * 0.043));

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
      return;
    }
    if (!isLightbox) {
      setIsOpen(true);
    }
  };

  // ESC to close + lock page scroll while the lightbox is open — matches
  // every other modal in this app.
  useEffect(() => {
    if (!isOpen || isLightbox) return;
    const onKeyDown = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, isLightbox]);

  return (
    <div
      className="ambassador-badge-wrapper"
      onClick={handleClick}
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        maxWidth: "100%",
        aspectRatio: "1 / 1",
        height: "auto",
        userSelect: "none",
        containerType: "inline-size",
        cursor: isLightbox ? "default" : "pointer",
        transition: "transform 0.2s ease, filter 0.2s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isLightbox) {
          e.currentTarget.style.transform = "scale(1.03)";
          e.currentTarget.style.filter = "brightness(1.05)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isLightbox) {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.filter = "brightness(1)";
        }
      }}
    >
      {/* 3D Rendered Badge Base Image */}
      <img
        src="/assets/images/ambassador-badge-base.png"
        alt={`SAP Security Expert Country Ambassador - ${displayCountry}`}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "contain",
        }}
      />

      {/* Dynamic Overlay Pill covering 'USA - 2026' */}
      <div
        className="badge-country-pill-overlay"
        style={{
          position: "absolute",
          left: "25%",
          top: "74%",
          width: "50%",
          height: "11%",
          background: "linear-gradient(135deg, #121f30 0%, #080f18 100%)",
          borderRadius: "9999px",
          border: "2px solid #dfb552",
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box",
          padding: isSmall ? "0 2% 0 3%" : "0 2% 0 4%",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.8), 0 1px 2px rgba(255,255,255,0.1)",
        }}
      >
        {/* Globe icon on the left (matches original design) */}
        <svg
          viewBox="0 0 24 24"
          style={{
            height: "60%",
            width: "auto",
            marginRight: isSmall ? "3%" : "4%",
            flexShrink: 0,
          }}
        >
          <circle cx="12" cy="12" r="10" fill="none" stroke="#f6d365" strokeWidth="1.5" />
          <line x1="2" y1="12" x2="22" y2="12" stroke="#f6d365" strokeWidth="1.2" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="#f6d365" strokeWidth="1.2" />
          <path d="M3.6 9h16.8M3.6 15h16.8" fill="none" stroke="#f6d365" strokeWidth="1.2" />
        </svg>

        {/* Separator line */}
        <div
          style={{
            height: "50%",
            width: "1.5px",
            background: "linear-gradient(to bottom, #f6d365, #b8860b)",
            marginRight: isSmall ? "4%" : "6%",
            flexShrink: 0,
          }}
        />

        {/* Country & Year text */}
        <span
          style={{
            color: "#fffae0",
            background: "linear-gradient(to bottom, #fff, #ffd875)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: isSmall ? "7.2px" : `clamp(8px, 4.3cqw, ${fontSize}px)`,
            fontWeight: "900",
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: isSmall ? "0.01em" : "0.06em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          }}
        >
          {displayCountry} - {displayYear}
        </span>
      </div>

      {isOpen && !isLightbox && createPortal(
        <div
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            cursor: "zoom-out",
            padding: 20,
            animation: "ambassador-badge-fade-in 0.15s ease-out",
          }}
        >
          {/* Close button — pinned to the viewport corner, not the badge, so
              it stays reachable regardless of badge size on small screens. */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            aria-label="Close"
            style={{
              position: "fixed",
              top: 20,
              right: 20,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "50%",
              width: 40,
              height: 40,
              color: "#fff",
              fontSize: "1.6rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              zIndex: 2,
            }}
          >
            &times;
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              zIndex: 1,
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "default",
              animation: "ambassador-badge-scale-in 0.2s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <AmbassadorBadge
              country={country}
              year={year}
              size={Math.min(window.innerWidth - 80, window.innerHeight - 120, 480)}
              isLightbox={true}
            />
          </div>
          <style>{`
            @keyframes ambassador-badge-fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes ambassador-badge-scale-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
          `}</style>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AmbassadorBadge;
