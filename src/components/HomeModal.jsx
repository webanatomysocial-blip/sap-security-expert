import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { getHomeModal } from "../services/api";

export default function HomeModal() {
  const [cfg, setCfg] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let timer;
    getHomeModal()
      .then((r) => {
        if (!r.data?.enabled) return;
        setCfg(r.data);
        timer = setTimeout(() => setOpen(true), 1000);
      })
      .catch(() => {});
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !cfg) return null;

  const close = () => setOpen(false);
  const internal = cfg.button_link.startsWith("/");
  const showButton = cfg.button_text && cfg.button_link;

  return createPortal(
    <div className="hm-overlay" onClick={close}>
      <div className="hm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="hm-close" onClick={close} aria-label="Close">✕</button>
        <img className="hm-image" src={cfg.image} alt="" />
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
