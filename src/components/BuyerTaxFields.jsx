import React from "react";

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

// Buyer location for GST. India needs a state; outside India needs a country.
export default function BuyerTaxFields({ value, onChange }) {
  const isIndia = (value?.buyer_country || "").toLowerCase() === "india";
  const field = { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, marginTop: 6 };
  return (
    <div style={{ margin: "14px 0" }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>Billing details</div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Taken from your profile. Change them here if this purchase needs a different billing location.</div>
      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 14 }}>
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
    </div>
  );
}
