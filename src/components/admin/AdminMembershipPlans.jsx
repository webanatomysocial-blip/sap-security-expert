import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import TableScrollContainer from "./TableScrollContainer";
import ActionMenu from "./ActionMenu";
import { LuPlus } from "react-icons/lu";
import PlanEditModal from "./PlanEditModal";
import { getAdminMembershipPlans, saveMembershipPlan, getAdminSubscriptions } from "../../services/api";

const EMPTY_PLAN = { id: null, name: "", duration_days: "", price_rupees: "", description: "", is_active: 1 };
const fmt = (paise) => `₹${(paise / 100).toLocaleString("en-IN")}`;
const fmtDate = (v) => (v ? new Date(String(v).replace(" ", "T") + (String(v).includes("Z") ? "" : "Z")).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");

function subStatus(s) {
  const now = Date.now();
  const start = new Date(String(s.starts_at).replace(" ", "T") + (String(s.starts_at).includes("Z") ? "" : "Z")).getTime();
  const end = new Date(String(s.expires_at).replace(" ", "T") + (String(s.expires_at).includes("Z") ? "" : "Z")).getTime();
  if (s.status !== "active") return { label: s.status === "cancelled" ? "Refunded" : s.status, bg: "#fee2e2", color: "#dc2626" };
  if (end <= now) return { label: "Expired", bg: "#f1f5f9", color: "#64748b" };
  if (start > now) return { label: "Upcoming", bg: "#e0f2fe", color: "#0369a1" };
  return { label: "Active", bg: "#dcfce7", color: "#16a34a" };
}

export default function AdminMembershipPlans() {
  const { addToast } = useToast();
  const [plans, setPlans] = useState([]);
  const [subs, setSubs] = useState([]);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    getAdminMembershipPlans().then((r) => setPlans(r.data?.plans || [])).catch(() => {});
    getAdminSubscriptions().then((r) => setSubs(r.data?.subscriptions || [])).catch(() => {});
  };
  useEffect(load, []);

  const openModal = (p) => {
    setErrors({});
    setForm(p ? { id: p.id, name: p.name, duration_days: String(p.duration_days), price_rupees: String(p.price_paise / 100), description: p.description || "", is_active: Number(p.is_active) } : EMPTY_PLAN);
  };

  const submit = async (data) => {
    setSaving(true);
    try {
      await saveMembershipPlan(data);
      addToast(data.id ? "Plan updated." : "Plan created.", "success");
      setForm(null);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to save plan.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    const days = parseInt(form.duration_days);
    if (!days || days < 1) e.duration_days = "Enter number of days";
    const price = Math.round(parseFloat(form.price_rupees) * 100);
    if (!price || price < 100) e.price_rupees = "Minimum ₹1";
    setErrors(e);
    if (Object.keys(e).length) return;
    submit({ id: form.id, name: form.name.trim(), duration_days: days, price_paise: price, description: form.description, is_active: form.is_active });
  };

  const toggleActive = (p) => submit({ ...p, is_active: Number(p.is_active) ? 0 : 1 });

  const activeCount = subs.filter((s) => subStatus(s).label === "Active").length;

  return (
    <>
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Membership Plans</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>Time-limited access to all premium articles and downloads. Only active plans are shown to members.</p>
          </div>
          <button className="btn-primary" onClick={() => openModal()}>
            <LuPlus style={{ marginRight: 6 }} />New Plan
          </button>
        </div>
        <TableScrollContainer>
          <table className="admin-table">
            <thead>
              <tr>
                <th className="col-lg text-left">Plan</th>
                <th className="col-md text-center">Duration</th>
                <th className="col-md text-center">Price</th>
                <th className="col-sm text-center">Status</th>
                <th className="col-actions text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No plans yet.</td></tr>
              )}
              {plans.map((p) => (
                <tr key={p.id}>
                  <td className="col-lg text-left">
                    <strong>{p.name}</strong>
                    {p.description && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{p.description}</div>}
                  </td>
                  <td className="col-md text-center">{p.duration_days} days</td>
                  <td className="col-md text-center" style={{ fontWeight: 600 }}>{fmt(p.price_paise)}</td>
                  <td className="col-sm text-center">
                    <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: Number(p.is_active) ? "#dcfce7" : "#fee2e2", color: Number(p.is_active) ? "#16a34a" : "#dc2626" }}>
                      {Number(p.is_active) ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="col-actions text-center">
                    <ActionMenu>
                      <button className="action-menu-item" onClick={() => openModal(p)}>
                        <i className="bi bi-pencil" style={{ marginRight: 6 }}></i>Edit
                      </button>
                      <button className="action-menu-item" onClick={() => toggleActive(p)}>
                        <i className={`bi ${Number(p.is_active) ? "bi-pause-circle" : "bi-play-circle"}`} style={{ marginRight: 6 }}></i>
                        {Number(p.is_active) ? "Deactivate" : "Activate"}
                      </button>
                    </ActionMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScrollContainer>
      </div>

      <div className="admin-card">
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Subscriptions</h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>{activeCount} active · latest 200 purchases</p>
        </div>
        <TableScrollContainer>
          <table className="admin-table">
            <thead>
              <tr>
                <th className="col-lg text-left">Member</th>
                <th className="col-md text-left">Plan</th>
                <th className="col-md text-center">Starts</th>
                <th className="col-md text-center">Expires</th>
                <th className="col-sm text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No subscriptions yet.</td></tr>
              )}
              {subs.map((s) => {
                const st = subStatus(s);
                return (
                  <tr key={s.id}>
                    <td className="col-lg text-left">
                      <strong>{s.member_name || `#${s.member_id}`}</strong>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{s.member_email}</div>
                    </td>
                    <td className="col-md text-left">{s.plan_name || "—"}</td>
                    <td className="col-md text-center">{fmtDate(s.starts_at)}</td>
                    <td className="col-md text-center">{fmtDate(s.expires_at)}</td>
                    <td className="col-sm text-center">
                      <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color, textTransform: "capitalize" }}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScrollContainer>
      </div>

      {form && (
        <PlanEditModal form={form} setForm={setForm} errors={errors} saving={saving} onClose={() => setForm(null)} onSave={handleSave} />
      )}
    </>
  );
}
