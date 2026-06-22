import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
import { getCreditBundles, createCreditOrder, verifyCreditPayment, validateCoupon } from "../services/api";

export default function MembershipPage() {
  const { isLoggedIn, member, creditBalance, onCreditsPurchased, refreshCredits } = useMemberAuth();
  const navigate = useNavigate();
  const [bundles, setBundles] = useState([]);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [paying, setPaying] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isLoggedIn) refreshCredits();
    getCreditBundles()
      .then((res) => {
        const b = res.data?.bundles || [];
        setBundles(b);
        if (b.length) setSelectedBundle(b[0]);
      })
      .catch(() => {});
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleBuy = async (bundle) => {
    if (!isLoggedIn) {
      navigate("/member/login", { state: { from: "/membership" } });
      return;
    }
    setErrorMsg("");
    setPaying(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        setErrorMsg("Payment gateway failed to load. Check your connection.");
        setPaying(false);
        return;
      }

      const orderRes = await createCreditOrder(bundle.id, couponData ? couponCode : undefined);
      const { order_id, amount, currency, key_id } = orderRes.data;

      const options = {
        key: key_id,
        amount,
        currency,
        name: "SAP Security Expert",
        description: `${bundle.credits} Credits — ${bundle.name}`,
        order_id,
        prefill: { name: member?.name || "", email: member?.email || "" },
        theme: { color: "#1e293b" },
        handler: async (response) => {
          try {
            const verifyRes = await verifyCreditPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bundle_id: bundle.id,
              coupon_id: couponData?.id,
              amount_paise: amount,
            });
            if (verifyRes.data.status === "success") {
              onCreditsPurchased(verifyRes.data.new_balance);
              setSuccessMsg(`${verifyRes.data.credits_added} credits added! Your balance is now ${verifyRes.data.new_balance} credits.`);
              setCouponCode("");
              setCouponData(null);
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

  const fmt = (paise) => `₹${(paise / 100).toFixed(0)}`;
  const discountedPaise = (bundle) => {
    if (!couponData || selectedBundle?.id !== bundle.id) return bundle.price_paise;
    return Math.max(bundle.price_paise - (couponData.discount_paise || 0), 100);
  };

  return (
    <div style={s.page}>
      <div style={s.hero}>
        <span style={s.badge}>Credit-Based Access</span>
        <h1 style={s.heroTitle}>Unlock Premium SAP Security Insights</h1>
        <p style={s.heroSub}>
          Buy credits once, spend them to unlock any premium article — lifetime access, no subscriptions.
        </p>
        {isLoggedIn && (
          <div style={s.balancePill}>
            <i className="bi bi-coin" style={{ color: "#fcd34d", marginRight: 6 }}></i>
            Your balance: <strong style={{ color: "#fcd34d" }}>{creditBalance} credits</strong>
          </div>
        )}
      </div>

      <div style={s.container}>
        {/* How it works */}
        <div style={s.perksGrid}>
          {PERKS.map((p) => (
            <div key={p.title} style={s.perkCard}>
              <i className={`bi ${p.icon}`} style={{ fontSize: 22, color: "#1e293b", marginBottom: 10 }} />
              <h3 style={s.perkTitle}>{p.title}</h3>
              <p style={s.perkDesc}>{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Success / error banners */}
        {successMsg && (
          <div style={s.successBanner}>
            <i className="bi bi-check-circle-fill" style={{ fontSize: 20, color: "#16a34a" }} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && <div style={s.errorBox}>{errorMsg}</div>}

        {/* Bundle cards */}
        <h2 style={s.plansHeading}>Choose a Credit Bundle</h2>

        <div style={s.planRow}>
          {bundles.length === 0 && (
            <p style={{ color: "#94a3b8", textAlign: "center", width: "100%" }}>
              Loading bundles…
            </p>
          )}
          {bundles.map((bundle) => {
            const isSelected = selectedBundle?.id === bundle.id;
            const finalPaise = discountedPaise(bundle);
            return (
              <div
                key={bundle.id}
                style={{ ...s.planCard, border: isSelected ? "2px solid #1e293b" : "1.5px solid #e2e8f0" }}
                onClick={() => { setSelectedBundle(bundle); setCouponData(null); setCouponCode(""); }}
              >
                <div style={s.planHeader}>
                  <i className="bi bi-coin" style={{ color: "#d97706", marginRight: 6 }} />
                  {bundle.name}
                </div>
                <div style={s.planPriceRow}>
                  <span style={s.creditsNum}>{bundle.credits}</span>
                  <span style={s.creditsLabel}> Credits</span>
                </div>
                <div style={s.planPriceRow}>
                  {couponData && isSelected ? (
                    <>
                      <span style={{ fontSize: 22, textDecoration: "line-through", color: "#94a3b8" }}>{fmt(bundle.price_paise)}</span>
                      <span style={{ ...s.planPrice, marginLeft: 8 }}>{fmt(finalPaise)}</span>
                    </>
                  ) : (
                    <span style={s.planPrice}>{fmt(bundle.price_paise)}</span>
                  )}
                </div>
                <ul style={s.featureList}>
                  <li><i className="bi bi-check2" style={{ color: "#16a34a", marginRight: 6 }} />Unlock any {bundle.credits} premium articles</li>
                  <li><i className="bi bi-check2" style={{ color: "#16a34a", marginRight: 6 }} />Lifetime access — never expires</li>
                  <li><i className="bi bi-check2" style={{ color: "#16a34a", marginRight: 6 }} />No subscription required</li>
                </ul>
                <button
                  style={{ ...s.planBtn, opacity: paying ? 0.7 : 1 }}
                  disabled={paying}
                  onClick={(e) => { e.stopPropagation(); handleBuy(bundle); }}
                >
                  {paying && isSelected ? "Processing…" : `Buy — ${fmt(finalPaise)}`}
                </button>
                <p style={s.secureNote}>
                  <i className="bi bi-shield-check" /> Secured by Razorpay
                </p>
              </div>
            );
          })}
        </div>

        {/* Coupon input */}
        {bundles.length > 0 && (
          <div style={s.couponRow}>
            <p style={{ fontSize: 14, color: "#475569", marginBottom: 10, fontWeight: 600 }}>
              <i className="bi bi-ticket-perforated-fill" style={{ marginRight: 6, color: "#d97706" }}></i>
              Have a coupon code?
            </p>
            <div style={{ display: "flex", gap: 8, maxWidth: 380 }}>
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponData(null); setCouponError(""); }}
                style={s.couponInput}
              />
              <button
                onClick={handleApplyCoupon}
                disabled={validatingCoupon || !couponCode.trim()}
                style={{ ...s.couponBtn, opacity: validatingCoupon || !couponCode.trim() ? 0.5 : 1 }}
              >
                {validatingCoupon ? "…" : "Apply"}
              </button>
            </div>
            {couponError && <p style={{ fontSize: 13, color: "#dc2626", marginTop: 6 }}>{couponError}</p>}
            {couponData && (
              <p style={{ fontSize: 13, color: "#16a34a", marginTop: 6 }}>
                <i className="bi bi-check-circle-fill" style={{ marginRight: 4 }}></i>
                Coupon applied: {couponData.discount_type === "percentage" ? `${couponData.discount_value}% off` : `₹${couponData.discount_value} off`}
              </p>
            )}
          </div>
        )}

        {!isLoggedIn && (
          <p style={s.loginNote}>
            Already a member?{" "}
            <button style={s.loginLink} onClick={() => navigate("/member/login", { state: { from: "/membership" } })}>
              Log in
            </button>{" "}
            to purchase credits.
          </p>
        )}
      </div>
    </div>
  );
}

const PERKS = [
  { icon: "bi-coin", title: "Buy Credits Once", desc: "Purchase a credit bundle — no recurring charges or subscriptions." },
  { icon: "bi-unlock-fill", title: "Unlock Any Article", desc: "Spend credits on any premium article for permanent, lifetime access." },
  { icon: "bi-infinity", title: "Never Expires", desc: "Credits and unlocked articles stay with your account forever." },
  { icon: "bi-bell", title: "New Content", desc: "Use credits to access fresh premium articles as they are published." },
];

const s = {
  page: { minHeight: "100vh", background: "#f8fafc" },
  hero: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
    padding: "72px 24px 56px",
    textAlign: "center",
    color: "#fff",
  },
  badge: {
    display: "inline-block",
    background: "rgba(217,119,6,0.2)",
    color: "#fcd34d",
    border: "1px solid rgba(217,119,6,0.4)",
    borderRadius: 20,
    padding: "4px 14px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 16,
  },
  heroTitle: { fontSize: "clamp(26px, 5vw, 42px)", fontWeight: 800, margin: "0 0 16px", lineHeight: 1.2 },
  heroSub: { fontSize: 17, color: "#94a3b8", maxWidth: 580, margin: "0 auto 24px", lineHeight: 1.7 },
  balancePill: {
    display: "inline-block",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: "8px 20px",
    fontSize: 15,
    color: "#e2e8f0",
    marginTop: 8,
  },
  container: { maxWidth: 960, margin: "0 auto", padding: "48px 24px" },
  successBanner: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10,
    padding: "14px 20px", marginBottom: 28, fontSize: 15, color: "#15803d",
  },
  errorBox: {
    background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
    padding: "12px 16px", color: "#dc2626", fontSize: 14, marginBottom: 20,
  },
  perksGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 16, marginBottom: 48,
  },
  perkCard: {
    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
    padding: "22px 20px", textAlign: "center",
  },
  perkTitle: { fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" },
  perkDesc: { fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.6 },
  plansHeading: { fontSize: 22, fontWeight: 700, color: "#0f172a", textAlign: "center", marginBottom: 24 },
  planRow: { display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", marginBottom: 32 },
  planCard: {
    background: "#fff", borderRadius: 14,
    padding: "28px 28px 22px", width: "100%", maxWidth: 300,
    boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
    cursor: "pointer", transition: "box-shadow 0.2s",
  },
  planHeader: { fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 },
  planPriceRow: { marginBottom: 6 },
  creditsNum: { fontSize: 44, fontWeight: 900, color: "#d97706" },
  creditsLabel: { fontSize: 18, color: "#64748b" },
  planPrice: { fontSize: 28, fontWeight: 800, color: "#0f172a" },
  featureList: {
    listStyle: "none", padding: 0, margin: "12px 0 20px",
    display: "flex", flexDirection: "column", gap: 8,
    fontSize: 13, color: "#374151",
  },
  planBtn: {
    width: "100%", padding: "12px", background: "#1e293b", color: "#fff",
    border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
  },
  secureNote: { textAlign: "center", fontSize: 12, color: "#94a3b8", margin: "10px 0 0" },
  couponRow: { textAlign: "left", maxWidth: 500, margin: "0 auto 24px" },
  couponInput: {
    flex: 1, padding: "10px 12px", border: "1.5px solid #e2e8f0",
    borderRadius: 6, fontSize: 14, outline: "none",
  },
  couponBtn: {
    padding: "10px 18px", background: "#1e293b", color: "#fff",
    border: "none", borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: "pointer",
  },
  loginNote: { textAlign: "center", fontSize: 14, color: "#64748b", marginTop: 32 },
  loginLink: { background: "none", border: "none", color: "#1e293b", fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: 0 },
};
