import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

const STORAGE_KEY = "cookie_consent";

const DEFAULT_PREFS = { essential: true, analytics: false, marketing: false };

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Small delay so the page renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const save = (chosen) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...chosen, timestamp: Date.now() }));
    setVisible(false);
  };

  const acceptAll = () => save({ essential: true, analytics: true, marketing: true });
  const rejectNonEssential = () => save({ essential: true, analytics: false, marketing: false });
  const saveCustom = () => save(prefs);

  if (!visible) return null;

  return createPortal(
    <div
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        zIndex: 99999,
        display: "flex", alignItems: "flex-end", justifyContent: "start",
        padding: "0 16px 24px",
        animation: "ccFadeIn 0.35s ease",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 -4px 40px rgba(0,0,0,0.14)",
          maxWidth: 510,
          width: "100%",
          padding: "28px 28px 24px",
          animation: "ccSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {!customize ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
              <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>🍪</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>We use cookies</h3>
                <p style={{ margin: "6px 0 0", fontSize: "0.875rem", color: "#475569", lineHeight: 1.6 }}>
                  We use cookies to improve your experience, remember your preferences, and analyze website usage.
                  See our{" "}
                  <Link to="/privacy-policy" style={{ color: "#ee5e42", textDecoration: "underline" }}>Privacy Policy</Link>
                  {" "}for details.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setCustomize(true)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
              >
                Customize
              </button>
              <button
                onClick={rejectNonEssential}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
              >
                Reject Non-Essential
              </button>
              <button
                onClick={acceptAll}
                style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "#ee5e42", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
              >
                Accept All
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>Customize Cookie Preferences</h3>
              <button onClick={() => setCustomize(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>✕</button>
            </div>

            {[
              {
                key: "essential",
                label: "Essential Cookies",
                desc: "Required for the website to function. Cannot be disabled.",
                locked: true,
              },
              {
                key: "analytics",
                label: "Analytics Cookies",
                desc: "Help us understand how visitors interact with the site so we can improve it.",
                locked: false,
              },
              {
                key: "marketing",
                label: "Marketing Cookies",
                desc: "Used to show relevant content and track the effectiveness of our communications.",
                locked: false,
              },
            ].map(({ key, label, desc, locked }) => (
              <div
                key={key}
                style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem", color: "#1e293b" }}>{label}</p>
                  <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "#64748b" }}>{desc}</p>
                </div>
                <label style={{ position: "relative", display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    disabled={locked}
                    onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                    style={{ width: 40, height: 22, accentColor: "#ee5e42", cursor: locked ? "not-allowed" : "pointer", appearance: "none", WebkitAppearance: "none", background: prefs[key] ? "#ee5e42" : "#cbd5e1", borderRadius: 11, transition: "background 0.2s", position: "relative" }}
                  />
                  <span style={{
                    position: "absolute", left: prefs[key] ? 20 : 2, top: 3,
                    width: 16, height: 16, background: "#fff", borderRadius: "50%",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s", pointerEvents: "none"
                  }} />
                </label>
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
              <button
                onClick={rejectNonEssential}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
              >
                Reject Non-Essential
              </button>
              <button
                onClick={saveCustom}
                style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "#ee5e42", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
              >
                Save Preferences
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes ccFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ccSlideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>,
    document.body
  );
}
