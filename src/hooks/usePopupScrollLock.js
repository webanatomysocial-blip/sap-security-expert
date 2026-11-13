import { useEffect } from "react";

// Keeps the page behind a popup still while the popup is open.
// Pauses the Lenis smooth scroller (window.lenis) and locks the body. The popup keeps its own
// scrolling: its panel uses overscroll-behavior: contain, so the wheel never passes to the page.
// Pass active=false while the popup is closed, for popups that stay mounted.
export default function usePopupScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const lenis = typeof window !== "undefined" ? window.lenis : null;
    body.style.overflow = "hidden";
    lenis?.stop?.();
    return () => {
      body.style.overflow = prevOverflow;
      lenis?.start?.();
    };
  }, [active]);
}
