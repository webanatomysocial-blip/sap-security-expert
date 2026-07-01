import { useEffect, useRef } from 'react';

// Global counter to handle nested/stacked modals
let lockCount = 0;

// Lenis v1 respects `data-lenis-prevent` on scrollable elements — it won't
// call preventDefault() on wheel/touch events that originate inside them.
// We stamp it on every .modal-body so modal content scrolls natively.
function setLenisPrevent(enable) {
  document.querySelectorAll('.modal-body').forEach(el => {
    if (enable) el.setAttribute('data-lenis-prevent', '');
    else el.removeAttribute('data-lenis-prevent');
  });
}

const useScrollLock = (isOpen) => {
  const isLocked = useRef(false);

  useEffect(() => {
    if (isOpen) {
      lockCount++;
      isLocked.current = true;
      if (lockCount === 1) {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.body.classList.add('modal-open');

        if (window.lenis && typeof window.lenis.stop === 'function') {
          window.lenis.stop();
        }
      }
      // Synchronous so the attribute is present before the first wheel event
      setLenisPrevent(true);
    }

    return () => {
      if (isLocked.current) {
        lockCount--;
        isLocked.current = false;
        if (lockCount === 0) {
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
          document.body.classList.remove('modal-open');

          if (window.lenis && typeof window.lenis.start === 'function') {
            window.lenis.start();
          }
          setLenisPrevent(false);
        }
      }
    };
  }, [isOpen]);
};

export default useScrollLock;
