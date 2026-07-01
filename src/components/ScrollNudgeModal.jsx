import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
import { getExclusiveCount } from "../services/api";

const SCROLL_THRESHOLD = 4;   // fire after 4 scroll events
const SESSION_KEY = "nudge_dismissed_this_session";

export default function ScrollNudgeModal({ isFreeArticle = true }) {
  const { isLoggedIn } = useMemberAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [exclusiveCount, setExclusiveCount] = useState(0);
  const scrollCount = useRef(0);
  const fired = useRef(false);

  // Only suppress within the same session (tab) after dismissal
  const isDismissed = () => sessionStorage.getItem(SESSION_KEY) === "1";

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
  };

  // Fetch exclusive count once for logged-in members
  useEffect(() => {
    if (isLoggedIn) {
      getExclusiveCount()
        .then((r) => setExclusiveCount((r.data.exclusive_count || 0) + (r.data.premium_count || 0)))
        .catch(() => {});
    }
  }, [isLoggedIn]);

  const handleScroll = useCallback(() => {
    if (fired.current || isDismissed()) return;
    scrollCount.current += 1;
    if (scrollCount.current >= SCROLL_THRESHOLD) {
      fired.current = true;
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isFreeArticle) return;
    if (isDismissed()) return;

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isFreeArticle, handleScroll]);

  if (!open) return null;

  const isVisitor = !isLoggedIn;

  return createPortal(
    <div className="sn-overlay" onClick={() => dismiss()}>
      <div className="sn-modal" onClick={(e) => e.stopPropagation()}>
        <button className="sn-close" onClick={() => dismiss()} aria-label="Close">✕</button>

        {isVisitor ? (
          <>
            <div className="sn-icon">📚</div>
            <h3 className="sn-title">Enjoying this article?</h3>
            <p className="sn-body">
              Join thousands of SAP Security, GRC &amp; BTP professionals. Get free access to
              exclusive insights, community discussions, and expert content — just by registering.
            </p>
            <div className="sn-actions">
              <button
                className="sn-btn-primary"
                onClick={() => { dismiss(); navigate("/member/register"); }}
              >
                Create Free Account
              </button>
              <button
                className="sn-btn-secondary"
                onClick={() => { dismiss(); navigate("/member/login"); }}
              >
                Already a member? Sign in
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="sn-icon">🔒</div>
            <h3 className="sn-title">Unlock more expert content</h3>
            <p className="sn-body">
              {exclusiveCount > 0
                ? `${exclusiveCount} articles are available only for exclusive paid members.`
                : "Premium &amp; exclusive articles are available for members with credits."}
              {" "}Get access to in-depth SAP Security guides, GRC frameworks, and BTP architecture deep-dives.
            </p>
            <div className="sn-actions">
              <button
                className="sn-btn-primary"
                onClick={() => { dismiss(); navigate("/member/credits"); }}
              >
                Get Credits &amp; Unlock Access
              </button>
              <button className="sn-btn-ghost" onClick={() => dismiss()}>
                Maybe later
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
