'use client';

import "./polyfill";
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

    // Defer SSR content removal until the active route component signals it has
    // rendered its own content (DynamicBlog calls window.__removeSsrContent() once
    // the article API call settles). A 3-second fallback handles non-article pages
    // (homepage, category listings) where no route component calls the function.
    // This ensures Google's renderer always sees content — either from the SSR div
    // or from the loaded SPA — never a bare skeleton loading state.
    const ssrEl = document.getElementById('ssr-blog-content');
    if (ssrEl) {
      // Article pages (/category/slug or deeper) — DynamicBlog calls
      // __removeSsrContent() once the API resolves successfully. If the API
      // fails (e.g. Googlebot blocked by robots.txt), SSR content stays
      // visible indefinitely so crawlers always see the article.
      // Non-article pages (homepage, category listings) get a 3-second
      // fallback so the SPA takes over quickly.
      const segments = window.location.pathname.split('/').filter(Boolean);
      const isArticlePage = segments.length >= 2;

      if (isArticlePage) {
        // No automatic fallback — DynamicBlog controls removal
        window.__removeSsrContent = () => {
          ssrEl.remove();
          delete window.__removeSsrContent;
        };
      } else {
        const fallbackTimer = setTimeout(() => {
          ssrEl.remove();
          delete window.__removeSsrContent;
        }, 500);
        window.__removeSsrContent = () => {
          clearTimeout(fallbackTimer);
          ssrEl.remove();
          delete window.__removeSsrContent;
        };
      }
    }

    return () => {
      lenis.destroy();
      window.removeEventListener('error', onChunkError);
      window.removeEventListener('unhandledrejection', onChunkError);
      delete window.__removeSsrContent;
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
