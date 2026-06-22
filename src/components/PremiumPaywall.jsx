import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
import { getCreditBundles, createCreditOrder, verifyCreditPayment, unlockBlog, validateCoupon } from "../services/api";

/**
 * PremiumPaywall — credit-based article unlock.
 *
 * Logged-out  → Login / Sign Up buttons
 * Logged-in, enough credits → "Unlock for N credits" button
 * Logged-in, not enough credits → buy credits card with bundle options + coupon
 */
export default function PremiumPaywall({ creditsRequired = 1, blogSlug, onSuccess }) {
  const { isLoggedIn, member, creditBalance, onBlogUnlocked, onCreditsPurchased, refreshCredits } = useMemberAuth();
  const navigate = useNavigate();

  const [bundles, setBundles] = useState([]);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [paying, setPaying] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [tab, setTab] = useState("unlock"); // "unlock" | "buy"

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
    }
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-switch to buy tab if not enough credits
  useEffect(() => {
    if (isLoggedIn && !hasSufficientCredits) setTab("buy");
    else if (isLoggedIn && hasSufficientCredits) setTab("unlock");
  }, [isLoggedIn, hasSufficientCredits]);

  // ── Coupon validation ─────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError("");
    setCouponData(null);
    try {
      const res = await validateCoupon(couponCode.trim(), selectedBundle?.id);
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

  // ── Buy credits ───────────────────────────────────────────────────────────
  const handleBuyCredits = async () => {
    if (!selectedBundle) return;
    setErrorMsg("");
    setPaying(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        setErrorMsg("Payment gateway failed to load. Check your connection.");
        setPaying(false);
        return;
      }

      const orderRes = await createCreditOrder(selectedBundle.id, couponData ? couponCode : undefined);
      const { order_id, amount, currency, key_id } = orderRes.data;

      const options = {
        key: key_id,
        amount,
        currency,
        name: "SAP Security Expert",
        description: `${selectedBundle.credits} Credits — ${selectedBundle.name}`,
        order_id,
        prefill: { name: member?.name || "", email: member?.email || "" },
        theme: { color: "#1e293b" },
        handler: async (response) => {
          try {
            const verifyRes = await verifyCreditPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bundle_id: selectedBundle.id,
              coupon_id: couponData?.id,
              amount_paise: amount,
            });
            if (verifyRes.data.status === "success") {
              onCreditsPurchased(verifyRes.data.new_balance);
              setTab("unlock");
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
      setErrorMsg(err.response?.data?.message || "Could not initiate payment. Try again.");
      setPaying(false);
    }
  };

  // ── Unlock article ────────────────────────────────────────────────────────
  const handleUnlock = async () => {
    if (!blogSlug) return;
    setErrorMsg("");
    setUnlocking(true);
    try {
      const res = await unlockBlog(blogSlug);
      if (res.data.status === "success") {
        onBlogUnlocked(blogSlug, res.data.new_balance);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.data.message || "Failed to unlock article.");
      }
    } catch (err) {
      if (err.response?.status === 402) {
        setTab("buy");
        refreshCredits();
      } else {
        setErrorMsg(err.response?.data?.message || "Failed to unlock. Try again.");
      }
    } finally {
      setUnlocking(false);
    }
  };

  // ── Compute display prices ────────────────────────────────────────────────
  const displayPrice = (paise) => `₹${(paise / 100).toFixed(0)}`;
  const discountedPaise = selectedBundle && couponData
    ? Math.max(selectedBundle.price_paise - (couponData.discount_paise || 0), 100)
    : selectedBundle?.price_paise;

  // ── NOT logged in ─────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="members-paywall-overlay">
        <div className="members-paywall-gradient" />
        <div className="members-paywall-card">
          <div className="members-paywall-lock-icon" style={{ background: "#fffbeb" }}>
            <i className="bi bi-star-fill" style={{ color: "#d97706" }}></i>
          </div>
          <h2 className="members-paywall-heading">Premium Article</h2>
          <p className="members-paywall-subtext">
            This article costs <strong>{creditsRequired} credit{creditsRequired !== 1 ? "s" : ""}</strong> to unlock.
            Log in or create a free account to buy credits and get lifetime access.
          </p>
          <div className="members-paywall-actions">
            <button
              className="members-paywall-btn-login"
              onClick={() => navigate("/member/login", { state: { from: window.location.pathname } })}
            >
              Log In
            </button>
            <button className="members-paywall-btn-signup" onClick={() => navigate("/member/signup")}>
              Create Free Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Logged in — tab switcher ──────────────────────────────────────────────
  return (
    <div className="members-paywall-overlay">
      <div className="members-paywall-gradient" />
      <div className="members-paywall-card" style={{ maxWidth: 480 }}>

        {/* Credit balance indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: 13, color: "#475569" }}>
            <i className="bi bi-coin" style={{ color: "#d97706", marginRight: 6 }}></i>
            Your credits
          </span>
          <strong style={{ fontSize: 18, color: "#1e293b" }}>{creditBalance}</strong>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", marginBottom: 20 }}>
          <button
            onClick={() => setTab("unlock")}
            style={{
              flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: tab === "unlock" ? "#1e293b" : "#f8fafc",
              color: tab === "unlock" ? "#fff" : "#64748b",
            }}
          >
            <i className="bi bi-unlock-fill" style={{ marginRight: 6 }}></i>Unlock Article
          </button>
          <button
            onClick={() => setTab("buy")}
            style={{
              flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: tab === "buy" ? "#1e293b" : "#f8fafc",
              color: tab === "buy" ? "#fff" : "#64748b",
            }}
          >
            <i className="bi bi-cart-fill" style={{ marginRight: 6 }}></i>Buy Credits
          </button>
        </div>

        {/* ── UNLOCK TAB ─────────────────────────────────────────────────── */}
        {tab === "unlock" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div className="members-paywall-lock-icon" style={{ background: "#fffbeb" }}>
                <i className="bi bi-star-fill" style={{ color: "#d97706" }}></i>
              </div>
              <h2 className="members-paywall-heading">Unlock This Article</h2>
              <p className="members-paywall-subtext">
                Spend <strong>{creditsRequired} credit{creditsRequired !== 1 ? "s" : ""}</strong> for lifetime access to this article.
              </p>
            </div>

            {hasSufficientCredits ? (
              <button
                className="members-paywall-btn-login"
                style={{ width: "100%", opacity: unlocking ? 0.7 : 1 }}
                disabled={unlocking}
                onClick={handleUnlock}
              >
                {unlocking ? "Unlocking…" : `Unlock — ${creditsRequired} Credit${creditsRequired !== 1 ? "s" : ""}`}
              </button>
            ) : (
              <>
                <p style={{ textAlign: "center", fontSize: 13, color: "#dc2626", marginBottom: 16 }}>
                  You need <strong>{creditsRequired - creditBalance} more credit{creditsRequired - creditBalance !== 1 ? "s" : ""}</strong> to unlock this article.
                </p>
                <button
                  className="members-paywall-btn-signup"
                  style={{ width: "100%" }}
                  onClick={() => setTab("buy")}
                >
                  Buy Credits
                </button>
              </>
            )}
          </>
        )}

        {/* ── BUY CREDITS TAB ────────────────────────────────────────────── */}
        {tab === "buy" && (
          <>
            <h2 className="members-paywall-heading" style={{ marginBottom: 4 }}>Buy Credits</h2>
            <p className="members-paywall-subtext" style={{ marginBottom: 16 }}>
              Choose a bundle — credits never expire and unlock any premium article.
            </p>

            {/* Bundle cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {bundles.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBundle(b); setCouponData(null); setCouponCode(""); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", borderRadius: 8, cursor: "pointer",
                    border: selectedBundle?.id === b.id ? "2px solid #1e293b" : "1.5px solid #e2e8f0",
                    background: selectedBundle?.id === b.id ? "#f0f9ff" : "white",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{b.name}</span>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      <i className="bi bi-coin" style={{ color: "#d97706", marginRight: 4 }}></i>
                      {b.credits} credits
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 18, color: "#1e293b" }}>
                    {displayPrice(b.price_paise)}
                  </span>
                </button>
              ))}
              {bundles.length === 0 && (
                <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", padding: "20px 0" }}>
                  No bundles available. Contact the administrator.
                </p>
              )}
            </div>

            {/* Coupon input */}
            {selectedBundle && (
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
                    {couponData.discount_type === "percentage"
                      ? `${couponData.discount_value}% off applied`
                      : `₹${couponData.discount_value} off applied`}
                  </p>
                )}
              </div>
            )}

            {/* Price summary */}
            {selectedBundle && (
              <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 8, padding: "12px 16px", marginBottom: 16, textAlign: "center" }}>
                {couponData ? (
                  <>
                    <span style={{ fontSize: 13, textDecoration: "line-through", color: "#94a3b8" }}>
                      {displayPrice(selectedBundle.price_paise)}
                    </span>
                    <span style={{ fontSize: 26, fontWeight: 900, color: "#1e293b", marginLeft: 8 }}>
                      {displayPrice(discountedPaise)}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 26, fontWeight: 900, color: "#1e293b" }}>
                    {displayPrice(selectedBundle.price_paise)}
                  </span>
                )}
                <div style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>
                  for {selectedBundle.credits} credits
                </div>
              </div>
            )}

            {errorMsg && (
              <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px" }}>
                {errorMsg}
              </p>
            )}

            <button
              className="members-paywall-btn-login"
              style={{ width: "100%", opacity: paying || !selectedBundle ? 0.7 : 1 }}
              disabled={paying || !selectedBundle}
              onClick={handleBuyCredits}
            >
              {paying ? "Processing…" : selectedBundle ? `Pay ${displayPrice(discountedPaise || selectedBundle.price_paise)}` : "Select a bundle"}
            </button>

            <p className="members-paywall-note" style={{ marginTop: 12 }}>
              <i className="bi bi-shield-check"></i> Secured by Razorpay · Credits never expire
            </p>
          </>
        )}
      </div>
    </div>
  );
}
