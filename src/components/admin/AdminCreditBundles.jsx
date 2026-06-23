import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import TableScrollContainer from "./TableScrollContainer";
import ActionMenu from "./ActionMenu";
import { LuX, LuPlus, LuPackage, LuTicket } from "react-icons/lu";
import {
  getAdminBundles, saveBundle, deleteBundle,
  getAdminCoupons, saveCoupon, deleteCoupon,
  getCreditStats,
} from "../../services/api";
import { downloadCSV } from "../../services/exportUtils";

const EMPTY_BUNDLE = { id: null, name: "", credits: "", price_rupees: "", is_active: 1 };
const EMPTY_COUPON = { id: null, code: "", discount_type: "percentage", discount_value: "", max_uses: "0", is_active: 1, expires_at: "" };

export default function AdminCreditBundles() {
  const { addToast } = useToast();
  const { openConfirm } = useConfirm();
  const [tab, setTab] = useState("bundles");
  const [bundles, setBundles] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bundle modal
  const [bundleModal, setBundleModal] = useState(false);
  const [bundleForm, setBundleForm] = useState(EMPTY_BUNDLE);
  const [bundleErrors, setBundleErrors] = useState({});
  const [savingBundle, setSavingBundle] = useState(false);

  // Coupon modal
  const [couponModal, setCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState(EMPTY_COUPON);
  const [couponErrors, setCouponErrors] = useState({});
  const [savingCoupon, setSavingCoupon] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, cRes, sRes] = await Promise.all([
        getAdminBundles(),
        getAdminCoupons(),
        getCreditStats(),
      ]);
      setBundles(bRes.data?.bundles || []);
      setCoupons(cRes.data?.coupons || []);
      setStats(sRes.data?.stats || null);
    } catch {
      addToast("Failed to load credit data", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Bundle handlers ───────────────────────────────────────────────────────

  const openBundleModal = (bundle = null) => {
    setBundleErrors({});
    if (bundle) {
      setBundleForm({ ...bundle, price_rupees: (bundle.price_paise / 100).toFixed(0) });
    } else {
      setBundleForm(EMPTY_BUNDLE);
    }
    setBundleModal(true);
  };

  const validateBundle = () => {
    const errs = {};
    if (!bundleForm.name.trim()) errs.name = "Bundle name is required";
    if (!bundleForm.credits || parseInt(bundleForm.credits) < 1) errs.credits = "Credits must be at least 1";
    if (!bundleForm.price_rupees || parseFloat(bundleForm.price_rupees) < 1) errs.price_rupees = "Price must be at least ₹1";
    setBundleErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveBundle = async () => {
    if (!validateBundle()) return;
    setSavingBundle(true);
    try {
      await saveBundle({
        id: bundleForm.id,
        name: bundleForm.name.trim(),
        credits: parseInt(bundleForm.credits),
        price_paise: Math.round(parseFloat(bundleForm.price_rupees) * 100),
        is_active: bundleForm.is_active,
      });
      addToast(bundleForm.id ? "Bundle updated" : "Bundle created", "success");
      setBundleModal(false);
      fetchAll();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to save bundle", "error");
    } finally {
      setSavingBundle(false);
    }
  };

  const handleDeleteBundle = (id, name) => {
    openConfirm({
      title: "Delete Bundle",
      message: `Delete "${name}"? This cannot be undone. Members who already purchased credits keep them.`,
      confirmText: "Delete Bundle",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteBundle(id);
          addToast("Bundle deleted", "success");
          fetchAll();
        } catch {
          addToast("Failed to delete bundle", "error");
        }
      },
    });
  };

  const handleToggleBundleActive = async (b) => {
    try {
      await saveBundle({ ...b, price_paise: b.price_paise, is_active: b.is_active ? 0 : 1 });
      addToast(`Bundle ${b.is_active ? "deactivated" : "activated"}`, "success");
      fetchAll();
    } catch {
      addToast("Failed to update bundle status", "error");
    }
  };

  // ── Coupon handlers ───────────────────────────────────────────────────────

  const openCouponModal = (coupon = null) => {
    setCouponErrors({});
    if (coupon) {
      setCouponForm({ ...coupon, expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : "" });
    } else {
      setCouponForm(EMPTY_COUPON);
    }
    setCouponModal(true);
  };

  const validateCoupon = () => {
    const errs = {};
    if (!couponForm.code.trim()) errs.code = "Coupon code is required";
    if (!couponForm.discount_value || parseInt(couponForm.discount_value) < 1) errs.discount_value = "Discount value must be at least 1";
    if (couponForm.discount_type === "percentage" && parseInt(couponForm.discount_value) > 100) errs.discount_value = "Percentage cannot exceed 100";
    setCouponErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveCoupon = async () => {
    if (!validateCoupon()) return;
    setSavingCoupon(true);
    try {
      await saveCoupon({
        id: couponForm.id,
        code: couponForm.code.trim().toUpperCase(),
        discount_type: couponForm.discount_type,
        discount_value: parseInt(couponForm.discount_value),
        max_uses: parseInt(couponForm.max_uses || 0),
        is_active: couponForm.is_active,
        expires_at: couponForm.expires_at || null,
      });
      addToast(couponForm.id ? "Coupon updated" : "Coupon created", "success");
      setCouponModal(false);
      fetchAll();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to save coupon", "error");
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleDeleteCoupon = (id, code) => {
    openConfirm({
      title: "Delete Coupon",
      message: `Delete coupon "${code}"? Any uses already recorded will be preserved in transaction history.`,
      confirmText: "Delete Coupon",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteCoupon(id);
          addToast("Coupon deleted", "success");
          fetchAll();
        } catch {
          addToast("Failed to delete coupon", "error");
        }
      },
    });
  };

  const handleToggleCouponActive = async (c) => {
    try {
      await saveCoupon({ ...c, is_active: c.is_active ? 0 : 1 });
      addToast(`Coupon ${c.is_active ? "deactivated" : "activated"}`, "success");
      fetchAll();
    } catch {
      addToast("Failed to update coupon status", "error");
    }
  };

  const fmt = (paise) => `₹${(paise / 100).toFixed(0)}`;

  const getCouponStatus = (c) => {
    if (!c.is_active) return { label: "Inactive", bg: "#fee2e2", color: "#dc2626" };
    if (c.expires_at) {
      const today = new Date().toISOString().slice(0, 10);
      if (c.expires_at.slice(0, 10) <= today) {
        return { label: "Expired", bg: "#fef3c7", color: "#d97706" };
      }
    }
    if (c.max_uses > 0 && c.used_count >= c.max_uses) {
      return { label: "Exhausted", bg: "#fef3c7", color: "#d97706" };
    }
    return { label: "Active", bg: "#dcfce7", color: "#16a34a" };
  };

  const handleExportBundles = () => {
    downloadCSV(
      bundles.map((b) => ({ ...b, price_rupees: (b.price_paise / 100).toFixed(0), status: b.is_active ? "Active" : "Inactive" })),
      [
        { label: "Name", key: "name" },
        { label: "Credits", key: "credits" },
        { label: "Price (₹)", key: "price_rupees" },
        { label: "Status", key: "status" },
      ],
      "credit_bundles"
    );
  };

  const handleExportCoupons = () => {
    downloadCSV(
      coupons.map((c) => ({
        ...c,
        discount: c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`,
        uses: c.max_uses > 0 ? `${c.used_count} / ${c.max_uses}` : `${c.used_count} / Unlimited`,
        expires: c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-IN") : "No expiry",
        status: getCouponStatus(c).label,
      })),
      [
        { label: "Code", key: "code" },
        { label: "Discount", key: "discount" },
        { label: "Uses", key: "uses" },
        { label: "Expires", key: "expires" },
        { label: "Status", key: "status" },
      ],
      "coupons"
    );
  };

  if (loading) return <div className="admin-card" style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>;

  return (
    <div style={{ padding: "24px" }}>

      {/* Stats row */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Unlocks", value: stats.total_blog_unlocks, color: "#6366f1" },
            { label: "Total Purchases", value: stats.total_purchases, color: "#10b981" },
            { label: "Revenue", value: fmt(stats.total_revenue_paise || 0), color: "#d97706" },
            { label: "Credits Outstanding", value: stats.total_credits_outstanding, color: "#3b82f6" },
          ].map((s) => (
            <div key={s.label} className="admin-card" style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", width: "fit-content" }}>
        {[
          { key: "bundles", label: "Credit Bundles", icon: "bi-stack" },
          { key: "coupons", label: "Coupons", icon: "bi-ticket-perforated-fill" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 24px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: tab === t.key ? "#1e293b" : "#f8fafc",
              color: tab === t.key ? "#fff" : "#64748b",
            }}
          >
            <i className={`bi ${t.icon}`} style={{ marginRight: 6 }}></i>{t.label}
          </button>
        ))}
      </div>

      {/* ── BUNDLES ─────────────────────────────────────────────────────────── */}
      {tab === "bundles" && (
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Credit Bundles</h2>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>Packages members can purchase to unlock premium articles</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleExportBundles} className="btn-filter" title="Export to CSV">
                <i className="bi bi-download"></i> Export
              </button>
              <button className="btn-primary" onClick={() => openBundleModal()}>
                <LuPlus style={{ marginRight: 6 }} />New Bundle
              </button>
            </div>
          </div>

          <TableScrollContainer>
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="col-lg text-left">Bundle Name</th>
                  <th className="col-md text-center">Credits</th>
                  <th className="col-md text-center">Price</th>
                  <th className="col-sm text-center">Status</th>
                  <th className="col-actions text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bundles.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                      <LuPackage size={32} style={{ display: "block", margin: "0 auto 8px" }} />
                      No bundles yet. Create your first bundle to get started.
                    </td>
                  </tr>
                )}
                {bundles.map((b) => (
                  <tr key={b.id}>
                    <td className="col-lg text-left">
                      <strong>{b.name}</strong>
                    </td>
                    <td className="col-md text-center">
                      <span style={{ fontWeight: 700, color: "#d97706" }}>
                        <i className="bi bi-coin" style={{ marginRight: 4 }}></i>{b.credits}
                      </span>
                    </td>
                    <td className="col-md text-center" style={{ fontWeight: 600 }}>{fmt(b.price_paise)}</td>
                    <td className="col-sm text-center">
                      <span style={{
                        padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: b.is_active ? "#dcfce7" : "#fee2e2",
                        color: b.is_active ? "#16a34a" : "#dc2626",
                      }}>
                        {b.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="col-actions text-center">
                      <ActionMenu>
                        <button
                          className="action-menu-item"
                          onClick={() => openBundleModal(b)}
                        >
                          <i className="bi bi-pencil" style={{ marginRight: 6 }}></i>Edit
                        </button>
                        <button
                          className="action-menu-item"
                          onClick={() => handleToggleBundleActive(b)}
                        >
                          <i className={`bi ${b.is_active ? "bi-pause-circle" : "bi-play-circle"}`} style={{ marginRight: 6 }}></i>
                          {b.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <div className="action-menu-separator"></div>
                        <button
                          className="action-menu-item danger"
                          onClick={() => handleDeleteBundle(b.id, b.name)}
                        >
                          <i className="bi bi-trash" style={{ marginRight: 6 }}></i>Delete
                        </button>
                      </ActionMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollContainer>
        </div>
      )}

      {/* ── COUPONS ──────────────────────────────────────────────────────────── */}
      {tab === "coupons" && (
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Discount Coupons</h2>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>Percentage or fixed discounts applied at checkout</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleExportCoupons} className="btn-filter" title="Export to CSV">
                <i className="bi bi-download"></i> Export
              </button>
              <button className="btn-primary" onClick={() => openCouponModal()}>
                <LuPlus style={{ marginRight: 6 }} />New Coupon
              </button>
            </div>
          </div>

          <TableScrollContainer>
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="col-md text-left">Code</th>
                  <th className="col-md text-center">Discount</th>
                  <th className="col-sm text-center">Uses</th>
                  <th className="col-md text-center">Expires</th>
                  <th className="col-sm text-center">Status</th>
                  <th className="col-actions text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                      <LuTicket size={32} style={{ display: "block", margin: "0 auto 8px" }} />
                      No coupons yet. Create a coupon to offer discounts on credit bundles.
                    </td>
                  </tr>
                )}
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td className="col-md text-left">
                      <code style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: 4, fontWeight: 700, fontSize: 13 }}>{c.code}</code>
                    </td>
                    <td className="col-md text-center" style={{ fontWeight: 600 }}>
                      {c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`}
                    </td>
                    <td className="col-sm text-center" style={{ fontSize: 13 }}>
                      {c.used_count}{c.max_uses > 0 ? ` / ${c.max_uses}` : " / ∞"}
                    </td>
                    <td className="col-md text-center" style={{ fontSize: 13, color: "#64748b" }}>
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="col-sm text-center">
                      {(() => { const s = getCouponStatus(c); return (
                        <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      ); })()}
                    </td>
                    <td className="col-actions text-center">
                      <ActionMenu>
                        <button
                          className="action-menu-item"
                          onClick={() => openCouponModal(c)}
                        >
                          <i className="bi bi-pencil" style={{ marginRight: 6 }}></i>Edit
                        </button>
                        <button
                          className="action-menu-item"
                          onClick={() => handleToggleCouponActive(c)}
                        >
                          <i className={`bi ${c.is_active ? "bi-pause-circle" : "bi-play-circle"}`} style={{ marginRight: 6 }}></i>
                          {c.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <div className="action-menu-separator"></div>
                        <button
                          className="action-menu-item danger"
                          onClick={() => handleDeleteCoupon(c.id, c.code)}
                        >
                          <i className="bi bi-trash" style={{ marginRight: 6 }}></i>Delete
                        </button>
                      </ActionMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollContainer>
        </div>
      )}

      {/* ── Bundle Modal ─────────────────────────────────────────────────────── */}
      {bundleModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setBundleModal(false)}>
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ padding: 10, background: "#fffbeb", borderRadius: 10 }}>
                  <LuPackage size={20} style={{ color: "#d97706" }} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{bundleForm.id ? "Edit Bundle" : "New Credit Bundle"}</h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--slate-500)" }}>
                    {bundleForm.id ? "Update bundle details" : "Create a new credit package for members"}
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setBundleModal(false)}><LuX size={20} /></button>
            </div>

            <div className="modal-body" data-lenis-prevent="true">
              <div className="form-group">
                <label className="form-label">Bundle Name <span style={{ color: "#dc2626" }}>*</span></label>
                <input
                  className="form-control"
                  placeholder="e.g. Starter Pack"
                  value={bundleForm.name}
                  onChange={(e) => setBundleForm((p) => ({ ...p, name: e.target.value }))}
                  style={bundleErrors.name ? { borderColor: "#dc2626" } : {}}
                />
                {bundleErrors.name && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{bundleErrors.name}</p>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">Credits <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    className="form-control"
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={bundleForm.credits}
                    onChange={(e) => setBundleForm((p) => ({ ...p, credits: e.target.value }))}
                    style={bundleErrors.credits ? { borderColor: "#dc2626" } : {}}
                  />
                  {bundleErrors.credits && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{bundleErrors.credits}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Price (₹) <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    className="form-control"
                    type="number"
                    min="1"
                    placeholder="e.g. 99"
                    value={bundleForm.price_rupees}
                    onChange={(e) => setBundleForm((p) => ({ ...p, price_rupees: e.target.value }))}
                    style={bundleErrors.price_rupees ? { borderColor: "#dc2626" } : {}}
                  />
                  {bundleErrors.price_rupees && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{bundleErrors.price_rupees}</p>}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Status</label>
                <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  {[{ v: 1, label: "Active" }, { v: 0, label: "Inactive" }].map(({ v, label }) => (
                    <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" }}>
                      <input
                        type="radio"
                        name="bundle_status"
                        checked={bundleForm.is_active === v}
                        onChange={() => setBundleForm((p) => ({ ...p, is_active: v }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--slate-100)", padding: "14px 24px" }}>
              <button
                className="btn-secondary"
                onClick={() => setBundleModal(false)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--slate-200)", background: "white", fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveBundle}
                disabled={savingBundle}
                style={{ padding: "8px 20px", borderRadius: 8, opacity: savingBundle ? 0.7 : 1 }}
              >
                {savingBundle ? "Saving…" : bundleForm.id ? "Update Bundle" : "Create Bundle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Coupon Modal ─────────────────────────────────────────────────────── */}
      {couponModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCouponModal(false)}>
          <div className="modal-container" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ padding: 10, background: "#f0fdf4", borderRadius: 10 }}>
                  <LuTicket size={20} style={{ color: "#16a34a" }} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{couponForm.id ? "Edit Coupon" : "New Discount Coupon"}</h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--slate-500)" }}>
                    {couponForm.id ? "Update coupon details" : "Create a discount code for credit bundle checkout"}
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setCouponModal(false)}><LuX size={20} /></button>
            </div>

            <div className="modal-body" data-lenis-prevent="true">
              <div className="form-group">
                <label className="form-label">Coupon Code <span style={{ color: "#dc2626" }}>*</span></label>
                <input
                  className="form-control"
                  placeholder="e.g. SAVE20"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  style={{ textTransform: "uppercase", ...(couponErrors.code ? { borderColor: "#dc2626" } : {}) }}
                  disabled={!!couponForm.id}
                />
                {couponErrors.code && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{couponErrors.code}</p>}
                {couponForm.id && <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Code cannot be changed after creation.</p>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">Discount Type <span style={{ color: "#dc2626" }}>*</span></label>
                  <select
                    className="form-control"
                    value={couponForm.discount_type}
                    onChange={(e) => setCouponForm((p) => ({ ...p, discount_type: e.target.value, discount_value: "" }))}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {couponForm.discount_type === "percentage" ? "Discount %" : "Discount ₹"} <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    className="form-control"
                    type="number"
                    min="1"
                    max={couponForm.discount_type === "percentage" ? 100 : undefined}
                    placeholder={couponForm.discount_type === "percentage" ? "e.g. 20" : "e.g. 50"}
                    value={couponForm.discount_value}
                    onChange={(e) => setCouponForm((p) => ({ ...p, discount_value: e.target.value }))}
                    style={couponErrors.discount_value ? { borderColor: "#dc2626" } : {}}
                  />
                  {couponErrors.discount_value && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{couponErrors.discount_value}</p>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">Max Uses <span style={{ color: "#94a3b8", fontWeight: 400 }}>(0 = unlimited)</span></label>
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    value={couponForm.max_uses}
                    onChange={(e) => setCouponForm((p) => ({ ...p, max_uses: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Expires On <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
                  <input
                    className="form-control"
                    type="date"
                    value={couponForm.expires_at}
                    onChange={(e) => setCouponForm((p) => ({ ...p, expires_at: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Status</label>
                <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  {[{ v: 1, label: "Active" }, { v: 0, label: "Inactive" }].map(({ v, label }) => (
                    <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" }}>
                      <input
                        type="radio"
                        name="coupon_status"
                        checked={couponForm.is_active === v}
                        onChange={() => setCouponForm((p) => ({ ...p, is_active: v }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--slate-100)", padding: "14px 24px" }}>
              <button
                className="btn-secondary"
                onClick={() => setCouponModal(false)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--slate-200)", background: "white", fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveCoupon}
                disabled={savingCoupon}
                style={{ padding: "8px 20px", borderRadius: 8, opacity: savingCoupon ? 0.7 : 1 }}
              >
                {savingCoupon ? "Saving…" : couponForm.id ? "Update Coupon" : "Create Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}