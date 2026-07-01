import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getInvoice } from "../services/api";

export default function MemberInvoice() {
  const { txId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getInvoice(txId)
      .then((r) => setInvoice(r.data.invoice))
      .catch((e) => setError(e.response?.data?.message || "Invoice not found"));
  }, [txId]);

  if (error) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "#dc2626", fontWeight: 600 }}>{error}</p>
        <Link to="/member/credits" style={{ color: "#1d4ed8", fontSize: 14 }}>← Back to Credits</Link>
      </div>
    );
  }

  if (!invoice) {
    return <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>Loading invoice…</div>;
  }

  const discount = invoice.bundle_price_paise - invoice.final_price_paise;
  const fmt = (paise) => paise > 0 ? `₹${(paise / 100).toFixed(2)}` : "₹0.00";
  const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ maxWidth: 680, margin: "40px auto", padding: "0 20px 60px" }}>
      {/* Print button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Link to="/member/credits" style={{ color: "#64748b", fontSize: 14, textDecoration: "none" }}>← Back to Credits</Link>
        <button
          onClick={() => {
            const content = document.getElementById("invoice-print").innerHTML;
            const win = window.open("", "_blank", "width=800,height=900");
            win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice #${String(invoice.id).padStart(6,"0")}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#1e293b}table{width:100%;border-collapse:collapse}@media print{@page{margin:20mm}}</style></head><body>${content}</body></html>`);
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); win.close(); }, 400);
          }}
          style={{ padding: "8px 18px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          <i className="bi bi-printer"></i> Print / Save PDF
        </button>
      </div>

      {/* Invoice card */}
      <div id="invoice-print" style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: 40, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <img src="/assets/sapsecurityexpert-white.png" alt="SAP Security Expert" style={{ height: 36, filter: "brightness(0)", marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>sapsecurityexpert.com</p>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>hello@sapsecurityexpert.com</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>INVOICE</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>#{String(invoice.id).padStart(6, "0")}</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>{fmtDate(invoice.created_at)}</p>
          </div>
        </div>

        {/* Bill to */}
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px 20px", marginBottom: 32 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px" }}>Bill To</p>
          <p style={{ margin: "6px 0 0", fontWeight: 700, color: "#1e293b", fontSize: "1rem" }}>{invoice.member_name}</p>
          <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 14 }}>{invoice.member_email}</p>
        </div>

        {/* Line items */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ padding: "8px 0", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Description</th>
              <th style={{ padding: "8px 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Credits</th>
              <th style={{ padding: "8px 0", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "16px 0", fontWeight: 600, color: "#1e293b" }}>
                {invoice.bundle_name || "Credit Bundle"}
                {invoice.razorpay_order_id && (
                  <span style={{ display: "block", fontSize: 12, color: "#94a3b8", fontWeight: 400, marginTop: 2 }}>
                    Order: {invoice.razorpay_order_id}
                  </span>
                )}
              </td>
              <td style={{ padding: "16px 0", textAlign: "center", color: "#64748b" }}>{invoice.credits_delta}</td>
              <td style={{ padding: "16px 0", textAlign: "right", color: "#1e293b" }}>{fmt(invoice.bundle_price_paise)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 240 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14, color: "#64748b" }}>
              <span>Subtotal</span><span>{fmt(invoice.bundle_price_paise)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14, color: "#16a34a" }}>
                <span>Discount {invoice.coupon_code ? `(${invoice.coupon_code})` : ""}</span>
                <span>- {fmt(discount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: "1rem", fontWeight: 800, color: "#1e293b", borderTop: "2px solid #e2e8f0", marginTop: 4 }}>
              <span>Total Paid</span><span>{fmt(invoice.final_price_paise)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Thank you for your purchase! For support write to <strong>hello@sapsecurityexpert.com</strong></p>
        </div>
      </div>

      <style>{`@media print { button, a { display: none !important; } body { background: #fff; } }`}</style>
    </div>
  );
}
