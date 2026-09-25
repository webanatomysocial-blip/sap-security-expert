import { useState } from "react";

const pad = (n) => String(n).padStart(2, "0");

// 'YYYY-MM-DD HH:MM:SS' (UTC, as stored) | ISO string | Date -> datetime-local value in the viewer's timezone
export const toLocalInput = (v) => {
  if (!v) return "";
  const s = String(v);
  const d = v instanceof Date ? v : new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(" ", "T") + "Z");
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function SchedulePicker({ scheduledAt, onSchedule, disabled }) {
  const [value, setValue] = useState(toLocalInput(scheduledAt));
  const valid = value && new Date(value) > new Date();

  return (
    <div style={{ marginBottom: 24 }}>
      <label className="form-label" style={{ fontWeight: 600 }}>
        <i className="bi bi-calendar-event" style={{ marginRight: 6 }}></i>
        Schedule publish
      </label>
      <input
        type="datetime-local"
        className="form-control"
        value={value}
        min={toLocalInput(new Date())}
        onChange={(e) => setValue(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <button
        type="button"
        className="btn-secondary btn-full"
        disabled={disabled || !valid}
        onClick={() => onSchedule(new Date(value).toISOString())}
        style={{ padding: "12px", fontWeight: 600, opacity: disabled || !valid ? 0.6 : 1 }}
      >
        <i className="bi bi-clock" style={{ marginRight: 8 }}></i>
        Schedule
      </button>
      <small style={{ display: "block", marginTop: 6, color: "#64748b" }}>
        Goes live automatically at the chosen time ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
      </small>
    </div>
  );
}
