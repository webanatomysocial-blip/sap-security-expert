import { createPortal } from "react-dom";
import { LuX, LuCalendarCheck, LuCheck, LuPause } from "react-icons/lu";

const DURATION_PRESETS = [
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
];
const MAX_DESCRIPTION = 200;

const inr = (n) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const fieldError = { color: "#dc2626", fontSize: 12, marginTop: 4 };
const errBorder = (has) => (has ? { borderColor: "#dc2626" } : {});

export default function PlanEditModal({ form, setForm, errors, saving, onClose, onSave }) {
  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, [field]: value }));
  };

  const days = parseInt(form.duration_days, 10);
  const rupees = parseFloat(form.price_rupees);
  const perDay = days > 0 && rupees > 0 ? rupees / days : null;
  const isEdit = Boolean(form.id);

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>{`
        .plan-modal { max-width: 520px; width: calc(100% - 32px); }
        .plan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .plan-presets { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .plan-chip { padding: 5px 12px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; }
        .plan-chip[aria-pressed="true"] { border-color: #15803d; background: #f0fdf4; color: #15803d; }
        .plan-status { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
        .plan-status-opt { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; cursor: pointer; background: #fff; text-align: left; font: inherit; color: #334155; }
        .plan-status-opt[aria-checked="true"].is-active { border-color: #16a34a; background: #f0fdf4; }
        .plan-status-opt[aria-checked="true"].is-inactive { border-color: #64748b; background: #f8fafc; }
        .plan-status-opt:focus-visible { outline: 2px solid #15803d; outline-offset: 2px; }
        @media (max-width: 480px) {
          .plan-grid { grid-template-columns: 1fr; }
          .plan-status { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="modal-container plan-modal" role="dialog" aria-modal="true" aria-labelledby="plan-modal-title">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ padding: 10, background: "#f0fdf4", borderRadius: 10 }}>
              <LuCalendarCheck size={20} style={{ color: "#15803d" }} />
            </div>
            <div>
              <h3 id="plan-modal-title" style={{ margin: 0 }}>{isEdit ? "Edit plan" : "New membership plan"}</h3>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>
                Active plans appear on the membership page for members.
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close"><LuX size={20} /></button>
        </div>

        <div className="modal-body" data-lenis-prevent="true" style={{ maxHeight: "65vh", overflowY: "auto" }}>
          {/* Live preview: updates as the admin types */}
          <div aria-live="polite" style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", background: "#f8fafc", marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Preview</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 16, color: form.name.trim() ? "#0f172a" : "#94a3b8" }}>{form.name.trim() || "Untitled plan"}</strong>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{days > 0 ? `${days} days of full access` : "Duration not set"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{rupees > 0 ? inr(rupees) : "₹—"}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{perDay ? `≈ ${inr(perDay.toFixed(2))} per day` : "Price per day appears here"}</div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="plan-name">Plan name <span style={{ color: "#dc2626" }}>*</span></label>
            <input id="plan-name" className="form-control" placeholder="e.g. 1 Year" value={form.name} onChange={set("name")} style={errBorder(errors.name)} autoComplete="off" />
            {errors.name && <p style={fieldError}>{errors.name}</p>}
          </div>

          <div className="plan-grid" style={{ marginTop: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="plan-days">Duration (days) <span style={{ color: "#dc2626" }}>*</span></label>
              <input id="plan-days" className="form-control" type="number" min="1" inputMode="numeric" placeholder="e.g. 365" value={form.duration_days} onChange={set("duration_days")} style={errBorder(errors.duration_days)} />
              {errors.duration_days && <p style={fieldError}>{errors.duration_days}</p>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="plan-price">Price (₹) <span style={{ color: "#dc2626" }}>*</span></label>
              <input id="plan-price" className="form-control" type="number" min="1" step="0.01" inputMode="decimal" placeholder="e.g. 3999" value={form.price_rupees} onChange={set("price_rupees")} style={errBorder(errors.price_rupees)} />
              {errors.price_rupees && <p style={fieldError}>{errors.price_rupees}</p>}
            </div>
          </div>

          <div className="plan-presets" role="group" aria-label="Duration presets">
            {DURATION_PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                className="plan-chip"
                aria-pressed={days === p.days}
                onClick={() => setForm((f) => ({ ...f, duration_days: String(p.days) }))}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label className="form-label" htmlFor="plan-desc">Description</label>
              <span style={{ fontSize: 12, color: form.description.length > MAX_DESCRIPTION * 0.9 ? "#b45309" : "#94a3b8" }}>
                {form.description.length}/{MAX_DESCRIPTION}
              </span>
            </div>
            <textarea
              id="plan-desc"
              className="form-control"
              rows={3}
              maxLength={MAX_DESCRIPTION}
              placeholder="Shown to members under the plan name"
              value={form.description}
              onChange={set("description")}
              style={{ resize: "vertical", minHeight: 72, lineHeight: 1.5 }}
            />
          </div>

          {isEdit && (
            <div className="form-group" style={{ marginTop: 16 }}>
              <span className="form-label" id="plan-status-label">Status</span>
              <div className="plan-status" role="radiogroup" aria-labelledby="plan-status-label">
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.is_active === 1}
                  className={`plan-status-opt is-active`}
                  onClick={() => setForm((p) => ({ ...p, is_active: 1 }))}
                >
                  <LuCheck size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
                  <span>
                    <strong style={{ display: "block", fontSize: 14 }}>Active</strong>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Visible to members</span>
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.is_active === 0}
                  className={`plan-status-opt is-inactive`}
                  onClick={() => setForm((p) => ({ ...p, is_active: 0 }))}
                >
                  <LuPause size={18} style={{ color: "#64748b", flexShrink: 0 }} />
                  <span>
                    <strong style={{ display: "block", fontSize: 14 }}>Inactive</strong>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Hidden from members</span>
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--slate-100)", padding: "14px 24px" }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: "1 1 0", minWidth: 0, padding: "8px 16px", borderRadius: 8, border: "1px solid var(--slate-200)", background: "white", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button className="btn-primary" onClick={onSave} disabled={saving} style={{ flex: "1 1 0", minWidth: 0, padding: "8px 20px", borderRadius: 8, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : isEdit ? "Update plan" : "Create plan"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
