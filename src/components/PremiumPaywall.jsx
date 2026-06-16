import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
import { getMembershipPlans, createPaymentOrder, verifyPayment } from "../services/api";

/**
 * PremiumPaywall — mirrors the visual style of MembersOnlyPaywall.
 *
 * Logged-out  → Login / Sign Up buttons (zero content was sent by backend)
 * Logged-in, no subscription → Razorpay payment card (no content sent by backend)
 *
 * On successful payment calls onSuccess() so DynamicBlog re-fetches full content.
 */
export default function PremiumPaywall({ onSuccess }) {
  const { isLoggedIn, member, activatePremium } = useMemberAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isLoggedIn) {
      getMembershipPlans()
        .then((res) => { if (res.data?.plans) setPlans(res.data.plans); })
        .catch(() => {});
    }
  }, [isLoggedIn]);

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

  const handlePay = async (plan) => {
    setErrorMsg("");
    setPaying(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        setErrorMsg("Payment gateway failed to load. Check your connection.");
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
              if (onSuccess) onSuccess();
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

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not initiate payment. Try again.");
      setPaying(false);
    }
  };

  const plan = plans[0] || null;
  const price = plan ? (plan.price_paise / 100).toFixed(0) : "1";

  // ── Logged-out: show login/signup prompt (same as MembersOnlyPaywall) ──────
  if (!isLoggedIn) {
    return (
      <div className="members-paywall-overlay">
        <div className="members-paywall-gradient" />
        <div className="members-paywall-card">
          <div className="members-paywall-lock-icon">
            <i className="bi bi-lock-fill"></i>
          </div>
          <h2 className="members-paywall-heading">
            Premium Members-Only Content
          </h2>
          <p className="members-paywall-subtext">
            This article requires a Premium membership. Log in to your account
            and subscribe to unlock full access to exclusive SAP Security insights.
          </p>
          <div className="members-paywall-actions">
            <button
              className="members-paywall-btn-login"
              onClick={() =>
                navigate("/member/login", {
                  state: { from: window.location.pathname + window.location.search },
                })
              }
            >
              Log In
            </button>
            <button
              className="members-paywall-btn-signup"
              onClick={() => navigate("/member/signup")}
            >
              Create Free Account
            </button>
          </div>
          <p className="members-paywall-note">
            Already have an account? Log in and subscribe for just ₹{price}/month.
          </p>
        </div>
      </div>
    );
  }

  // ── Logged-in but no subscription: show payment card ──────────────────────
  return (
    <div className="members-paywall-overlay">
      <div className="members-paywall-gradient" />
      <div className="members-paywall-card">
        <div className="members-paywall-lock-icon" style={{ background: "#fef3c7" }}>
          <i className="bi bi-star-fill" style={{ color: "#d97706" }}></i>
        </div>
        <h2 className="members-paywall-heading">
          Unlock This Premium Article
        </h2>
        <p className="members-paywall-subtext">
          Get full access to this in-depth SAP Security guide and all premium
          articles with a monthly subscription.
        </p>

        {plan && (
          <div style={{
            background: "#fffbeb",
            border: "1.5px solid #fcd34d",
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 16,
            textAlign: "center",
          }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>
              {plan.name}
            </span>
            <span style={{ fontSize: 28, fontWeight: 900, color: "#1e293b" }}>
              ₹{price}
            </span>
            <span style={{ fontSize: 13, color: "#64748b" }}> / {plan.duration_days} days</span>
          </div>
        )}

        {errorMsg && (
          <p style={{
            color: "#dc2626", fontSize: 13, marginBottom: 12,
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 6, padding: "8px 12px",
          }}>
            {errorMsg}
          </p>
        )}

        <div className="members-paywall-actions">
          <button
            className="members-paywall-btn-login"
            style={{ opacity: paying || !plan ? 0.7 : 1 }}
            disabled={paying || !plan}
            onClick={() => plan && handlePay(plan)}
          >
            {paying ? "Processing…" : `Unlock for ₹${price}`}
          </button>
          <a
            href="/membership"
            className="members-paywall-btn-signup"
            style={{ textDecoration: "none", textAlign: "center", display: "block" }}
          >
            View All Plans
          </a>
        </div>
        <p className="members-paywall-note">
          <i className="bi bi-shield-check"></i> Payment secured by Razorpay.
          Logged in as <strong>{member?.name}</strong>.
        </p>
      </div>
    </div>
  );
}
