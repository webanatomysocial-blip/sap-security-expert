import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useMemberAuth } from "../context/MemberAuthContext";
import { useToast } from "../context/ToastContext";
import {
  getMyTransactions,
  getCreditBundles,
  validateCoupon,
  createCreditOrder,
  verifyCreditPayment,
} from "../services/api";

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtAmount = (p) => p ? `₹${(p / 100).toLocaleString("en-IN")}` : "—";

/* ── Buy Credits Modal ─────────────────────────────────────────────────────── */
function BuyCreditsModal({ onClose, onSuccess }) {
  const [bundles, setBundles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [validating, setValidating] = useState(false);
  const [paying, setPaying] = useState(false);
  const { addToast } = useToast();
  const { onCreditsPurchased } = useMemberAuth();

  useEffect(() => {
    getCreditBundles().then((r) => {
      const list = r.data.bundles || r.data || [];
      setBundles(list);
      if (list.length) setSelected(list[0]);
    }).catch(() => {});
  }, []);

  const finalPaise = selected
    ? Math.max(selected.price_paise - (couponData?.discount_paise || 0), 100)
    : 0;

  const handleCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidating(true); setCouponError(""); setCouponData(null);
    try {
      const r = await validateCoupon(couponCode.trim(), selected?.id);
      setCouponData(r.data.coupon);
    } catch (err) {
      setCouponError(err.response?.data?.message || "Invalid coupon.");
    } finally { setValidating(false); }
  };

  const handlePay = async () => {
    if (!selected) return;
    setPaying(true);
    try {
      const orderRes = await createCreditOrder(selected.id, couponData ? couponCode : undefined);
      const { order_id: razorpay_order_id, final_price_paise, key_id } = orderRes.data;

      const options = {
        key: key_id,
        amount: final_price_paise,
        currency: "INR",
        name: "SAP Security Expert",
        description: `${selected.credits} Credits — ${selected.name}`,
        order_id: razorpay_order_id,
        handler: async (response) => {
          try {
            await verifyCreditPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (onCreditsPurchased) onCreditsPurchased(selected.credits);
            addToast(`${selected.credits} credits added!`, "success");
            onSuccess();
          } catch { addToast("Payment verification failed.", "error"); }
        },
        prefill: {},
        theme: { color: "#e85d2f" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to create order.", "error");
    } finally { setPaying(false); }
  };

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: "32px 28px", maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b" }}>Buy Credits</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>✕</button>
        </div>

        {/* Bundle selection */}
        <p style={{ margin: "0 0 12px", fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>Select a Bundle</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {bundles.map((b) => (
            <div
              key={b.id}
              onClick={() => { setSelected(b); setCouponData(null); setCouponCode(""); setCouponError(""); }}
              style={{
                border: `2px solid ${selected?.id === b.id ? "#e85d2f" : "#e2e8f0"}`,
                borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                background: selected?.id === b.id ? "#fff7f5" : "#fff",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "all 0.15s",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: "#1e293b" }}>{b.name}</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>
                  🪙 {b.credits} credits
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem", color: selected?.id === b.id ? "#e85d2f" : "#334155" }}>
                {fmtAmount(b.price_paise)}
              </div>
            </div>
          ))}
        </div>

        {/* Coupon */}
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <input
            type="text"
            value={couponCode}
            onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponData(null); setCouponError(""); }}
            placeholder="Coupon code (optional)"
            style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: "0.9rem", fontFamily: "inherit" }}
          />
          <button
            onClick={handleCoupon}
            disabled={validating || !couponCode.trim()}
            style={{ padding: "10px 18px", background: "#1e293b", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit", opacity: validating || !couponCode.trim() ? 0.5 : 1 }}
          >
            {validating ? "…" : "Apply"}
          </button>
        </div>
        {couponError && <p style={{ margin: "4px 0 8px", fontSize: "0.8rem", color: "#dc2626" }}>{couponError}</p>}
        {couponData && (
          <p style={{ margin: "4px 0 8px", fontSize: "0.8rem", color: "#16a34a" }}>
            ✅ ₹{(couponData.discount_paise / 100).toFixed(0)} off applied
          </p>
        )}

        {/* Summary */}
        {selected && (
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 20, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "#64748b", marginBottom: 6 }}>
              <span>{selected.name}</span><span>{fmtAmount(selected.price_paise)}</span>
            </div>
            {couponData && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "#16a34a", marginBottom: 6 }}>
                <span>Discount</span><span>−{fmtAmount(couponData.discount_paise)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1rem", color: "#1e293b", borderTop: "1px solid #e2e8f0", paddingTop: 8, marginTop: 4 }}>
              <span>Total</span><span>{fmtAmount(finalPaise)}</span>
            </div>
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={paying || !selected}
          style={{
            width: "100%", padding: "14px 20px", background: "#e85d2f", color: "#fff",
            border: "none", borderRadius: 10, fontWeight: 700, fontSize: "1rem",
            cursor: "pointer", fontFamily: "inherit", opacity: paying || !selected ? 0.6 : 1,
          }}
        >
          {paying ? "Processing…" : `Pay ${fmtAmount(finalPaise)}`}
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */
export default function MemberCredits() {
  const { isLoggedIn, creditBalance } = useMemberAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "unlocks" ? "unlocks" : "purchases");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const reload = () => {
    setLoading(true);
    getMyTransactions().then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isLoggedIn) { navigate("/member/login", { state: { from: "/member/credits" } }); return; }
    reload();
  }, [isLoggedIn]);

  const balance        = data?.balance ?? creditBalance ?? 0;
  const allTx          = data?.transactions || [];
  const paidPurchases  = allTx.filter((t) => t.type === "purchase" && t.amount_paise > 0);
  const bonusCredits   = allTx.filter((t) => t.type === "bonus" || (t.credits_delta > 0 && t.amount_paise === 0 && t.type !== "spend"));
  const unlocks        = data?.unlocks || [];
  const totalSpent     = allTx.reduce((s, t) => s + (t.amount_paise || 0), 0);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px 80px" }}>
      <Helmet><title>My Credits &amp; Transactions | SAP Security Expert</title></Helmet>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link to="/" style={{ color: "#64748b", fontSize: "0.85rem", textDecoration: "none" }}>← Back to Home</Link>
        <h1 style={{ margin: "12px 0 4px", fontSize: "1.6rem", color: "#1e293b" }}>Credits &amp; Transactions</h1>
        <p style={{ margin: 0, color: "#64748b" }}>Manage your credits, view purchase history and unlocked articles.</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Credits Balance</p>
          <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "#f59e0b" }}>🪙 {loading ? "—" : balance}</p>
        </div>
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Articles Unlocked</p>
          <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "#3b82f6" }}>{loading ? "—" : unlocks.length}</p>
        </div>
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Spent</p>
          <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "#10b981" }}>{loading ? "—" : fmtAmount(totalSpent)}</p>
        </div>
        <div style={{ background: "linear-gradient(135deg,#e85d2f,#f97316)", borderRadius: 14, padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <p style={{ margin: "0 0 10px", fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>Need more credits?</p>
          <button
            onClick={() => setShowBuyModal(true)}
            style={{ padding: "10px 18px", background: "#fff", color: "#e85d2f", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}
          >
            Buy Credits →
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #f1f5f9", marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { key: "purchases", label: "Purchase History", count: paidPurchases.length },
          { key: "activity", label: "Activity Credits", count: bonusCredits.length },
          { key: "unlocks", label: "Unlocked Articles", count: unlocks.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "10px 20px", background: "none", border: "none",
              borderBottom: activeTab === t.key ? "2px solid #e85d2f" : "2px solid transparent",
              marginBottom: -2, color: activeTab === t.key ? "#e85d2f" : "#64748b",
              fontWeight: activeTab === t.key ? 700 : 500, fontSize: "0.9rem",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {t.label}
            <span style={{ marginLeft: 6, background: "#f1f5f9", color: "#64748b", borderRadius: 20, padding: "1px 8px", fontSize: "0.75rem" }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Purchase History */}
      {activeTab === "purchases" && (
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
          ) : paidPurchases.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🧾</div>
              <p style={{ color: "#64748b", marginBottom: 20 }}>No purchases yet.</p>
              <button onClick={() => setShowBuyModal(true)} style={{ padding: "12px 24px", background: "#e85d2f", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Buy Your First Bundle
              </button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Bundle</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Credits</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: 600 }}>Date</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {paidPurchases.map((t, i) => (
                  <tr key={t.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 16px", color: "#334155", fontWeight: 500 }}>{t.bundle_name || "Credit Purchase"}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 10px", borderRadius: 20, fontWeight: 700, fontSize: "0.85rem" }}>+{t.credits_delta}</span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", color: "#10b981", fontWeight: 600 }}>{fmtAmount(t.amount_paise)}</td>
                    <td style={{ padding: "14px 16px", textAlign: "right", color: "#94a3b8" }}>{fmt(t.created_at)}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <a
                        href={`/member/invoice/${t.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "0.8rem", color: "#1d4ed8", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <i className="bi bi-receipt"></i> View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Activity Credits */}
      {activeTab === "activity" && (() => {
        const ACTIVITY_META = {
          "Registration welcome bonus":  { icon: "bi-person-check-fill",     color: "#3b82f6", label: "New Registration" },
          "LinkedIn share bonus":         { icon: "bi-linkedin",               color: "#0077b5", label: "LinkedIn Share" },
          "Complete profile bonus":       { icon: "bi-person-badge-fill",      color: "#0ea5e9", label: "Complete Profile" },
          "Article published":            { icon: "bi-file-earmark-text-fill", color: "#f59e0b", label: "Article Published" },
          "Approved comment":             { icon: "bi-chat-dots-fill",         color: "#10b981", label: "Approved Comment" },
          "Error report":                 { icon: "bi-flag-fill",              color: "#64748b", label: "Error Reported" },
          "Product review":               { icon: "bi-star-fill",              color: "#f59e0b", label: "Product Review" },
          "Referral":                     { icon: "bi-people-fill",            color: "#8b5cf6", label: "Referral Bonus" },
          "Podcast guest":                { icon: "bi-mic-fill",               color: "#ee5e42", label: "Podcast Guest" },
        };

        const getMeta = (note = "") => {
          const key = Object.keys(ACTIVITY_META).find(k => note.toLowerCase().startsWith(k.toLowerCase()));
          return key ? ACTIVITY_META[key] : { icon: "bi-coin", color: "#f59e0b", label: note || "Bonus Credits" };
        };

        return (
          <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
            ) : bonusCredits.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🪙</div>
                <p style={{ color: "#64748b", marginBottom: 8 }}>No activity credits yet.</p>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Earn credits by completing your profile, sharing on LinkedIn, getting comments approved, and more.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Activity</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Description</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Credits Earned</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: 600 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {bonusCredits.map((t, i) => {
                    const meta = getMeta(t.note);
                    return (
                      <tr key={t.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                              background: meta.color + "18",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <i className={`bi ${meta.icon}`} style={{ color: meta.color, fontSize: 16 }}></i>
                            </div>
                            <span style={{ fontWeight: 600, color: "#334155" }}>{meta.label}</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", color: "#64748b", fontSize: "0.83rem" }}>
                          {t.note || "—"}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <span style={{
                            background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff",
                            padding: "3px 12px", borderRadius: 20, fontWeight: 700, fontSize: "0.85rem"
                          }}>+{t.credits_delta}</span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmt(t.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })()}

      {/* Unlocked Articles */}
      {activeTab === "unlocks" && (
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
          ) : unlocks.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔓</div>
              <p style={{ color: "#64748b" }}>You haven't unlocked any articles yet.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Article</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Category</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Credits Used</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: 600 }}>Unlocked On</th>
                </tr>
              </thead>
              <tbody>
                {unlocks.map((u, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <Link to={`/${u.category || "sap-security"}/${u.blog_slug}`} style={{ color: "#334155", fontWeight: 500, textDecoration: "none" }}>
                        {u.blog_title || u.blog_slug}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 10px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 500, textTransform: "capitalize" }}>
                        {(u.category || "—").replace(/-/g, " ")}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 10px", borderRadius: 20, fontWeight: 700, fontSize: "0.85rem" }}>
                        {u.credits_spent} credit{u.credits_spent !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", color: "#94a3b8" }}>{fmt(u.unlocked_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showBuyModal && (
        <BuyCreditsModal
          onClose={() => setShowBuyModal(false)}
          onSuccess={() => { setShowBuyModal(false); reload(); }}
        />
      )}
    </div>
  );
}
