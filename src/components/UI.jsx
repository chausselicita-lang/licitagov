import Icon from "./Icon.jsx";
import { C, shadow } from "../lib/theme.js";

export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "28px 32px",
        width: "100%",
        maxWidth: wide ? 780 : 520,
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: shadow.modal,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "Inter,system-ui,sans-serif", color: C.text }}>{title}</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", padding: 6, borderRadius: 6, display: "flex", alignItems: "center", transition: "background 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.background = C.subtle; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.sub; }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ msg, type }) {
  const map = { error: C.red, warn: C.amber, success: C.green };
  const c = map[type] || C.green;
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 500,
      background: c, color: "#121212", borderRadius: 10,
      padding: "11px 18px", fontSize: 13, fontWeight: 500,
      boxShadow: `0 4px 20px ${c}55`, maxWidth: 320,
      animation: "slideIn 0.22s ease",
    }}>{msg}</div>
  );
}

export function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px" }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: C.subtle,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px", color: C.tertiary,
      }}>
        <Icon name={icon} size={22} strokeWidth={1.4} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.sub }}>{sub}</div>
    </div>
  );
}

export function KpiCard({ label, value, sub, color = C.accent }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderTop: `3px solid ${color}`,
      borderRadius: 12,
      padding: "20px 22px",
      boxShadow: shadow.card,
    }}>
      <div style={{ fontSize: 11, color: C.sub, fontWeight: 500, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: C.text, fontFamily: "Inter,system-ui,sans-serif", lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.tertiary, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

export function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</span>
      {action}
    </div>
  );
}
