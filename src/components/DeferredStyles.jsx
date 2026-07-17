'use client';
import { useEffect } from 'react';

// Bootstrap Icons + Google Fonts loaded after page is interactive so they
// do not block the initial render (render-blocking resource savings ~2,800ms).
const DEFERRED = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Roboto:wght@400;500&family=Source+Sans+Pro:wght@300;400;600&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css',
];

export default function DeferredStyles() {
  useEffect(() => {
    for (const href of DEFERRED) {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    }
  }, []);
  return null;
}
