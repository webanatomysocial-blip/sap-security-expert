import { useState, useEffect } from "react";
import { formatPrice } from "../utils/fxPrice";
import CurrencySelect from "./CurrencySelect";
import { useNavigate } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
import { getCreditBundles, createCreditOrder, verifyCreditPayment, unlockBlog, validateCoupon, detectPaymentCurrency, getMembershipPlans, createMembershipOrder } from "../services/api";

/**
 * PremiumPaywall — article unlock via credits (permanent) or membership (while active).
 *
 * Logged-out  → Login / Sign Up buttons
 * Logged-in, active membership → choose "Read with membership" or "Unlock forever with credits"
 * Logged-in otherwise → unlock with credits, buy credits, or buy a membership
 */
export default function PremiumPaywall({ creditsRequired = 1, blogSlug, onSuccess, inline = false }) {
  const { isLoggedIn, member, creditBalance, onBlogUnlocked, onCreditsPurchased, refreshCredits, membership, setMembership } = useMemberAuth();
  const navigate = useNavigate();

  const [bundles, setBundles] = useState([]);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [paying, setPaying] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [tab, setTab] = useState("unlock"); // "unlock" | "buy" | "membership"
  const [fxCurrency, setFxCurrency] = useState("INR");
  const [fxRate, setFxRate] = useState(1);
  const [fxDecimals, setFxDecimals] = useState(2);
  const [fxLoading, setFxLoading] = useState(false);


  const handleCurrencyChange = async (cur) => {
    setFxCurrency(cur);
    if (cur === "INR") { setFxRate(1); setFxDecimals(2); return; }
    setFxLoading(true);
    try {
      const r = await detectPaymentCurrency(cur);
      if (r.data?.rate) { setFxRate(r.data.rate); setFxDecimals(r.data.decimals ?? 2); }
    } catch { setFxRate(1); setFxDecimals(2); setFxCurrency("INR"); }
    finally { setFxLoading(false); }
  };

  const hasSufficientCredits = creditBalance >= creditsRequired;

  useEffect(() => {
    if (isLoggedIn) {
      refreshCredits();
      getCreditBundles()
        .then((res) => {
          const b = res.data?.bundles || [];
          setBundles(b);
          if (b.length) setSelectedBundle(b[0]);
        })
        .catch(() => {});
      getMembershipPlans()
        .then((res) => {
          const p = res.data?.plans || [];
          setPlans(p);
          if (p.length) setSelectedPlan(p[p.length - 1]);
        })
        .catch(() => {});
    }
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-switch to buy tab if the member can't unlock right now
  useEffect(() => {
    if (!isLoggedIn) return;
    setTab(hasSufficientCredits || membership ? "unlock" : "buy");
  }, [isLoggedIn, hasSufficientCredits, membership]);

  // Buy panel is shared by the credits and membership tabs
  const isPlanTab = tab === "membership";
  const items = isPlanTab ? plans : bundles;
  const selected = isPlanTab ? selectedPlan : selectedBundle;
  const selectItem = (item) => {
    (isPlanTab ? setSelectedPlan : setSelectedBundle)(item);
    setCouponData(null); setCouponCode(""); setCouponError("");
  };
  const switchTab = (t) => {
    setTab(t); setErrorMsg("");
    setCouponData(null); setCouponCode(""); setCouponError("");
  };
  const fmtExpiry = (iso) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  // ── Coupon validation ─────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError("");
    setCouponData(null);
    try {
      const res = await validateCoupon(couponCode.trim(), isPlanTab ? undefined : selected?.id, isPlanTab ? selected?.id : undefined);
      setCouponData(res.data.coupon);
    } catch (err) {
      setCouponError(err.response?.data?.message || "Invalid coupon code.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  // ── Razorpay loader ───────────────────────────────────────────────────────
  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (document.getElementById("razorpay-sdk")) return resolve(true);
      const s = document.createElement("script");
      s.id = "razorpay-sdk";
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  // ── Buy credits or membership ─────────────────────────────────────────────
  const handlePurchase = async () => {
    if (!selected) return;
    const item = selected;
    const buyingPlan = isPlanTab;
    setErrorMsg("");
    setPaying(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        setErrorMsg("Payment gateway failed to load. Check your connection.");
        setPaying(false);
        return;
      }

      const coupon = couponData ? couponCode : undefined;
      const cur = fxCurrency !== "INR" ? fxCurrency : undefined;
      const orderRes = buyingPlan
        ? await createMembershipOrder(item.id, coupon, cur)
        : await createCreditOrder(item.id, coupon, cur);
      const { order_id, amount, currency, key_id } = orderRes.data;

      const options = {
        key: key_id,
        amount,
        currency,
        name: "SAP Security Expert",
        description: buyingPlan ? `${item.name} Membership` : `${item.credits} Credits: ${item.name}`,
        order_id,
        prefill: { name: member?.name || "", email: member?.email || "" },
        theme: { color: "#1e293b" },
        handler: async (response) => {
          try {
            const verifyRes = await verifyCreditPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.status === "success") {
              onCreditsPurchased(verifyRes.data.new_balance);
              switchTab("unlock");
              if (verifyRes.data.type === "membership") {
                setMembership(verifyRes.data.membership);
                // They bought it to read this article — open it right away.
                await handleUnlock("membership");
              }
            } else {
              setErrorMsg("Payment verification failed. Contact support.");
            }
          } catch {
            setErrorMsg("Payment verification failed. Contact support.");
          }
          setPaying(false);
        },
        modal: { ondismiss: () => setPaying(false) },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      if (err.response?.data?.reason === "below_minimum") handleCurrencyChange("INR");
      setErrorMsg(err.response?.data?.message || "Could not initiate payment. Try again.");
      setPaying(false);
    }
  };

  // ── Unlock article ────────────────────────────────────────────────────────
  const handleUnlock = async (method = "credits") => {
    if (!blogSlug) return;
    setErrorMsg("");
    setUnlocking(method);
    try {
      const res = await unlockBlog(blogSlug, method);
      if (res.data.status === "success") {
        onBlogUnlocked(blogSlug, res.data.new_balance);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.data.message || "Failed to unlock article.");
      }
    } catch (err) {
      if (err.response?.status === 402) {
        refreshCredits();
        switchTab(err.response?.data?.reason === "no_membership" ? "membership" : "buy");
      } else {
        setErrorMsg(err.response?.data?.message || "Failed to unlock. Try again.");
      }
    } finally {
      setUnlocking(false);
    }
  };

  // ── Compute display prices ────────────────────────────────────────────────
  const displayPrice = (paise) => formatPrice(paise, fxCurrency, fxRate, fxDecimals);
  const discountedPaise = selected && couponData
    ? Math.max(selected.price_paise - (couponData.discount_paise || 0), 100)
    : selected?.price_paise;

  // ── NOT logged in ─────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    const card = (
      <div className="members-paywall-card paywall-card-redesigned">
        <div className="paywall-icon-container">
          <div className="paywall-ring paywall-ring-1" />
          <div className="paywall-ring paywall-ring-2" />
          <div className="paywall-ring paywall-ring-3">
            <i className="bi bi-lock-fill"></i>
          </div>
        </div>
        <div className="paywall-badge">Premium Article</div>
        <h2 className="paywall-heading-redesigned">Unlock the full article</h2>
        <p className="paywall-subtext-redesigned">
          This piece costs <strong>{creditsRequired} credit{creditsRequired !== 1 ? "s" : ""}</strong>. New accounts start with free credits · enough to open it right away, and it stays yours for life.
        </p>
        
        <button
          className="paywall-primary-btn"
          onClick={() => navigate("/member/signup")}
        >
          Create free account <span>→</span>
        </button>

        <p className="paywall-login-text">
          Already a member?
          <button
            className="paywall-login-btn-pill"
            onClick={() => navigate("/member/login", { state: { from: window.location.pathname } })}
          >
            Log in
          </button>
        </p>

        <hr className="paywall-divider-redesigned" />

        <div className="paywall-features-container">
          <div className="paywall-features-row">
            <div className="paywall-feature-item">
              <span className="paywall-feature-tick">✓</span> Lifetime access
            </div>
            <div className="paywall-feature-item">
              <span className="paywall-feature-tick">✓</span> No recurring charge
            </div>
            <div className="paywall-feature-item">
              <span className="paywall-feature-tick">✓</span> Free starter credits
            </div>
          </div>
        </div>
      </div>
    );
    if (inline) return <div className="members-paywall-overlay members-paywall-inline">{card}</div>;
    return <div className="members-paywall-overlay"><div className="members-paywall-gradient" />{card}</div>;
  }

  // ── Logged in — tab switcher ──────────────────────────────────────────────
  const outerClass = inline ? "members-paywall-overlay members-paywall-inline" : "members-paywall-overlay";
  return (
    <div className={outerClass}>
      {!inline && <div className="members-paywall-gradient" />}
      <div className="members-paywall-card" style={{ maxWidth: 480 }}>
        <style>{PW_CSS}</style>

        {/* Balance + membership indicator */}
        <div className="pw-status">
          <span className="pw-status-credits">
            <i className="bi bi-coin"></i> <strong>{creditBalance}</strong> credits
          </span>
          {membership ? (
            <span className="pw-chip pw-chip-green"><i className="bi bi-patch-check-fill"></i> Member until {fmtExpiry(membership.expires_at)}</span>
          ) : (
            <span className="pw-chip pw-chip-muted">No membership</span>
          )}
        </div>

        {/* Tab switcher */}
        <div className="pw-tabs" role="tablist">
          {[
            { key: "unlock", label: "Unlock", icon: "bi-unlock-fill" },
            { key: "buy", label: "Credits", icon: "bi-coin" },
            { key: "membership", label: "Membership", icon: "bi-patch-check-fill" },
          ].map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => switchTab(t.key)}>
              <i className={`bi ${t.icon}`}></i>{t.label}
            </button>
          ))}
        </div>

        {/* ── UNLOCK TAB: two clear options ─────────────────────────────── */}
        {tab === "unlock" && (
          <>
            <div className="pw-head">
              <div className="pw-head-icon"><i className="bi bi-lock-fill"></i></div>
              <h2>Unlock this article</h2>
              <p>Choose how you'd like to read it.</p>
            </div>

            {/* Option 1 — Membership */}
            <div className={`pw-option pw-option-green${membership ? " is-ready" : ""}`}>
              <div className="pw-option-top">
                <div className="pw-option-icon"><i className="bi bi-patch-check-fill"></i></div>
                <div className="pw-option-text">
                  <div className="pw-option-title">
                    With membership
                    {membership && <span className="pw-tag pw-tag-green">Included</span>}
                  </div>
                  <div className="pw-option-desc">
                    {membership
                      ? <>Free · readable until {fmtExpiry(membership.expires_at)}</>
                      : <>Every premium article and download for 1, 3, 6 or 12 months</>}
                  </div>
                </div>
              </div>
              {membership ? (
                <button className="pw-btn pw-btn-green" disabled={!!unlocking} onClick={() => handleUnlock("membership")}>
                  {unlocking === "membership" ? "Opening…" : <>Read with membership <i className="bi bi-arrow-right"></i></>}
                </button>
              ) : (
                <button className="pw-btn pw-btn-green" onClick={() => switchTab("membership")}>
                  <i className="bi bi-patch-check-fill"></i> Get membership <i className="bi bi-arrow-right"></i>
                </button>
              )}
            </div>

            <div className="pw-or"><span>or</span></div>

            {/* Option 2 — Credits (permanent) */}
            <div className={`pw-option pw-option-amber${hasSufficientCredits ? " is-ready" : ""}`}>
              <div className="pw-option-top">
                <div className="pw-option-icon"><i className="bi bi-infinity"></i></div>
                <div className="pw-option-text">
                  <div className="pw-option-title">
                    With credits
                    <span className="pw-tag pw-tag-amber">Forever</span>
                  </div>
                  <div className="pw-option-desc">
                    {hasSufficientCredits
                      ? <>{creditsRequired} credit{creditsRequired !== 1 ? "s" : ""} deducted · yours permanently, even without a membership</>
                      : <>You have {creditBalance}, need {creditsRequired - creditBalance} more</>}
                  </div>
                </div>
              </div>
              {hasSufficientCredits ? (
                <button className="pw-btn pw-btn-amber" disabled={!!unlocking} onClick={() => handleUnlock("credits")}>
                  {unlocking === "credits" ? "Unlocking…" : <><i className="bi bi-coin"></i> Unlock forever · {creditsRequired} credit{creditsRequired !== 1 ? "s" : ""}</>}
                </button>
              ) : (
                <button className="pw-btn pw-btn-amber-outline" onClick={() => switchTab("buy")}>
                  Buy credits <i className="bi bi-arrow-right"></i>
                </button>
              )}
            </div>
          </>
        )}

        {/* ── BUY TAB (credits or membership) ────────────────────────────── */}
        {(tab === "buy" || tab === "membership") && (
          <>
            <h2 className="members-paywall-heading" style={{ marginBottom: 4 }}>{isPlanTab ? "Get Membership" : "Buy Credits"}</h2>
            <p className="members-paywall-subtext" style={{ marginBottom: 16 }}>
              {isPlanTab
                ? "Read every premium article and download every file for the length of your plan."
                : "Choose a bundle, credits never expire and unlock any premium article."}
            </p>
            {isPlanTab && membership && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px", marginBottom: 18, textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#166534", margin: "0 0 10px", fontWeight: 600 }}>
                  <i className="bi bi-patch-check-fill" style={{ marginRight: 6 }}></i>
                  You're already a member until {fmtExpiry(membership.expires_at)}
                </p>
                <button className="pw-btn pw-btn-green" disabled={!!unlocking} onClick={() => handleUnlock("membership")}>
                  {unlocking === "membership" ? "Opening…" : "Read this article now"}
                </button>
                <p style={{ fontSize: 12, color: "#64748b", margin: "10px 0 0" }}>
                  Want more time? Pick a plan below — it starts when your current one ends.
                </p>
              </div>
            )}

            <CurrencySelect value={fxCurrency} onChange={handleCurrencyChange} loading={fxLoading} compact />

            {/* Bundle / plan cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {items.map((b) => (
                <button
                  key={b.id}
                  onClick={() => selectItem(b)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", borderRadius: 8, cursor: "pointer",
                    border: selected?.id === b.id ? "2px solid #1e293b" : "1.5px solid #e2e8f0",
                    background: selected?.id === b.id ? "#f0f9ff" : "white",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{b.name}</span>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {isPlanTab ? (
                        <><i className="bi bi-calendar-check" style={{ color: "#15803d", marginRight: 4 }}></i>{b.duration_days} days full access</>
                      ) : (
                        <><i className="bi bi-coin" style={{ color: "#d97706", marginRight: 4 }}></i>{b.credits} credits</>
                      )}
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 18, color: "#1e293b" }}>
                    {displayPrice(b.price_paise)}
                  </span>
                </button>
              ))}
              {items.length === 0 && (
                <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", padding: "20px 0" }}>
                  {isPlanTab
                    ? <>Membership plans aren't available right now. <a href="/membership" style={{ color: "#15803d", fontWeight: 700 }}>See all options →</a></>
                    : "No bundles available. Contact the administrator."}
                </p>
              )}
            </div>

            {/* Coupon input */}
            {selected && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Coupon code (optional)"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponData(null); setCouponError(""); }}
                    style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13 }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                    style={{
                      padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                      background: "#1e293b", color: "#fff", fontSize: 13, fontWeight: 600,
                      opacity: validatingCoupon || !couponCode.trim() ? 0.5 : 1,
                    }}
                  >
                    {validatingCoupon ? "…" : "Apply"}
                  </button>
                </div>
                {couponError && <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{couponError}</p>}
                {couponData && (
                  <p style={{ fontSize: 12, color: "#16a34a", marginTop: 4 }}>
                    <i className="bi bi-check-circle-fill" style={{ marginRight: 4 }}></i>
                    {displayPrice(couponData.discount_paise)} off applied
                  </p>
                )}
              </div>
            )}

            {/* Price summary */}
            {selected && (
              <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 8, padding: "12px 16px", marginBottom: 16, textAlign: "center" }}>
                {couponData ? (
                  <>
                    <span style={{ fontSize: 13, textDecoration: "line-through", color: "#94a3b8" }}>
                      {displayPrice(selected.price_paise)}
                    </span>
                    <span style={{ fontSize: 26, fontWeight: 900, color: "#1e293b", marginLeft: 8 }}>
                      {displayPrice(discountedPaise)}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 26, fontWeight: 900, color: "#1e293b" }}>
                    {displayPrice(selected.price_paise)}
                  </span>
                )}
                <div style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>
                  {isPlanTab ? `for ${selected.duration_days} days of membership` : `for ${selected.credits} credits`}
                </div>
              </div>
            )}

            {errorMsg && (
              <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px" }}>
                {errorMsg}
              </p>
            )}

            <button
              className={`pw-btn ${isPlanTab ? "pw-btn-green" : "pw-btn-amber"}`}
              disabled={paying || !selected}
              onClick={handlePurchase}
            >
              {paying ? "Processing…" : selected ? `Pay ${displayPrice(discountedPaise || selected.price_paise)}` : isPlanTab ? "Select a plan" : "Select a bundle"}
            </button>

            <p className="members-paywall-note" style={{ marginTop: 12 }}>
              <i className="bi bi-shield-check"></i> Secured by Razorpay · {isPlanTab ? "One-time payment, no auto-renew" : "Credits never expire"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const PW_CSS = `
.pw-status { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; padding: 10px 14px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border: 1px solid #e2e8f0; border-radius: 12px; }
.pw-status-credits { font-size: 13px; color: #475569; }
.pw-status-credits i { color: #d97706; margin-right: 2px; }
.pw-status-credits strong { font-size: 17px; color: #0f172a; margin: 0 2px; }
.pw-chip { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; display: inline-flex; gap: 5px; align-items: center; }
.pw-chip-green { background: #dcfce7; color: #15803d; }
.pw-chip-muted { background: #f1f5f9; color: #94a3b8; font-weight: 600; }

.pw-tabs { display: flex; gap: 4px; padding: 4px; background: #f1f5f9; border-radius: 12px; margin-bottom: 22px; }
.pw-tabs button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 4px; border: none; border-radius: 9px; background: transparent; color: #64748b; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .15s, color .15s; }
.pw-tabs button:hover { color: #0f172a; }
.pw-tabs button.on { background: #fff; color: #0f172a; box-shadow: 0 1px 4px rgba(15,23,42,.12); }

.pw-head { text-align: center; margin-bottom: 18px; }
.pw-head-icon { width: 52px; height: 52px; margin: 0 auto 10px; border-radius: 16px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #fef3c7, #dcfce7); color: #0f172a; font-size: 22px; }
.pw-head h2 { margin: 0 0 4px; font-size: 21px; font-weight: 800; color: #0f172a; }
.pw-head p { margin: 0; font-size: 14px; color: #64748b; }

.pw-option { border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px; background: #fff; transition: border-color .15s, box-shadow .15s; }
.pw-option-top { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
.pw-option-icon { flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 19px; }
.pw-option-text { min-width: 0; text-align: left; }
.pw-option-title { font-size: 15px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pw-option-desc { font-size: 13px; color: #64748b; margin-top: 3px; line-height: 1.5; }
.pw-tag { font-size: 10.5px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; }
.pw-tag-green { background: #dcfce7; color: #15803d; }
.pw-tag-amber { background: #fef3c7; color: #b45309; }
.pw-option-green .pw-option-icon { background: #dcfce7; color: #15803d; }
.pw-option-amber .pw-option-icon { background: #fef3c7; color: #d97706; }
.pw-option-green.is-ready { border-color: #86efac; background: linear-gradient(180deg, #f0fdf4, #fff 70%); box-shadow: 0 6px 18px rgba(21,128,61,.08); }
.pw-option-amber.is-ready { border-color: #fcd34d; background: linear-gradient(180deg, #fffbeb, #fff 70%); box-shadow: 0 6px 18px rgba(217,119,6,.08); }

.pw-or { display: flex; align-items: center; gap: 10px; margin: 12px 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
.pw-or::before, .pw-or::after { content: ""; flex: 1; height: 1px; background: #e2e8f0; }

.pw-btn { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; border-radius: 11px; font-size: 14.5px; font-weight: 800; cursor: pointer; border: 1.5px solid transparent; transition: background .15s, transform .1s, box-shadow .15s; line-height: 1.2; }
.pw-btn:active:not(:disabled) { transform: translateY(1px); }
.pw-btn:disabled { opacity: .6; cursor: not-allowed; }
.pw-btn-green { background: #15803d; color: #fff; box-shadow: 0 4px 12px rgba(21,128,61,.25); }
.pw-btn-green:hover:not(:disabled) { background: #166534; }
.pw-btn-green-outline { background: #fff; color: #15803d; border-color: #86efac; }
.pw-btn-green-outline:hover { background: #f0fdf4; }
.pw-btn-amber { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; box-shadow: 0 4px 12px rgba(217,119,6,.28); }
.pw-btn-amber:hover:not(:disabled) { background: linear-gradient(135deg, #d97706, #b45309); }
.pw-btn-amber-outline { background: #fff; color: #b45309; border-color: #fcd34d; }
.pw-btn-amber-outline:hover { background: #fffbeb; }
`;
