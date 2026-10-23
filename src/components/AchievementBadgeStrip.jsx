import { useState } from "react";
import { Link } from "react-router-dom";

// Renders earned achievement badges as a compact horizontal icon strip.
// Props:
//   badges  — array of { id, label, icon, color } (already filtered to earned only)
//   linkTo  — optional href for "View all" link (omit to hide the link)
//   size    — icon circle diameter in px (default 36)
export default function AchievementBadgeStrip({ badges = [], linkTo, size = 36 }) {
  const [tooltip, setTooltip] = useState(null); // badge id currently hovered

  if (!badges.length) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
      {badges.map((b) => (
        <div
          key={b.id}
          style={{ position: "relative" }}
          onMouseEnter={() => setTooltip(b.id)}
          onMouseLeave={() => setTooltip(null)}
        >
          <div
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: `${b.color}18`,
              border: `1.5px solid ${b.color}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "default",
            }}
          >
            <i className={`bi ${b.icon}`} style={{ fontSize: size * 0.48, color: b.color }} />
          </div>
          {tooltip === b.id && (
            <div style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#1e293b",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 6,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 100,
            }}>
              {b.label}
            </div>
          )}
        </div>
      ))}
      {linkTo && (
        <Link
          to={linkTo}
          style={{ fontSize: 12, color: "#ee5e42", fontWeight: 600, textDecoration: "none", marginLeft: 4 }}
        >
          View all →
        </Link>
      )}
    </div>
  );
}
