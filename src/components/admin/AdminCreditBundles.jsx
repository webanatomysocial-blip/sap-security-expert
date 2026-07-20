import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import TableScrollContainer from "./TableScrollContainer";
import ActionMenu from "./ActionMenu";
import { LuX, LuPlus, LuPackage, LuTicket, LuCoins, LuGift } from "react-icons/lu";
import {
  getAdminBundles, saveBundle, deleteBundle,
  getAdminCoupons, saveCoupon, deleteCoupon,
  getCreditStats, getAllCreditTransactions, grantAdminCredits, bulkGrantAdminCredits,
  getAdminMembers,
  getAdminCreditActivities, saveCreditActivity, deleteCreditActivity,
  getAdminAchievementTypes, saveAchievementType, deleteAchievementType,
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

  // Transactions tab
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txFilter, setTxFilter] = useState("");

  // Grant Credits tab
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [grantForm, setGrantForm] = useState({ member_id: "", amount: "", note: "" });
  const [grantErrors, setGrantErrors] = useState({});
  const [granting, setGranting] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  // Bulk grant mode
  const [grantMode, setGrantMode] = useState("single"); // "single" | "bulk"
  const [bulkTarget, setBulkTarget] = useState("all"); // "all" | "specific"
  const [bulkSelectedIds, setBulkSelectedIds] = useState(new Set());
  const [bulkMemberSearch, setBulkMemberSearch] = useState("");
  const [bulkForm, setBulkForm] = useState({ amount: "", note: "" });
  const [bulkErrors, setBulkErrors] = useState({});

  // Achievements tab
  const EMPTY_ACHIEVEMENT = { id: "", label: "", description: "", icon: "bi-stars", color: "#7c3aed", bg: "#faf5ff", criteria: "" };
  const [achievements, setAchievements] = useState([]);
  const [achievementModal, setAchievementModal] = useState(false);
  const [achievementForm, setAchievementForm] = useState(EMPTY_ACHIEVEMENT);
  const [achievementErrors, setAchievementErrors] = useState({});
  const [savingAchievement, setSavingAchievement] = useState(false);
  const [isEditingAchievement, setIsEditingAchievement] = useState(false);

  const fetchAchievements = useCallback(async () => {
    try {
      const res = await getAdminAchievementTypes();
      setAchievements(res.data?.achievements || []);
    } catch { addToast("Failed to load achievements", "error"); }
  }, [addToast]);

  const openAchievementModal = (ach = null) => {
    setIsEditingAchievement(!!ach);
    setAchievementForm(ach ? { ...ach } : EMPTY_ACHIEVEMENT);
    setAchievementErrors({});
    setAchievementModal(true);
  };

  const handleSaveAchievement = async () => {
    const errs = {};
    if (!achievementForm.id) errs.id = "Key is required";
    if (!achievementForm.label) errs.label = "Label is required";
    if (!achievementForm.description) errs.description = "Description is required";
    if (!achievementForm.icon) errs.icon = "Icon class is required";
    if (!achievementForm.criteria) errs.criteria = "Criteria is required";
    setAchievementErrors(errs);
    if (Object.keys(errs).length) return;
    setSavingAchievement(true);
    try {
      await saveAchievementType(achievementForm);
      addToast(isEditingAchievement ? "Achievement updated." : "Achievement created.", "success");
      setAchievementModal(false);
      fetchAchievements();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to save achievement", "error");
    } finally { setSavingAchievement(false); }
  };

  const handleDeleteAchievement = (ach) => {
    openConfirm({
      title: "Delete Achievement",
      message: `Delete "${ach.label}"? Members who already earned it keep it, but it won't appear for new earners.`,
      confirmLabel: "Delete",
      confirmClass: "btn-danger",
      onConfirm: async () => {
        try {
          await deleteAchievementType(ach.id);
          addToast("Achievement deleted.", "success");
          fetchAchievements();
        } catch { addToast("Failed to delete achievement", "error"); }
      },
    });
  };

  // Activities tab
  const EMPTY_ACTIVITY = { id: null, key: "", label: "", description: "", credits: "", is_active: 1 };
  const [activities, setActivities] = useState([]);
  const [activityModal, setActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState(EMPTY_ACTIVITY);
  const [activityErrors, setActivityErrors] = useState({});
  const [savingActivity, setSavingActivity] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      const actRes = await getAdminCreditActivities();
      setActivities(actRes.data?.activities || []);
    } catch {
      addToast("Failed to load activities", "error");
    }
  }, [addToast]);

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

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await getAllCreditTransactions(1, 200);
      setTransactions(res.data?.transactions || []);
    } catch {
      addToast("Failed to load transactions", "error");
    } finally {
      setTxLoading(false);
    }
  }, [addToast]);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await getAdminMembers("all");
      setMembers(res.data?.members || []);
    } catch {
      addToast("Failed to load members", "error");
    } finally {
      setMembersLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Lazy-load transactions / members / activities when tab is switched
  useEffect(() => {
    if (tab === "transactions" && transactions.length === 0) fetchTransactions();
    if (tab === "grant" && members.length === 0) fetchMembers();
    if (tab === "grant" && activities.length === 0) fetchActivities();
    if (tab === "activities" && activities.length === 0) fetchActivities();
    if (tab === "achievements" && achievements.length === 0) fetchAchievements();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Activity handlers ─────────────────────────────────────────────────────
  const openActivityModal = (act = EMPTY_ACTIVITY) => {
    setActivityForm({ ...act, credits: String(act.credits ?? "") });
    setActivityErrors({});
    setActivityModal(true);
  };

  const handleSaveActivity = async () => {
    const errs = {};
    if (!activityForm.label.trim()) errs.label = "Label is required";
    if (!activityForm.id && !activityForm.key.trim()) errs.key = "Key is required";
    if (activityForm.key && !/^[a-z0-9_]+$/.test(activityForm.key)) errs.key = "Key: lowercase letters, numbers, underscores only";
    const credits = parseInt(activityForm.credits);
    if (isNaN(credits) || credits < 0) errs.credits = "Credits must be 0 or more";
    if (Object.keys(errs).length) { setActivityErrors(errs); return; }
    setSavingActivity(true);
    try {
      await saveCreditActivity({
        id: activityForm.id,
        key: activityForm.key.trim(),
        label: activityForm.label.trim(),
        description: activityForm.description.trim(),
        credits,
        is_active: activityForm.is_active,
      });
      addToast(activityForm.id ? "Activity updated" : "Activity created", "success");
      setActivityModal(false);
      fetchActivities();
    } catch (err) {
      addToast(err.response?.data?.message || "Save failed", "error");
    } finally {
      setSavingActivity(false);
    }
  };

  const handleDeleteActivity = (act) => {
    openConfirm({
      title: "Delete Activity",
      message: `Delete "${act.label}"? This won't affect credits already granted.`,
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await deleteCreditActivity(act.id);
          addToast("Activity deleted", "success");
          fetchActivities();
        } catch {
          addToast("Delete failed", "error");
        }
      },
    });
  };

  // ── Grant Credits handler ─────────────────────────────────────────────────
  const handleGrant = async () => {
    const errs = {};
    if (!grantForm.member_id) errs.member_id = "Select a member";
    const amt = parseInt(grantForm.amount);
    if (!grantForm.amount || isNaN(amt) || amt === 0) errs.amount = "Enter a non-zero amount";
    setGrantErrors(errs);
    if (Object.keys(errs).length) return;
    setGranting(true);
    try {
      const res = await grantAdminCredits(grantForm.member_id, amt, grantForm.note || undefined);
      addToast(res.data.message || "Credits granted", "success");
      setGrantForm({ member_id: "", amount: "", note: "" });
      setMemberSearch("");
      getCreditStats().then((r) => setStats(r.data?.stats || null)).catch(() => {});
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to grant credits", "error");
    } finally {
      setGranting(false);
    }
  };

  // ── Bulk Grant Credits handler ────────────────────────────────────────────
  const toggleBulkMember = (id) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runBulkGrant = async () => {
    const errs = {};
    const amt = parseInt(bulkForm.amount);
    if (!bulkForm.amount || isNaN(amt) || amt === 0) errs.amount = "Enter a non-zero amount";
    if (bulkTarget === "specific" && bulkSelectedIds.size === 0) errs.members = "Select at least one member";
    setBulkErrors(errs);
    if (Object.keys(errs).length) return;

    const recipientCount = bulkTarget === "all"
      ? members.filter((m) => m.status === "approved" && !m.is_deleted).length
      : bulkSelectedIds.size;

    openConfirm({
      title: bulkTarget === "all" ? "Apply to ALL approved members?" : `Apply to ${recipientCount} selected member${recipientCount === 1 ? "" : "s"}?`,
      message: `This will ${amt > 0 ? "grant" : "deduct"} ${Math.abs(amt)} credit${Math.abs(amt) === 1 ? "" : "s"} ${amt > 0 ? "to" : "from"} ${bulkTarget === "all" ? `all ${recipientCount} approved members` : `${recipientCount} selected member${recipientCount === 1 ? "" : "s"}`}. This cannot be undone in bulk — you'd need to reverse each one individually.`,
      confirmText: "Apply Credits",
      isDanger: amt < 0,
      onConfirm: async () => {
        setGranting(true);
        try {
          const res = await bulkGrantAdminCredits({
            target: bulkTarget === "all" ? "all" : undefined,
            member_ids: bulkTarget === "specific" ? Array.from(bulkSelectedIds) : undefined,
            amount: amt,
            note: bulkForm.note || undefined,
          });
          addToast(res.data.message || "Bulk credit update applied", "success");
          if (res.data.failed_count) {
            addToast(`${res.data.failed_count} member(s) could not be updated (see console).`, "error");
            console.warn("Bulk grant failures:", res.data.failed);
          }
          setBulkForm({ amount: "", note: "" });
          setBulkSelectedIds(new Set());
          setBulkMemberSearch("");
          getCreditStats().then((r) => setStats(r.data?.stats || null)).catch(() => {});
        } catch (err) {
          addToast(err.response?.data?.message || "Failed to apply bulk credits", "error");
        } finally {
          setGranting(false);
        }
      },
    });
  };

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
          { key: "activities", label: "Earn Activities", icon: "bi-lightning-charge-fill" },
          { key: "achievements", label: "Achievements", icon: "bi-trophy-fill" },
          { key: "transactions", label: "Transactions", icon: "bi-receipt" },
          { key: "grant", label: "Grant Credits", icon: "bi-gift-fill" },
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

      {/* ── TRANSACTIONS ────────────────────────────────────────────────────── */}
      {tab === "transactions" && (
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Credit Transactions</h2>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>All credit purchases and admin adjustments</p>
            </div>
            <input
              className="form-control"
              placeholder="Filter by name or email…"
              value={txFilter}
              onChange={(e) => setTxFilter(e.target.value)}
              style={{ width: 240 }}
            />
          </div>
          {txLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
          ) : (
            <TableScrollContainer>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Credits</th>
                    <th>Amount</th>
                    <th>Bundle</th>
                    <th>Note</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .filter((t) => {
                      if (!txFilter.trim()) return true;
                      const q = txFilter.toLowerCase();
                      return (
                        t.member_name?.toLowerCase().includes(q) ||
                        t.member_email?.toLowerCase().includes(q)
                      );
                    })
                    .map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>{t.member_name}</td>
                        <td style={{ color: "#64748b", fontSize: 13 }}>{t.member_email}</td>
                        <td>
                          <span style={{
                            padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                            background: t.type === "purchase" ? "#dcfce7" : t.type === "admin_adjustment" ? "#eff6ff" : "#f1f5f9",
                            color: t.type === "purchase" ? "#15803d" : t.type === "admin_adjustment" ? "#1d4ed8" : "#64748b",
                          }}>
                            {t.type === "purchase" ? "Purchase" : t.type === "admin_adjustment" ? "Admin Grant" : t.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: t.credits_delta > 0 ? "#16a34a" : "#dc2626" }}>
                          {t.credits_delta > 0 ? "+" : ""}{t.credits_delta}
                        </td>
                        <td>{t.amount_paise > 0 ? `₹${(t.amount_paise / 100).toFixed(0)}` : "—"}</td>
                        <td>{t.bundle_name || "—"}</td>
                        <td style={{ color: "#64748b", fontSize: 13, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.note || "—"}</td>
                        <td style={{ color: "#94a3b8", fontSize: 13, whiteSpace: "nowrap" }}>
                          {new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No transactions yet</td></tr>
                  )}
                </tbody>
              </table>
            </TableScrollContainer>
          )}
        </div>
      )}

      {/* ── GRANT CREDITS ────────────────────────────────────────────────────── */}
      {tab === "grant" && (
        <div className="admin-card" style={{ maxWidth: 560 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Grant / Deduct Credits</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>Manually adjust member credit balances. Use a negative amount to deduct.</p>
          </div>

          <div style={{ display: "flex", gap: 8, padding: "16px 24px 0" }}>
            <button
              onClick={() => setGrantMode("single")}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: grantMode === "single" ? "#1e293b" : "#fff",
                color: grantMode === "single" ? "#fff" : "#475569",
              }}
            >
              Single Member
            </button>
            <button
              onClick={() => setGrantMode("bulk")}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: grantMode === "bulk" ? "#1e293b" : "#fff",
                color: grantMode === "bulk" ? "#fff" : "#475569",
              }}
            >
              Bulk Grant
            </button>
          </div>

          {grantMode === "single" ? (
          <div className="modal-body" style={{ padding: 24 }}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Search Member</label>
              <input
                className="form-control"
                placeholder="Type name or email…"
                value={memberSearch}
                onChange={(e) => { setMemberSearch(e.target.value); setGrantForm((p) => ({ ...p, member_id: "" })); }}
              />
            </div>
            {memberSearch.trim().length > 1 && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 16, maxHeight: 200, overflowY: "auto" }}>
                {membersLoading ? (
                  <div style={{ padding: 16, color: "#94a3b8", fontSize: 13 }}>Loading members…</div>
                ) : (
                  members
                    .filter((m) => {
                      const q = memberSearch.toLowerCase();
                      return m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
                    })
                    .slice(0, 10)
                    .map((m) => (
                      <div
                        key={m.id}
                        onClick={() => { setGrantForm((p) => ({ ...p, member_id: m.id })); setMemberSearch(`${m.name} (${m.email})`); }}
                        style={{
                          padding: "10px 16px", cursor: "pointer", fontSize: 14,
                          background: grantForm.member_id === m.id ? "#eff6ff" : "transparent",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <strong>{m.name}</strong> <span style={{ color: "#94a3b8", fontSize: 12 }}>{m.email}</span>
                      </div>
                    ))
                )}
              </div>
            )}
            {grantErrors.member_id && <p style={{ color: "#dc2626", fontSize: 12, marginBottom: 12 }}>{grantErrors.member_id}</p>}

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Credits Amount <span style={{ color: "#94a3b8", fontWeight: 400 }}>(negative to deduct)</span></label>
              <input
                className="form-control"
                type="number"
                placeholder="e.g. 5 or -2"
                value={grantForm.amount}
                onChange={(e) => setGrantForm((p) => ({ ...p, amount: e.target.value }))}
                style={grantErrors.amount ? { borderColor: "#dc2626" } : {}}
              />
              {grantErrors.amount && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{grantErrors.amount}</p>}
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Activity <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional — auto-fills note)</span></label>
              <select
                className="form-control"
                onChange={(e) => {
                  const act = activities.find((a) => a.key === e.target.value);
                  if (act) setGrantForm((p) => ({ ...p, note: act.label, amount: p.amount || String(act.credits) }));
                }}
                defaultValue=""
              >
                <option value="">— Select activity —</option>
                {activities.filter((a) => a.is_active).map((a) => (
                  <option key={a.key} value={a.key}>{a.label} ({a.credits} credits)</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Note <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
              <input
                className="form-control"
                placeholder="e.g. Complimentary access, Refund…"
                value={grantForm.note}
                onChange={(e) => setGrantForm((p) => ({ ...p, note: e.target.value }))}
              />
            </div>

            <button
              className="btn-primary"
              onClick={handleGrant}
              disabled={granting}
              style={{ padding: "10px 28px", opacity: granting ? 0.7 : 1 }}
            >
              <LuGift size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
              {granting ? "Processing…" : "Apply Credits"}
            </button>
          </div>
          ) : (
          <div className="modal-body" style={{ padding: 24 }}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Apply To</label>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                {[
                  {
                    key: "all",
                    title: "All Approved Members",
                    subtitle: `${members.filter((m) => m.status === "approved" && !m.is_deleted).length} members`,
                  },
                  {
                    key: "specific",
                    title: "Select Specific Members",
                    subtitle: bulkTarget === "specific" ? `${bulkSelectedIds.size} selected` : "Choose individually",
                  },
                ].map((opt) => (
                  <div
                    key={opt.key}
                    onClick={() => setBulkTarget(opt.key)}
                    role="radio"
                    aria-checked={bulkTarget === opt.key}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1.5px solid ${bulkTarget === opt.key ? "#1e293b" : "#e2e8f0"}`,
                      background: bulkTarget === opt.key ? "#f8fafc" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: `2px solid ${bulkTarget === opt.key ? "#1e293b" : "#cbd5e1"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {bulkTarget === opt.key && (
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1e293b" }} />
                      )}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{opt.title}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{opt.subtitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {bulkTarget === "specific" && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">
                  Members <span style={{ color: "#94a3b8", fontWeight: 400 }}>({bulkSelectedIds.size} selected)</span>
                </label>
                <input
                  className="form-control"
                  placeholder="Search name or email to filter…"
                  value={bulkMemberSearch}
                  onChange={(e) => setBulkMemberSearch(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <div
                  data-lenis-prevent
                  style={{ border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 260, overflowY: "auto" }}
                >
                  {membersLoading ? (
                    <div style={{ padding: 16, color: "#94a3b8", fontSize: 13 }}>Loading members…</div>
                  ) : (
                    members
                      .filter((m) => m.status === "approved" && !m.is_deleted)
                      .filter((m) => {
                        const q = bulkMemberSearch.toLowerCase();
                        if (!q) return true;
                        return m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
                      })
                      .map((m) => {
                        const checked = bulkSelectedIds.has(m.id);
                        return (
                          <div
                            key={m.id}
                            onClick={() => toggleBulkMember(m.id)}
                            role="checkbox"
                            aria-checked={checked}
                            style={{
                              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", fontSize: 13,
                              background: checked ? "#eff6ff" : "transparent",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            <span
                              style={{
                                flexShrink: 0,
                                width: 18,
                                height: 18,
                                borderRadius: 5,
                                border: `1.5px solid ${checked ? "#1e293b" : "#cbd5e1"}`,
                                background: checked ? "#1e293b" : "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {checked && (
                                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                                  <path d="M3 8.5L6.2 11.5L13 4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ color: "#1e293b" }}>{m.name}</strong>{" "}
                              <span style={{ color: "#94a3b8", fontSize: 12 }}>{m.email}</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
                {bulkErrors.members && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{bulkErrors.members}</p>}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Credits Amount <span style={{ color: "#94a3b8", fontWeight: 400 }}>(negative to deduct)</span></label>
              <input
                className="form-control"
                type="number"
                placeholder="e.g. 5 or -2"
                value={bulkForm.amount}
                onChange={(e) => setBulkForm((p) => ({ ...p, amount: e.target.value }))}
                style={bulkErrors.amount ? { borderColor: "#dc2626" } : {}}
              />
              {bulkErrors.amount && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{bulkErrors.amount}</p>}
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Activity <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional — auto-fills note)</span></label>
              <select
                className="form-control"
                onChange={(e) => {
                  const act = activities.find((a) => a.key === e.target.value);
                  if (act) setBulkForm((p) => ({ ...p, note: act.label, amount: p.amount || String(act.credits) }));
                }}
                defaultValue=""
              >
                <option value="">— Select activity —</option>
                {activities.filter((a) => a.is_active).map((a) => (
                  <option key={a.key} value={a.key}>{a.label} ({a.credits} credits)</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Note <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
              <input
                className="form-control"
                placeholder="e.g. Holiday bonus, Community appreciation…"
                value={bulkForm.note}
                onChange={(e) => setBulkForm((p) => ({ ...p, note: e.target.value }))}
              />
            </div>

            <button
              className="btn-primary"
              onClick={runBulkGrant}
              disabled={granting}
              style={{ padding: "10px 28px", opacity: granting ? 0.7 : 1 }}
            >
              <LuGift size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
              {granting ? "Processing…" : "Apply to All Selected"}
            </button>
          </div>
          )}
        </div>
      )}

      {/* ── EARN ACTIVITIES ──────────────────────────────────────────────────── */}
      {tab === "activities" && (
        <>
        <div className="admin-card">
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Earn Activities</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>Configure how many credits members earn for each action.</p>
          </div>
          <TableScrollContainer>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Label</th>
                  <th>Description</th>
                  <th style={{ textAlign: "center" }}>Credits</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>No activities yet.</td></tr>
                ) : activities.map((act) => (
                  <tr key={act.id}>
                    <td><code style={{ fontSize: 12, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>{act.key}</code></td>
                    <td style={{ fontWeight: 600 }}>{act.label}</td>
                    <td style={{ color: "#64748b", fontSize: 13 }}>{act.description || "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ fontWeight: 700, color: "#ee5e42", fontSize: 15 }}>{act.credits}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: act.is_active ? "#dcfce7" : "#f1f5f9",
                        color: act.is_active ? "#16a34a" : "#94a3b8",
                      }}>
                        {act.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <ActionMenu items={[
                        { label: "Edit", icon: "bi-pencil", onClick: () => openActivityModal(act) },
                        { label: "Delete", icon: "bi-trash", className: "text-danger", onClick: () => handleDeleteActivity(act) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollContainer>
        </div>
        </>
      )}

      {/* ── Achievements Tab ──────────────────────────────────────────────────── */}
      {tab === "achievements" && (
        <div className="admin-card">
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Achievements</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>Badges members earn for completing specific actions.</p>
          </div>
          <TableScrollContainer>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Badge</th>
                  <th>Key</th>
                  <th>Label</th>
                  <th>Description</th>
                  <th>Criteria</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {achievements.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>No achievements yet.</td></tr>
                ) : achievements.map((ach) => (
                  <tr key={ach.id}>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: ach.bg, color: ach.color, fontSize: 18 }}>
                        <i className={`bi ${ach.icon}`} />
                      </span>
                    </td>
                    <td><code style={{ fontSize: 12, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>{ach.id}</code></td>
                    <td style={{ fontWeight: 600 }}>{ach.label}</td>
                    <td style={{ color: "#64748b", fontSize: 13 }}>{ach.description}</td>
                    <td style={{ color: "#64748b", fontSize: 13 }}>{ach.criteria}</td>
                    <td style={{ textAlign: "center" }}>
                      <ActionMenu items={[
                        { label: "Edit", icon: "bi-pencil", onClick: () => openAchievementModal(ach) },
                        { label: "Delete", icon: "bi-trash", className: "text-danger", onClick: () => handleDeleteAchievement(ach) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollContainer>
        </div>
      )}

      {/* ── Achievement Modal ─────────────────────────────────────────────────── */}
      {achievementModal && createPortal(
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAchievementModal(false)}>
          <div className="modal-container" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ padding: 10, background: "#fef3c7", borderRadius: 10 }}>
                  <i className="bi bi-trophy-fill" style={{ color: "#d97706", fontSize: 20 }} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{isEditingAchievement ? "Edit Achievement" : "New Achievement"}</h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--slate-500)" }}>
                    {isEditingAchievement ? "Update badge details" : "Define a new badge for members to earn"}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setAchievementModal(false)}><LuX /></button>
            </div>
            <div className="modal-body" data-lenis-prevent style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Key (ID) <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    className="form-control"
                    placeholder="e.g. first_comment"
                    value={achievementForm.id}
                    disabled={isEditingAchievement}
                    onChange={(e) => setAchievementForm((p) => ({ ...p, id: e.target.value }))}
                    style={achievementErrors.id ? { borderColor: "#dc2626" } : {}}
                  />
                  {achievementErrors.id && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{achievementErrors.id}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Label <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    className="form-control"
                    placeholder="e.g. First Voice"
                    value={achievementForm.label}
                    onChange={(e) => setAchievementForm((p) => ({ ...p, label: e.target.value }))}
                    style={achievementErrors.label ? { borderColor: "#dc2626" } : {}}
                  />
                  {achievementErrors.label && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{achievementErrors.label}</p>}
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Description <span style={{ color: "#dc2626" }}>*</span></label>
                <input
                  className="form-control"
                  placeholder="e.g. Had your first comment approved"
                  value={achievementForm.description}
                  onChange={(e) => setAchievementForm((p) => ({ ...p, description: e.target.value }))}
                  style={achievementErrors.description ? { borderColor: "#dc2626" } : {}}
                />
                {achievementErrors.description && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{achievementErrors.description}</p>}
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Criteria <span style={{ color: "#dc2626" }}>*</span></label>
                <input
                  className="form-control"
                  placeholder="e.g. 1 approved comment"
                  value={achievementForm.criteria}
                  onChange={(e) => setAchievementForm((p) => ({ ...p, criteria: e.target.value }))}
                  style={achievementErrors.criteria ? { borderColor: "#dc2626" } : {}}
                />
                {achievementErrors.criteria && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{achievementErrors.criteria}</p>}
              </div>
              {/* Icon Class — full width */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Icon Class <span style={{ color: "#dc2626" }}>*</span></label>
                <input
                  className="form-control"
                  placeholder="e.g. bi-stars"
                  value={achievementForm.icon}
                  onChange={(e) => setAchievementForm((p) => ({ ...p, icon: e.target.value }))}
                  style={achievementErrors.icon ? { borderColor: "#dc2626" } : {}}
                />
                {achievementErrors.icon && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{achievementErrors.icon}</p>}
              </div>

              {/* Color pickers — 2 columns */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div className="form-group">
                  <label className="form-label">Icon Color</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={achievementForm.color}
                      onChange={(e) => setAchievementForm((p) => ({ ...p, color: e.target.value }))}
                      style={{ width: 40, height: 40, padding: 2, border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", flexShrink: 0 }}
                    />
                    <input
                      className="form-control"
                      value={achievementForm.color}
                      onChange={(e) => setAchievementForm((p) => ({ ...p, color: e.target.value }))}
                      style={{ fontFamily: "monospace", fontSize: 13 }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Badge Background</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={achievementForm.bg}
                      onChange={(e) => setAchievementForm((p) => ({ ...p, bg: e.target.value }))}
                      style={{ width: 40, height: 40, padding: 2, border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", flexShrink: 0 }}
                    />
                    <input
                      className="form-control"
                      value={achievementForm.bg}
                      onChange={(e) => setAchievementForm((p) => ({ ...p, bg: e.target.value }))}
                      style={{ fontFamily: "monospace", fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>

              {/* Live badge preview */}
              {achievementForm.icon && (
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 24 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: "50%", background: achievementForm.bg, color: achievementForm.color, fontSize: 24, flexShrink: 0 }}>
                    <i className={`bi ${achievementForm.icon}`} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{achievementForm.label || "Badge Label"}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{achievementForm.description || "Description preview"}</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>Preview</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="btn-cancel" onClick={() => setAchievementModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleSaveAchievement} disabled={savingAchievement} style={{ padding: "10px 28px", opacity: savingAchievement ? 0.7 : 1 }}>
                  {savingAchievement ? "Saving…" : isEditingAchievement ? "Update Achievement" : "Create Achievement"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Activity Modal ────────────────────────────────────────────────────── */}
      {activityModal && createPortal(
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setActivityModal(false)}>
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ padding: 10, background: "#fef3c7", borderRadius: 10 }}>
                  <i className="bi bi-lightning-charge-fill" style={{ color: "#d97706", fontSize: 20 }} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{activityForm.id ? "Edit Activity" : "New Earn Activity"}</h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--slate-500)" }}>
                    {activityForm.id ? "Update credit amount and settings" : "Define a new way for members to earn credits"}
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setActivityModal(false)}><LuX size={20} /></button>
            </div>
            <div className="modal-body" data-lenis-prevent style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {!activityForm.id && (
                <div className="form-group">
                  <label className="form-label">Key <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    className={`form-control${activityErrors.key ? " is-invalid" : ""}`}
                    placeholder="e.g. linkedin_share"
                    value={activityForm.key}
                    onChange={(e) => setActivityForm((p) => ({ ...p, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                  />
                  {activityErrors.key && <div className="invalid-feedback">{activityErrors.key}</div>}
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Unique identifier used in code. Cannot be changed after creation.</div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Label <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  className={`form-control${activityErrors.label ? " is-invalid" : ""}`}
                  placeholder="e.g. LinkedIn Share"
                  value={activityForm.label}
                  onChange={(e) => setActivityForm((p) => ({ ...p, label: e.target.value }))}
                />
                {activityErrors.label && <div className="invalid-feedback">{activityErrors.label}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-control"
                  placeholder="Short explanation shown to members"
                  value={activityForm.description}
                  onChange={(e) => setActivityForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Credits Awarded <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="number"
                  min="0"
                  className={`form-control${activityErrors.credits ? " is-invalid" : ""}`}
                  placeholder="e.g. 5"
                  value={activityForm.credits}
                  onChange={(e) => setActivityForm((p) => ({ ...p, credits: e.target.value }))}
                />
                {activityErrors.credits && <div className="invalid-feedback">{activityErrors.credits}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ v: 1, label: "Active" }, { v: 0, label: "Disabled" }].map(({ v, label }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setActivityForm((p) => ({ ...p, is_active: v }))}
                      style={{
                        padding: "8px 20px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: 600, fontSize: 13,
                        background: activityForm.is_active === v ? "#1e293b" : "#f8fafc",
                        color: activityForm.is_active === v ? "#fff" : "#64748b",
                      }}
                    >{label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--slate-100)", padding: "14px 24px" }}>
              <button className="btn-secondary" onClick={() => setActivityModal(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--slate-200)", background: "white", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveActivity} disabled={savingActivity} style={{ padding: "8px 20px", borderRadius: 8, opacity: savingActivity ? 0.7 : 1 }}>
                {savingActivity ? "Saving…" : activityForm.id ? "Update Activity" : "Create Activity"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Bundle Modal ─────────────────────────────────────────────────────── */}
      {bundleModal && createPortal(
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
        </div>,
        document.body
      )}

      {/* ── Coupon Modal ─────────────────────────────────────────────────────── */}
      {couponModal && createPortal(
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
        </div>,
        document.body
      )}
    </div>
  );
}