import React from "react";
import "../css/CheckoutBilling.css";

// Indian states and union territories, as named on GST invoices. Must match server/utils/gstTax.js.
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

export const emptyBuyer = { buyer_country: "India", buyer_state: "" };

// Prefill from the member's profile. The member can change it for this purchase.
export function buyerFromMember(member) {
  const country = (member?.country || "").trim();
  if (!country) return emptyBuyer;
  const state = country.toLowerCase() === "india" && INDIAN_STATES.includes(member?.state) ? member.state : "";
  return { buyer_country: country, buyer_state: state };
}

// Returns an error message, or null when the buyer details are complete.
export function buyerError(b) {
  const country = (b?.buyer_country || "").trim();
  if (!country) return "Please choose where you are buying from.";
  if (country.toLowerCase() === "india" && !INDIAN_STATES.includes(b.buyer_state)) {
    return "Please choose your state. It decides the GST on your invoice.";
  }
  return null;
}

// UI estimate only. The server repeats this calculation and locks the result
// with the Razorpay order, so a client can never decide the amount charged.
export function estimateCheckoutTax(buyer, taxablePaise) {
  const taxable = Number(taxablePaise || 0);
  const country = String(buyer?.buyer_country || "").trim();
  const isIndia = country.toLowerCase() === "india";
  if (!country || (isIndia && !INDIAN_STATES.includes(buyer?.buyer_state))) {
    return { ready: false, taxablePaise: taxable, totalPaise: taxable, gstPaise: 0 };
  }
  if (!isIndia) return { ready: true, taxablePaise: taxable, totalPaise: taxable, gstPaise: 0, plan: "export" };
  const gstPaise = Math.round(taxable * 0.18);
  if (buyer.buyer_state === "Telangana") {
    const cgstPaise = Math.floor(gstPaise / 2);
    return { ready: true, taxablePaise: taxable, totalPaise: taxable + gstPaise, gstPaise, cgstPaise, sgstPaise: gstPaise - cgstPaise, plan: "cgst-sgst" };
  }
  return { ready: true, taxablePaise: taxable, totalPaise: taxable + gstPaise, gstPaise, igstPaise: gstPaise, plan: "igst" };
}

export function CheckoutPriceSummary({ itemLabel, listPricePaise, discountPaise = 0, buyer, format }) {
  const taxablePaise = Math.max(Number(listPricePaise || 0) - Number(discountPaise || 0), 100);
  const tax = estimateCheckoutTax(buyer, taxablePaise);
  const money = format || ((paise) => `₹${(paise / 100).toFixed(2)}`);
  return (
    <section className="checkout-summary" aria-live="polite">
      <div className="checkout-summary-row checkout-summary-muted"><span>{itemLabel}</span><span>{money(listPricePaise)}</span></div>
      {discountPaise > 0 && <div className="checkout-summary-row checkout-summary-discount"><span>Coupon discount</span><span>−{money(discountPaise)}</span></div>}
      <div className="checkout-summary-row checkout-summary-muted"><span>GST-exclusive amount</span><span>{money(taxablePaise)}</span></div>
      {!tax.ready ? <div className="checkout-tax-prompt"><i className="bi bi-info-circle" /> Choose a billing location to calculate GST.</div>
        : tax.plan === "export" ? <div className="checkout-summary-row checkout-summary-muted"><span>GST (zero-rated export)</span><span>{money(0)}</span></div>
          : tax.plan === "cgst-sgst" ? <>
            <div className="checkout-summary-row checkout-summary-muted"><span>CGST (9%)</span><span>{money(tax.cgstPaise)}</span></div>
            <div className="checkout-summary-row checkout-summary-muted"><span>SGST (9%)</span><span>{money(tax.sgstPaise)}</span></div>
          </> : <div className="checkout-summary-row checkout-summary-muted"><span>IGST (18%)</span><span>{money(tax.igstPaise)}</span></div>}
      <div className="checkout-summary-row checkout-summary-total"><span>Total charged</span><span>{money(tax.totalPaise)}</span></div>
      <p className="checkout-summary-note">The final amount is securely verified when Razorpay creates your order.</p>
    </section>
  );
}

// Buyer location for GST. Defaults to the saved member profile and exposes a
// one-time override without changing the member profile itself.
export default function BuyerTaxFields({ value, onChange, profileBuyer, isCustom = false, onUseProfile }) {
  const isIndia = (value?.buyer_country || "").toLowerCase() === "india";
  const profile = profileBuyer || emptyBuyer;
  const profileComplete = !buyerError(profile);
  const showFields = isCustom || !profileComplete;
  const profileLocation = profileComplete ? `${profile.buyer_state ? `${profile.buyer_state}, ` : ""}${profile.buyer_country}` : "No saved billing location";
  const field = { width: "100%", padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: 9, fontSize: 14, marginTop: 8, background: "#fff" };
  return (
    <section className="checkout-billing">
      <div className="checkout-billing-head">
        <div>
          <h3><i className="bi bi-receipt" /> Billing details</h3>
          <p>{isCustom ? "Using a one-time billing location for this purchase." : `Using saved profile location: ${profileLocation}.`}</p>
        </div>
        {profileComplete && (isCustom
          ? <button type="button" className="checkout-link-button" onClick={onUseProfile}>Use saved location</button>
          : <button type="button" className="checkout-link-button" onClick={() => onChange({ ...value })}>Use a different location</button>)}
      </div>
      {showFields && <div className="checkout-billing-fields">
        <div className="checkout-location-choice">
          <label><input type="radio" name="buyer-location" checked={isIndia} onChange={() => onChange({ buyer_country: "India", buyer_state: "" })} /> India</label>
          <label><input type="radio" name="buyer-location" checked={!isIndia} onChange={() => onChange({ buyer_country: "", buyer_state: "" })} /> Outside India</label>
        </div>
        {isIndia ? (
        <select style={field} value={value?.buyer_state || ""} onChange={(e) => onChange({ buyer_country: "India", buyer_state: e.target.value })}>
          <option value="">Select your state</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : (
          <input style={field} placeholder="Your country" maxLength={60} value={value?.buyer_country || ""} onChange={(e) => onChange({ buyer_country: e.target.value, buyer_state: "" })} />
        )}
      </div>}
    </section>
  );
}
