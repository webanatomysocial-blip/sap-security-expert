/**
 * Reusable skeleton loaders for admin data tables and cards.
 * Usage:
 *   <TableSkeleton cols={5} rows={6} />   — for table list pages
 *   <CardSkeleton count={3} />             — for card-grid pages
 *   <BlockSkeleton />                      — for full-page loading (e.g. FeaturedInsights)
 */

const Sk = ({ w = "100%", h = "14px", style = {} }) => (
  <span
    className="skeleton-line"
    style={{ width: w, height: h, display: "block", borderRadius: 6, ...style }}
  />
);

/** Table rows skeleton — mimics the admin table structure */
export function TableSkeleton({ cols = 5, rows = 7 }) {
  return (
    <table className="admin-table" style={{ width: "100%" }}>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r} className="skeleton-table-row">
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c}>
                <Sk w={c === 0 ? "70%" : c === cols - 1 ? "50%" : "80%"} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Card grid skeleton — mimics content cards */
export function CardSkeleton({ count = 4 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <Sk h="160px" style={{ borderRadius: 8 }} />
          <Sk w="75%" h="16px" />
          <Sk w="50%" h="13px" />
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Sk w="80px" h="30px" style={{ borderRadius: 6 }} />
            <Sk w="80px" h="30px" style={{ borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Simple full-width block skeleton for single-column layouts */
export function BlockSkeleton({ rows = 5 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-card" style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <span className="skeleton-line skeleton-avatar" style={{ width: 44, height: 44, flexShrink: 0, display: "block" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <Sk w={i % 2 === 0 ? "60%" : "80%"} h="14px" />
            <Sk w="40%" h="12px" />
          </div>
          <Sk w="80px" h="30px" style={{ borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}
