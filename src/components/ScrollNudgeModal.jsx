import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
import { getExclusiveCount } from "../services/api";

// Trigger after 3 distinct downward scroll gestures (pause of 300ms between gestures)
const GESTURE_THRESHOLD = 3;
const GESTURE_GAP_MS = 300;

// Per-article key so dismissing on one article never suppresses another
const sessionKey = (path) => `nudge_dismissed:${path}`;

export default function ScrollNudgeModal({ isFreeArticle = true, isExclusiveArticle = false }) {
  const { isLoggedIn } = useMemberAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [exclusiveCount, setExclusiveCount] = useState(0);
  const gestureCount = useRef(0);
  const lastScrollTime = useRef(0);
  const lastScrollY = useRef(window.scrollY);
  const fired = useRef(false);

  const isDismissed = () => sessionStorage.getItem(sessionKey(location.pathname)) === "1";

  const dismiss = () => {
    sessionStorage.setItem(sessionKey(location.pathname), "1");
    setOpen(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      getExclusiveCount()
        .then((r) => setExclusiveCount((r.data.exclusive_count || 0) + (r.data.premium_count || 0)))
        .catch(() => {});
    }
  }, [isLoggedIn]);

  const handleScroll = useCallback(() => {
    if (fired.current || isDismissed()) return;

    const currentY = window.scrollY;
    const isScrollingDown = currentY > lastScrollY.current;
    lastScrollY.current = currentY;

    // Only count downward scroll gestures
    if (!isScrollingDown) return;

    const now = Date.now();
    // Each pause between scroll events counts as one gesture
    if (now - lastScrollTime.current > GESTURE_GAP_MS) {
      gestureCount.current += 1;
      lastScrollTime.current = now;
      if (gestureCount.current >= GESTURE_THRESHOLD) {
        fired.current = true;
        setOpen(true);
      }
    } else {
      lastScrollTime.current = now;
    }
  }, [location.pathname]);

  useEffect(() => {
    // Reset state when navigating to a new article
    gestureCount.current = 0;
    lastScrollTime.current = 0;
    lastScrollY.current = window.scrollY;
    fired.current = false;
    setOpen(false);

    if (!isFreeArticle && !isExclusiveArticle) return;
    if (isLoggedIn) return;
    if (isDismissed()) return;

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isFreeArticle, isExclusiveArticle, isLoggedIn, handleScroll, location.pathname]);

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
                onClick={() => { dismiss(); navigate("/member/signup"); }}
              >
                Create Free Account
              </button>
              <button
                className="sn-btn-secondary"
                onClick={() => { dismiss(); navigate("/member/login", { state: { from: location.pathname + location.search } }); }}
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
