import { useState } from "react";
import { C } from "../lib/theme.js";

export default function Btn({
  children, onClick, color = C.accent, variant = "solid",
  size = "md", disabled = false, style: sx = {},
}) {
  const [hov, setHov] = useState(false);
  const pad = size === "sm" ? "5px 12px" : size === "lg" ? "11px 28px" : "8px 16px";
  const fs  = size === "sm" ? 12 : size === "lg" ? 14 : 13;

  const solidBg   = hov ? (color === C.accent ? C.accentHover : color + "dd") : color;
  const outlineBg = hov ? C.subtle : "transparent";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: variant === "solid" ? solidBg : outlineBg,
        color:      variant === "solid" ? "#121212" : color,
        border:     variant === "solid" ? "none" : `1px solid ${hov ? C.borderStrong : C.border}`,
        borderRadius: 8,
        padding: pad,
        fontSize: fs,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "all 0.13s",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
        letterSpacing: "0.01em",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...sx,
      }}
    >
      {children}
    </button>
  );
}
