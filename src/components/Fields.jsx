import { C } from "../lib/theme.js";

const inputBase = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "9px 12px",
  color: C.text,
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.14s, box-shadow 0.14s",
};

const focusStyle = e => {
  e.target.style.borderColor = C.accent;
  e.target.style.boxShadow = `0 0 0 3px ${C.accentSubtle}`;
};
const blurStyle = e => {
  e.target.style.borderColor = C.border;
  e.target.style.boxShadow = "none";
};

export function Input({ label, value, onChange, type = "text", placeholder = "", required = false, style: sx = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...sx }}>
      {label && (
        <label style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>
          {label}{required && <span style={{ color: C.red }}> *</span>}
        </label>
      )}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        style={inputBase}
        onFocus={focusStyle}
        onBlur={blurStyle}
      />
    </div>
  );
}

export function Select({ label, value, onChange, options, style: sx = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...sx }}>
      {label && <label style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputBase, cursor: "pointer" }}
        onFocus={focusStyle}
        onBlur={blurStyle}
      >
        {options.map(o => (
          <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
        ))}
      </select>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Buscar..." }) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 150 }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputBase, paddingLeft: 36 }}
        onFocus={focusStyle}
        onBlur={blurStyle}
      />
      <svg
        viewBox="0 0 24 24" fill="none" stroke={C.tertiary} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
        width={14} height={14}
        style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
      >
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    </div>
  );
}
