import { useState } from "react";

const KEY = "admin-page-size";
export const PAGE_SIZES = [10, 25, 50, 100];

const readSize = () => {
  try {
    const n = parseInt(localStorage.getItem(KEY), 10);
    return n > 0 ? n : 10;
  } catch {
    return 10;
  }
};

// Client-side paging over an already loaded list. The chosen row count is
// shared by every admin table and remembered in localStorage.
export default function usePagination(items) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(readSize);

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;

  const setPageSize = (n) => {
    const size = Math.min(1000, Math.max(1, parseInt(n, 10) || 10));
    setPageSizeState(size);
    setPage(1);
    try { localStorage.setItem(KEY, String(size)); } catch { /* storage unavailable */ }
  };

  return {
    pageItems: items.slice(start, start + pageSize),
    bar: { page: current, pages, pageSize, total, start, setPage, setPageSize },
  };
}
