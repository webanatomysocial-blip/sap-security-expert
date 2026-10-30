// Must match convertFromINR in server/services/currency.js — the displayed price
// is exactly what Razorpay will charge.
export function toForeignUnits(paise, rate, decimals) {
  const scale = 10 ** decimals;
  let units = Math.round((paise / 100) * rate * scale);
  // 3-decimal currencies (KWD/BHD/OMR): Razorpay requires the last digit to be 0.
  if (decimals === 3) units = Math.floor(units / 10) * 10; // never above the converted price
  // Never round a real price down to zero — charge the smallest valid unit instead.
  return Math.max(units, decimals === 3 ? 10 : 1);
}

export function formatPrice(paise, currency, rate, decimals = 2) {
  if (!currency || currency === "INR" || !rate) return `₹${(paise / 100).toLocaleString("en-IN")}`;
  const amount = toForeignUnits(paise, rate, decimals) / 10 ** decimals;
  return new Intl.NumberFormat(undefined, {
    style: "currency", currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(amount);
}
