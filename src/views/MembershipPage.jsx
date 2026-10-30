import { useState, useEffect } from "react";
import { formatPrice } from "../utils/fxPrice";
import CurrencySelect from "../components/CurrencySelect";
import { useNavigate } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
import { getCreditBundles, createCreditOrder, verifyCreditPayment, validateCoupon, detectPaymentCurrency, getMembershipPlans, createMembershipOrder } from "../services/api";
import SEO from "../components/SEO";
import { VITE_SITE_URL } from "../utils/env";

export default function MembershipPage() {
  const { isLoggedIn, member, creditBalance, onCreditsPurchased, refreshCredits, membership, setMembership } = useMemberAuth();
  const navigate = useNavigate();
  const [bundles, setBundles] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [paying, setPaying] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
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

  useEffect(() => {
    if (isLoggedIn) refreshCredits();
    getCreditBundles()
      .then((res) => {
        const b = res.data?.bundles || [];
        setBundles(b);
      })
      .catch(() => {});
    getMembershipPlans()
      .then((res) => setPlans((res.data?.plans || []).map((p) => ({ ...p, isPlan: true }))))
      .catch(() => {});
    detectPaymentCurrency().then((r) => {
      if (r.data?.currency && r.data.currency !== "INR") {
        setFxCurrency(r.data.currency);
        setFxRate(r.data.rate);
        setFxDecimals(r.data.decimals ?? 2);
      }
    }).catch(() => {});
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
      const res = await validateCoupon(couponCode.trim(), selectedBundle?.isPlan ? undefined : selectedBundle?.id, selectedBundle?.isPlan ? selectedBundle.id : undefined);
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

      const coupon = couponData && selectedBundle === bundle ? couponCode : undefined;
      const cur = fxCurrency !== "INR" ? fxCurrency : undefined;
      const orderRes = bundle.isPlan
        ? await createMembershipOrder(bundle.id, coupon, cur)
        : await createCreditOrder(bundle.id, coupon, cur);
      const { order_id, amount, currency: orderCurrency, key_id } = orderRes.data;

      const options = {
        key: key_id,
        amount,
        currency: orderCurrency || "INR",
        name: "SAP Security Expert",
        description: bundle.isPlan ? `${bundle.name} Membership` : `${bundle.credits} Credits: ${bundle.name}`,
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
              if (verifyRes.data.type === "membership") {
                setMembership(verifyRes.data.membership);
                setSuccessMsg(`${verifyRes.data.message} Valid until ${fmtDate(verifyRes.data.membership?.expires_at)}.`);
              } else {
                setSuccessMsg(`${verifyRes.data.credits_added} credits added! Your balance is now ${verifyRes.data.new_balance} credits.`);
              }
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
      if (err.response?.data?.reason === "below_minimum") handleCurrencyChange("INR");
      setErrorMsg(err.response?.data?.message || "Could not initiate payment. Try again.");
      setPaying(false);
    }
  };

  const fmt = (paise) => formatPrice(paise, fxCurrency, fxRate, fxDecimals);
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");
  const discountedPaise = (bundle) => {
    if (!couponData || selectedBundle !== bundle) return bundle.price_paise;
    return Math.max(bundle.price_paise - (couponData.discount_paise || 0), 100);
  };

  const [view, setView] = useState("membership");
  const showPlans = plans.length > 0 && view === "membership";
  const items = showPlans ? plans : bundles;
  const basePlan = plans[0];
  const perDay = (p) => p.price_paise / p.duration_days;
  const savingsPct = (p) => (basePlan && p !== basePlan ? Math.round((1 - perDay(p) / perDay(basePlan)) * 100) : 0);
  const bestPlan = plans.length > 1 ? plans[plans.length - 1] : null;
  const switchView = (v) => {
    setView(v);
    setSelectedBundle(null); setCouponData(null); setCouponCode(""); setCouponError("");
  };

  return (
    <div className="mp-page">
      <SEO
        title="Membership & Credits — Unlock Premium SAP Security Articles"
        description="Get unlimited access to every premium SAP Security, GRC and BTP article and download with a 1, 3, 6 or 12-month membership, or buy credits to unlock articles forever."
        url={`${VITE_SITE_URL}/membership`}
      />

      <section className="mp-hero">
        <span className="mp-badge">Premium Access</span>
        <h1>Unlock Premium SAP Security Insights</h1>
        <p>Go unlimited with a membership, or buy credits and keep every article you unlock forever. No auto-renewals, ever.</p>
        {isLoggedIn && (
          <div className="mp-status">
            <span><i className="bi bi-coin" /> <strong>{creditBalance}</strong> credits</span>
            <span className="mp-status-sep" />
            {membership
              ? <span className="mp-status-on"><i className="bi bi-patch-check-fill" /> Member until {fmtDate(membership.expires_at)}</span>
              : <span className="mp-status-off">No active membership</span>}
          </div>
        )}
      </section>

      <div className="mp-container">
        {plans.length > 0 && (
          <div className="mp-switch" role="tablist">
            <button role="tab" aria-selected={view === "membership"} className={view === "membership" ? "on" : ""} onClick={() => switchView("membership")}>
              <i className="bi bi-patch-check-fill" /> Membership
            </button>
            <button role="tab" aria-selected={view === "credits"} className={view === "credits" ? "on" : ""} onClick={() => switchView("credits")}>
              <i className="bi bi-coin" /> Credits
            </button>
          </div>
        )}
        <p className="mp-lead">
          {showPlans
            ? "Read every premium article and download every file while your membership is active."
            : "Spend credits to unlock individual articles. Unlocked articles are yours forever."}
        </p>

        {successMsg && <div className="mp-alert mp-alert-ok"><i className="bi bi-check-circle-fill" /> {successMsg}</div>}
        {errorMsg && <div className="mp-alert mp-alert-err"><i className="bi bi-exclamation-circle-fill" /> {errorMsg}</div>}
        {showPlans && membership && (
          <div className="mp-alert mp-alert-info">
            <i className="bi bi-info-circle-fill" /> You're a member until {fmtDate(membership.expires_at)}. Buying another plan extends it from that date.
          </div>
        )}

        <div className="mp-toolbar">
          <div className="mp-toolbar-cur">
            <CurrencySelect value={fxCurrency} onChange={handleCurrencyChange} loading={fxLoading} />
          </div>
          <div className="mp-coupon">
            <div className="mp-coupon-row">
              <input
                type="text"
                placeholder={selectedBundle ? `Coupon for ${selectedBundle.name}` : "Select a plan to use a coupon"}
                value={couponCode}
                disabled={!selectedBundle}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponData(null); setCouponError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
              />
              <button onClick={handleApplyCoupon} disabled={validatingCoupon || !couponCode.trim() || !selectedBundle}>
                {validatingCoupon ? "…" : "Apply"}
              </button>
            </div>
            {couponError && <p className="mp-coupon-err">{couponError}</p>}
            {couponData && <p className="mp-coupon-ok"><i className="bi bi-check-circle-fill" /> {fmt(couponData.discount_paise)} off {selectedBundle?.name}</p>}
          </div>
        </div>

        <div className="mp-grid">
          {items.length === 0 && <p className="mp-empty">{showPlans ? "No plans available right now." : "Loading bundles…"}</p>}
          {items.map((item) => {
            const isSelected = selectedBundle === item;
            const finalPaise = discountedPaise(item);
            const isBest = showPlans && item === bestPlan && savingsPct(item) > 0;
            const save = showPlans ? savingsPct(item) : 0;
            return (
              <div
                key={`${showPlans ? "p" : "b"}-${item.id}`}
                className={`mp-card${isSelected ? " is-selected" : ""}${isBest ? " is-best" : ""}`}
                onClick={() => { if (!isSelected) { setSelectedBundle(item); setCouponData(null); setCouponCode(""); setCouponError(""); } }}
              >
                {isBest && <span className="mp-ribbon">Best value</span>}
                <div className="mp-card-name">{item.name}</div>
                <div className="mp-card-sub">
                  {showPlans ? `${item.duration_days} days of full access` : `${item.credits} credits`}
                </div>

                <div className="mp-price">
                  {couponData && isSelected && <span className="mp-price-old">{fmt(item.price_paise)}</span>}
                  <span className="mp-price-now">{fmt(finalPaise)}</span>
                </div>
                <div className="mp-price-note">
                  {showPlans
                    ? (item.duration_days > 31 ? <>≈ {fmt(Math.round(item.price_paise / (item.duration_days / 30)))} / month</> : <>billed once</>)
                    : <>≈ {fmt(Math.round(item.price_paise / item.credits))} per credit</>}
                  {save > 0 && <span className="mp-save">Save {save}%</span>}
                </div>

                <ul className="mp-features">
                  {(showPlans
                    ? ["Every premium article", "Every downloadable file", "One-time payment, no auto-renew"]
                    : [`Unlock ${item.credits} premium articles`, "Lifetime access to what you unlock", "Credits never expire"]
                  ).map((f) => <li key={f}><i className="bi bi-check2" /> {f}</li>)}
                </ul>

                <button
                  className="mp-buy"
                  disabled={paying}
                  onClick={(e) => { e.stopPropagation(); setSelectedBundle(item); handleBuy(item); }}
                >
                  {paying && isSelected ? "Processing…"
                    : !isLoggedIn ? "Log in to buy"
                    : showPlans ? `${membership ? "Extend" : "Get"} ${item.name}`
                    : `Buy ${item.credits} credits`}
                </button>
              </div>
            );
          })}
        </div>
        <p className="mp-secure"><i className="bi bi-shield-lock-fill" /> Payments secured by Razorpay · GST invoice emailed after purchase</p>

        <section className="mp-compare">
          <div className="mp-compare-col">
            <h3><i className="bi bi-patch-check-fill" /> Membership</h3>
            <p>Best if you read regularly.</p>
            <ul>
              <li>All premium articles and downloads</li>
              <li>Access lasts for your plan's duration</li>
              <li>Articles opened with membership lock again when it ends</li>
            </ul>
          </div>
          <div className="mp-compare-col">
            <h3><i className="bi bi-coin" /> Credits</h3>
            <p>Best for specific articles you want to keep.</p>
            <ul>
              <li>Pay only for what you unlock</li>
              <li>Unlocked articles are yours forever</li>
              <li>Can be used alongside a membership</li>
            </ul>
          </div>
        </section>

        <section className="mp-faq">
          <h2>Common questions</h2>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>

        {!isLoggedIn && (
          <p className="mp-login">
            Already have an account?{" "}
            <button onClick={() => navigate("/member/login", { state: { from: "/membership" } })}>Log in</button> to purchase.
          </p>
        )}
      </div>

      <style>{CSS}</style>
    </div>
  );
}

const FAQ = [
  ["Will my membership renew automatically?", "No. Every purchase is a one-time payment. We never charge your card again unless you buy another plan."],
  ["What happens when my membership ends?", "Articles you opened with your membership lock again. Anything you unlocked with credits stays yours forever."],
  ["I'm already a member. What if I buy again?", "Your new plan starts the day your current one ends, so you never lose paid days."],
  ["Can I pay in my own currency?", "Yes. Pick your currency above; the price shown is exactly what you'll be charged."],
];

const CSS = `
.mp-page { min-height: 100vh; background: #f8fafc; }
.mp-hero { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); color: #fff; text-align: center; padding: 64px 20px 72px; }
.mp-badge { display: inline-block; background: rgba(217,119,6,.18); color: #fcd34d; border: 1px solid rgba(217,119,6,.4); border-radius: 999px; padding: 4px 14px; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 16px; }
.mp-hero h1 { font-size: clamp(26px, 5vw, 42px); font-weight: 800; margin: 0 0 14px; line-height: 1.2; }
.mp-hero p { font-size: 17px; color: #94a3b8; max-width: 600px; margin: 0 auto; line-height: 1.7; }
.mp-status { display: inline-flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: center; margin-top: 22px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 8px 20px; font-size: 14px; color: #e2e8f0; }
.mp-status i { color: #fcd34d; }
.mp-status strong { color: #fcd34d; }
.mp-status-sep { width: 1px; height: 16px; background: rgba(255,255,255,.25); }
.mp-status-on, .mp-status-on i { color: #86efac; }
.mp-status-off { color: #94a3b8; }

.mp-container { max-width: 1080px; margin: -36px auto 0; padding: 0 20px 64px; position: relative; }
.mp-switch { display: flex; width: fit-content; margin: 0 auto 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; padding: 5px; box-shadow: 0 8px 24px rgba(15,23,42,.08); }
.mp-switch button { border: none; background: none; padding: 10px 26px; border-radius: 999px; font-size: 14px; font-weight: 700; color: #64748b; cursor: pointer; display: inline-flex; gap: 8px; align-items: center; }
.mp-switch button.on { background: #0f172a; color: #fff; }
.mp-lead { text-align: center; color: #475569; font-size: 15px; margin: 0 auto 24px; max-width: 560px; }

.mp-alert { display: flex; gap: 10px; align-items: flex-start; border-radius: 10px; padding: 12px 16px; font-size: 14px; margin: 0 auto 16px; max-width: 760px; }
.mp-alert-ok { background: #f0fdf4; border: 1px solid #86efac; color: #15803d; }
.mp-alert-err { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
.mp-alert-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }

.mp-toolbar { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: start; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px 0; margin-bottom: 24px; }
.mp-coupon { padding-bottom: 16px; }
.mp-coupon-row { display: flex; gap: 8px; }
.mp-coupon-row input { flex: 1; min-width: 0; padding: 10px 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 14px; outline: none; font-family: inherit; }
.mp-coupon-row input:focus { border-color: #1e293b; }
.mp-coupon-row input:disabled { background: #f8fafc; }
.mp-coupon-row button { padding: 0 18px; background: #0f172a; color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer; }
.mp-coupon-row button:disabled { opacity: .45; cursor: not-allowed; }
.mp-coupon-err { color: #dc2626; font-size: 13px; margin: 6px 0 0; }
.mp-coupon-ok { color: #16a34a; font-size: 13px; margin: 6px 0 0; }

.mp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 18px; }
.mp-empty { grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 32px 0; }
.mp-card { position: relative; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 26px 22px 22px; display: flex; flex-direction: column; cursor: pointer; transition: border-color .15s, box-shadow .15s, transform .15s; }
.mp-card:hover { box-shadow: 0 10px 28px rgba(15,23,42,.08); transform: translateY(-2px); }
.mp-card.is-selected { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15,23,42,.08); }
.mp-card.is-best { border-color: #15803d; }
.mp-card.is-best.is-selected { box-shadow: 0 0 0 3px rgba(21,128,61,.15); }
.mp-ribbon { position: absolute; top: -11px; left: 22px; background: #15803d; color: #fff; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; }
.mp-card-name { font-size: 18px; font-weight: 800; color: #0f172a; }
.mp-card-sub { font-size: 13px; color: #64748b; margin-top: 2px; }
.mp-price { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-top: 18px; }
.mp-price-now { font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: -.01em; }
.mp-price-old { font-size: 16px; color: #94a3b8; text-decoration: line-through; }
.mp-price-note { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; color: #64748b; min-height: 22px; margin-top: 2px; }
.mp-save { background: #dcfce7; color: #15803d; font-weight: 700; font-size: 11.5px; padding: 2px 8px; border-radius: 999px; }
.mp-features { list-style: none; padding: 0; margin: 18px 0 22px; display: flex; flex-direction: column; gap: 9px; font-size: 13.5px; color: #334155; flex: 1; }
.mp-features i { color: #16a34a; margin-right: 6px; }
.mp-buy { width: 100%; padding: 12px; border: none; border-radius: 10px; background: #0f172a; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; transition: background .15s; }
.mp-buy:hover:not(:disabled) { background: #1e293b; }
.mp-card.is-best .mp-buy { background: #15803d; }
.mp-card.is-best .mp-buy:hover:not(:disabled) { background: #166534; }
.mp-buy:disabled { opacity: .65; cursor: wait; }
.mp-secure { text-align: center; color: #94a3b8; font-size: 13px; margin: 20px 0 48px; }

.mp-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 48px; }
.mp-compare-col { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px 24px; }
.mp-compare-col h3 { margin: 0 0 4px; font-size: 17px; color: #0f172a; display: flex; gap: 8px; align-items: center; }
.mp-compare-col:first-child h3 i { color: #15803d; }
.mp-compare-col:last-child h3 i { color: #d97706; }
.mp-compare-col p { margin: 0 0 12px; color: #64748b; font-size: 14px; }
.mp-compare-col ul { margin: 0; padding-left: 18px; color: #334155; font-size: 14px; line-height: 1.9; }

.mp-faq { max-width: 760px; margin: 0 auto; }
.mp-faq h2 { text-align: center; font-size: 22px; color: #0f172a; margin: 0 0 18px; }
.mp-faq details { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin-bottom: 10px; }
.mp-faq summary { font-weight: 700; color: #0f172a; cursor: pointer; font-size: 15px; }
.mp-faq details p { margin: 10px 0 0; color: #475569; font-size: 14px; line-height: 1.7; }

.mp-login { text-align: center; font-size: 14px; color: #64748b; margin-top: 32px; }
.mp-login button { background: none; border: none; color: #0f172a; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 0; }

@media (max-width: 720px) {
  .mp-toolbar { grid-template-columns: 1fr; gap: 0; }
  .mp-compare { grid-template-columns: 1fr; }
  .mp-hero { padding: 48px 16px 64px; }
  .mp-container { padding: 0 16px 48px; }
  .mp-switch button { padding: 10px 18px; }
}
`;
