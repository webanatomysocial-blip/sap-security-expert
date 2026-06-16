'use client';

import React, { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ScrollToTop from "./components/ScrollToTop";
import Lenis from "lenis";
import { HelmetProvider } from "react-helmet-async";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmationProvider } from "./context/ConfirmationContext";
import { AuthProvider } from "./context/AuthContext";
import { MemberAuthProvider } from "./context/MemberAuthContext";

export default function AppWrapper() {
  useEffect(() => {
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

    // FORCE CLEANUP on load (Aggressive)
    const removeScrollLock = () => {
      document.body.classList.remove("antigravity-scroll-lock");
      document.body.style.overflow = "auto";
      document.body.style.height = "auto";
    };

    removeScrollLock();
    const intervalId = setInterval(removeScrollLock, 100);
    const timeoutId = setTimeout(() => clearInterval(intervalId), 2000);

    // Remove server-pre-rendered blog content once the SPA takes over
    const ssrEl = document.getElementById('ssr-blog-content');
    if (ssrEl) ssrEl.remove();

    return () => {
      lenis.destroy();
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <MemberAuthProvider>
                <ConfirmationProvider>
                  <ScrollToTop />
                  <App />
                </ConfirmationProvider>
              </MemberAuthProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
