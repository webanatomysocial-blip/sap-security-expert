'use client';

import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ScrollToTop from "./components/ScrollToTop";
import Lenis from "lenis";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmationProvider } from "./context/ConfirmationContext";
import { AuthProvider } from "./context/AuthContext";
import { MemberAuthProvider } from "./context/MemberAuthContext";
import CookieConsent from "./components/CookieConsent";
import ConsentScriptLoader from "./components/ConsentScriptLoader";

export default function AppWrapper() {
  useEffect(() => {
    // A deploy replaces .next/static with new content-hashed chunk filenames.
    // A tab or crawler holding HTML from just before the deploy will request
    // chunks that no longer exist and hydration fails outright. Reload once
    // to pick up the new build instead of leaving the visitor stuck on the
    // static #ssr-blog-content fallback.
    const onChunkError = (e) => {
      const msg = e?.message || e?.reason?.message || '';
      if (!/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(msg)) return;
      const key = 'chunk-reload-attempted';
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      window.location.reload();
    };
    window.addEventListener('error', onChunkError);
    window.addEventListener('unhandledrejection', onChunkError);

    // Global Lenis initialization
    const lenis = new Lenis({
      duration: 1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: "vertical",
      gestureDirection: "vertical",
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });
    window.lenis = lenis;
    window.__lenis = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Remove any scroll lock left over from modals/overlays
    document.body.classList.remove("antigravity-scroll-lock");
    document.body.style.overflow = "";
    document.body.style.height = "";

    // Remove server-pre-rendered blog content once the SPA takes over
    const ssrEl = document.getElementById('ssr-blog-content');
    if (ssrEl) ssrEl.remove();

    return () => {
      lenis.destroy();
      window.removeEventListener('error', onChunkError);
      window.removeEventListener('unhandledrejection', onChunkError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <MemberAuthProvider>
              <ConfirmationProvider>
                <ScrollToTop />
                <App />
                <CookieConsent />
                <ConsentScriptLoader />
              </ConfirmationProvider>
            </MemberAuthProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
