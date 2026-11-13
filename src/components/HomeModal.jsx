import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { getHomeModal } from "../services/api";

export default function HomeModal() {
  const [cfg, setCfg] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let timer;
    let onScroll;
    getHomeModal()
      .then((r) => {
        if (!r.data?.enabled) return;
        const path = window.location.pathname;
        if (/^\/(admin|member\/login|member\/signup|membership|checkout|forgot-password|reset-password)/.test(path)) return;
        const dismissedAt = Number(localStorage.getItem("home-promo-dismissed-at") || 0);
        if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
        setCfg(r.data);
        const show = () => {
          setOpen(true);
          if (onScroll) window.removeEventListener("scroll", onScroll);
        };
        timer = setTimeout(show, 9000);
        onScroll = () => {
          if (window.scrollY > Math.max(500, document.documentElement.scrollHeight * 0.25)) {
            clearTimeout(timer);
            show();
          }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
      })
      .catch(() => {});
    return () => {
      clearTimeout(timer);
      if (onScroll) window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        localStorage.setItem("home-promo-dismissed-at", String(Date.now()));
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !cfg) return null;

  const close = () => {
    localStorage.setItem("home-promo-dismissed-at", String(Date.now()));
    setOpen(false);
  };
  const internal = typeof cfg.button_link === "string" && cfg.button_link.startsWith("/");
  const showButton = cfg.button_text && cfg.button_link;

  return createPortal(
    <div className="hm-overlay" onClick={close}>
      <div className="hm-modal" role="dialog" aria-modal="true" aria-label={cfg.title || "Announcement"} onClick={(e) => e.stopPropagation()}>
        <button className="hm-close" onClick={close} aria-label="Close" autoFocus>✕</button>
        <img className="hm-image" src={cfg.image} alt={cfg.alt || cfg.title || "SAP Security Expert announcement"} width="640" height="480" loading="lazy" decoding="async" />
        {showButton && (
          <div className="hm-footer">
            {internal ? (
              <Link className="hm-btn" to={cfg.button_link} onClick={close}>{cfg.button_text}</Link>
            ) : (
              <a className="hm-btn" href={cfg.button_link} target="_blank" rel="noopener noreferrer" onClick={close}>
                {cfg.button_text}
              </a>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
