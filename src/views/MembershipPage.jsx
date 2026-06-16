import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
import { getMembershipPlans, createPaymentOrder, verifyPayment } from "../services/api";

export default function MembershipPage() {
  const { isLoggedIn, member, isPremiumMember, subscription, activatePremium } = useMemberAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    getMembershipPlans()
      .then((res) => { if (res.data?.plans) setPlans(res.data.plans); })
      .catch(() => {});
  }, []);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (document.getElementById("razorpay-sdk")) return resolve(true);
      const s = document.createElement("script");
      s.id = "razorpay-sdk";
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleSubscribe = async (plan) => {
    if (!isLoggedIn) {
      navigate("/member/login", { state: { from: "/membership" } });
      return;
    }
    setErrorMsg("");
    setPaying(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setErrorMsg("Payment gateway failed to load. Check your internet connection.");
        setPaying(false);
        return;
      }

      const orderRes = await createPaymentOrder(plan.id);
      const { order_id, amount, currency, key_id } = orderRes.data;

      const options = {
        key: key_id,
        amount,
        currency,
        name: "SAP Security Expert",
        description: plan.name,
        order_id,
        prefill: { name: member?.name || "", email: member?.email || "" },
        theme: { color: "#1e293b" },
        handler: async (response) => {
          try {
            const verifyRes = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: plan.id,
            });
            if (verifyRes.data.status === "success") {
              activatePremium(verifyRes.data.subscription);
              setSuccess(true);
            } else {
              setErrorMsg("Payment verification failed. Please contact support.");
            }
          } catch {
            setErrorMsg("Payment verification failed. Please contact support.");
          }
          setPaying(false);
        },
        modal: { ondismiss: () => setPaying(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not initiate payment. Please try again.");
      setPaying(false);
    }
  };

  const expiryDate = subscription?.expires_at
    ? new Date(subscription.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div style={s.page}>
      <div style={s.hero}>
        <span style={s.badge}>Premium Membership</span>
        <h1 style={s.heroTitle}>Unlock Expert-Level SAP Security Insights</h1>
        <p style={s.heroSub}>
          Deep-dive technical guides, real-world GRC & BTP security patterns, and exclusive
          articles — written by certified SAP security professionals.
        </p>
      </div>

      <div style={s.container}>
        {/* Active subscription banner */}
        {isPremiumMember && (
          <div style={s.activeBanner}>
            <i className="bi bi-patch-check-fill" style={{ fontSize: 22, color: "#16a34a" }} />
            <div>
              <strong>You have an active Premium subscription</strong>
              {expiryDate && <p style={{ margin: "2px 0 0", fontSize: 13, color: "#374151" }}>Valid until {expiryDate}</p>}
            </div>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div style={s.successBanner}>
            <i className="bi bi-check-circle-fill" style={{ fontSize: 20, color: "#16a34a" }} />
            <span>Payment successful! Your Premium access is now active. Enjoy all premium articles.</span>
          </div>
        )}

        {/* What you get */}
        <div style={s.perksGrid}>
          {PERKS.map((p) => (
            <div key={p.title} style={s.perkCard}>
              <i className={`bi ${p.icon}`} style={{ fontSize: 22, color: "#1e293b", marginBottom: 10 }} />
              <h3 style={s.perkTitle}>{p.title}</h3>
              <p style={s.perkDesc}>{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Plan cards */}
        <h2 style={s.plansHeading}>Choose Your Plan</h2>

        {errorMsg && (
          <div style={s.errorBox}>{errorMsg}</div>
        )}

        <div style={s.planRow}>
          {plans.length === 0 && (
            <p style={{ color: "#94a3b8", textAlign: "center", width: "100%" }}>Loading plans…</p>
          )}
          {plans.map((plan) => {
            const price = (plan.price_paise / 100).toFixed(0);
            return (
              <div key={plan.id} style={s.planCard}>
                <div style={s.planHeader}>
                  <i className="bi bi-star-fill" style={{ color: "#d97706", marginRight: 6 }} />
                  {plan.name}
                </div>
                <div style={s.planPriceRow}>
                  <span style={s.planPrice}>₹{price}</span>
                  <span style={s.planPer}> / {plan.duration_days} days</span>
                </div>
                <p style={s.planDesc}>{plan.description}</p>
                <ul style={s.featureList}>
                  <li><i className="bi bi-check2" /> Full access to all premium articles</li>
                  <li><i className="bi bi-check2" /> New premium content as it's published</li>
                  <li><i className="bi bi-check2" /> Cancel anytime</li>
                </ul>
                {isPremiumMember ? (
                  <button style={{ ...s.planBtn, background: "#dcfce7", color: "#15803d", cursor: "default" }} disabled>
                    <i className="bi bi-check-circle-fill" /> Active
                  </button>
                ) : (
                  <button
                    style={{ ...s.planBtn, opacity: paying ? 0.7 : 1 }}
                    disabled={paying}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {paying ? "Processing…" : `Get Premium — ₹${price}`}
                  </button>
                )}
                <p style={s.secureNote}>
                  <i className="bi bi-shield-check" /> Secured by Razorpay
                </p>
              </div>
            );
          })}
        </div>

        {!isLoggedIn && (
          <p style={s.loginNote}>
            Already a member?{" "}
            <button style={s.loginLink} onClick={() => navigate("/member/login", { state: { from: "/membership" } })}>
              Log in
            </button>{" "}
            to subscribe.
          </p>
        )}
      </div>
    </div>
  );
}

const PERKS = [
  { icon: "bi-file-earmark-lock2", title: "Premium Articles", desc: "Access exclusive in-depth guides on SAP GRC, BTP Security, IAG, and more." },
  { icon: "bi-people", title: "Expert Authors", desc: "Content written by certified SAP security consultants with real-world experience." },
  { icon: "bi-lightning-charge", title: "Instant Access", desc: "Payment activates your subscription immediately — no waiting, no approval." },
  { icon: "bi-bell", title: "New Content Alerts", desc: "Be notified the moment new premium articles are published." },
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
  heroSub: { fontSize: 17, color: "#94a3b8", maxWidth: 580, margin: "0 auto", lineHeight: 1.7 },
  container: { maxWidth: 900, margin: "0 auto", padding: "48px 24px" },
  activeBanner: {
    display: "flex", alignItems: "flex-start", gap: 12,
    background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10,
    padding: "16px 20px", marginBottom: 32,
  },
  successBanner: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10,
    padding: "14px 20px", marginBottom: 32, fontSize: 15, color: "#15803d",
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
  errorBox: {
    background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
    padding: "12px 16px", color: "#dc2626", fontSize: 14, marginBottom: 20,
  },
  planRow: { display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" },
  planCard: {
    background: "#fff", border: "2px solid #1e293b", borderRadius: 14,
    padding: "28px 28px 22px", width: "100%", maxWidth: 360,
    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
  },
  planHeader: { fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 },
  planPriceRow: { marginBottom: 8 },
  planPrice: { fontSize: 40, fontWeight: 900, color: "#0f172a" },
  planPer: { fontSize: 15, color: "#64748b" },
  planDesc: { fontSize: 14, color: "#475569", margin: "0 0 16px", lineHeight: 1.6 },
  featureList: {
    listStyle: "none", padding: 0, margin: "0 0 24px",
    display: "flex", flexDirection: "column", gap: 8,
    fontSize: 14, color: "#374151",
  },
  planBtn: {
    width: "100%", padding: "13px", background: "#1e293b", color: "#fff",
    border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer",
  },
  secureNote: { textAlign: "center", fontSize: 12, color: "#94a3b8", margin: "10px 0 0" },
  loginNote: { textAlign: "center", fontSize: 14, color: "#64748b", marginTop: 32 },
  loginLink: { background: "none", border: "none", color: "#1e293b", fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: 0 },
};
