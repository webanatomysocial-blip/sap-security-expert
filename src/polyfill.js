// Safe storage polyfill — runs immediately on import, before any React context
// mounts. In restricted environments (Google WRS, sandboxed iframes, strict
// privacy mode) window.localStorage/.sessionStorage can exist but throw a
// SecurityError on access. That aborts React hydration and leaves only the
// loading skeleton, which Google classifies as a Soft 404.
//
// We verify each storage object with an actual read/write/remove round-trip.
// If it throws for any reason, we install a transparent in-memory fallback so
// the rest of the application never encounters a storage exception.

function makeMemoryStorage() {
  const store = new Map();

  return {
    get length() {
      return store.size;
    },
    getItem(key) {
      return store.has(String(key)) ? store.get(String(key)) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
  };
}

function isStorageUsable(storage) {
  try {
    const TEST_KEY = '__storage_test__';
    storage.setItem(TEST_KEY, '1');
    const val = storage.getItem(TEST_KEY);
    storage.removeItem(TEST_KEY);
    return val === '1';
  } catch (_) {
    return false;
  }
}

if (typeof window !== 'undefined') {
  if (!isStorageUsable(window.localStorage)) {
    try { Object.defineProperty(window, 'localStorage', { value: makeMemoryStorage(), writable: true, configurable: true }); } catch (_) { window.localStorage = makeMemoryStorage(); }
  }
  if (!isStorageUsable(window.sessionStorage)) {
    try { Object.defineProperty(window, 'sessionStorage', { value: makeMemoryStorage(), writable: true, configurable: true }); } catch (_) { window.sessionStorage = makeMemoryStorage(); }
  }
}
