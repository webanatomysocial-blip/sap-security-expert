// Mirrors server/services/currency.js SUPPORTED (plus INR) — anything else is rejected at checkout.
const CURRENCIES = [
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "SEK", name: "Swedish Krona", flag: "🇸🇪" },
  { code: "NOK", name: "Norwegian Krone", flag: "🇳🇴" },
  { code: "DKK", name: "Danish Krone", flag: "🇩🇰" },
  { code: "QAR", name: "Qatari Riyal", flag: "🇶🇦" },
  { code: "KWD", name: "Kuwaiti Dinar", flag: "🇰🇼" },
  { code: "BHD", name: "Bahraini Dinar", flag: "🇧🇭" },
  { code: "OMR", name: "Omani Rial", flag: "🇴🇲" },
  { code: "MYR", name: "Malaysian Ringgit", flag: "🇲🇾" },
  { code: "HKD", name: "Hong Kong Dollar", flag: "🇭🇰" },
  { code: "THB", name: "Thai Baht", flag: "🇹🇭" },
  { code: "IDR", name: "Indonesian Rupiah", flag: "🇮🇩" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "KRW", name: "South Korean Won", flag: "🇰🇷" },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦" },
  { code: "MXN", name: "Mexican Peso", flag: "🇲🇽" },
];

const symbolOf = (code) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code, currencyDisplay: "narrowSymbol" })
      .formatToParts(0).find((p) => p.type === "currency")?.value || code;
  } catch { return code; }
};

export default function CurrencySelect({ value, onChange, loading = false, compact = false }) {
  const current = CURRENCIES.find((c) => c.code === value) || CURRENCIES[0];
  return (
    <div className={`cur-select${compact ? " cur-select--compact" : ""}`}>
      <span className="cur-select-label">Pay in</span>
      <div className={`cur-select-box${loading ? " is-loading" : ""}`}>
        <span className="cur-select-flag" aria-hidden="true">{current.flag}</span>
        <span className="cur-select-text" aria-hidden="true">
          <strong>{current.code}</strong>
          <span>{current.name}</span>
        </span>
        <span className="cur-select-symbol" aria-hidden="true">{symbolOf(current.code)}</span>
        {loading
          ? <span className="cur-select-spin" aria-hidden="true" />
          : <i className="bi bi-chevron-down cur-select-chev" aria-hidden="true" />}
        <select
          aria-label="Payment currency"
          value={current.code}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag}  {c.code} — {c.name}{c.code === "INR" ? " (default)" : ""}
            </option>
          ))}
        </select>
      </div>
      {value !== "INR" && (
        <p className="cur-select-note">
          <i className="bi bi-info-circle" /> Approximate conversion from INR at today's rate. You'll be charged in {current.code}.
        </p>
      )}
      <style>{`
        .cur-select { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 6px 12px; margin-bottom: 18px; }
        .cur-select-label { font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; }
        .cur-select-box {
          position: relative; display: flex; align-items: center; gap: 10px; min-width: 0;
          padding: 8px 14px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px;
          transition: border-color .15s, box-shadow .15s;
        }
        .cur-select-box:hover { border-color: #cbd5e1; }
        .cur-select-box:focus-within { border-color: #1e293b; box-shadow: 0 0 0 3px rgba(30,41,59,.12); }
        .cur-select-box.is-loading { opacity: .65; }
        .cur-select-flag { font-size: 1.25rem; line-height: 1; }
        .cur-select-text { display: flex; align-items: baseline; gap: 8px; min-width: 0; flex: 1; }
        .cur-select-text strong { font-size: 0.92rem; color: #0f172a; letter-spacing: .02em; }
        .cur-select-text span { font-size: 0.82rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cur-select-symbol { font-size: 0.78rem; font-weight: 700; color: #475569; background: #f1f5f9; border-radius: 6px; padding: 2px 8px; }
        .cur-select-chev { font-size: 0.8rem; color: #94a3b8; }
        .cur-select-spin { width: 14px; height: 14px; border: 2px solid #cbd5e1; border-top-color: #1e293b; border-radius: 50%; animation: cur-spin .7s linear infinite; }
        @keyframes cur-spin { to { transform: rotate(360deg); } }
        .cur-select-box select { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; font-size: 16px; }
        .cur-select-box select:disabled { cursor: wait; }
        .cur-select-note { grid-column: 2; margin: 0; font-size: 0.74rem; color: #94a3b8; }
        .cur-select--compact .cur-select-text span { display: none; }
        @media (max-width: 420px) {
          .cur-select { grid-template-columns: 1fr; }
          .cur-select-note { grid-column: 1; }
          .cur-select-text span { display: none; }
        }
      `}</style>
    </div>
  );
}
