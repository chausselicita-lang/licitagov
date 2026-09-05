import { useState } from "react";
import Icon from "./Icon.jsx";

const S = {
  bg:      "#161616",
  text:    "#E0E0E0",
  muted:   "#9a9a9a",
  hover:   "#232323",
  active:  "#2a2a2a",
  border:  "rgba(255,122,0,0.15)",
  primary: "#FF7A00",
};

export default function Sidebar({ TABS, tab, setTab, setSideOpen, deferredPrompt, installPWA, prefeitura, municipio, expandableTabId, subItems }) {
  const hasSubNav = t => t.id === expandableTabId && subItems?.length > 0;
  const subNavActive = subItems?.some(s => s.active);
  const [expanded, setExpanded] = useState(subNavActive);
  const prefLabel = prefeitura || "Prefeitura Municipal";
  const subLabel  = municipio  || "Módulo Licitações";
  const initials  = prefLabel.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "PM";

  return (
    <aside style={{
      position:"fixed", left:0, top:0, bottom:0, width:240,
      background: S.bg,
      borderRight:`1px solid ${S.border}`,
      display:"flex", flexDirection:"column", zIndex:30,
      fontFamily:"'Inter',system-ui,sans-serif",
    }}>
      {/* Logo */}
      <div style={{
        height:56, padding:"0 16px",
        borderBottom:`1px solid ${S.border}`,
        display:"flex", alignItems:"center", gap:10, flexShrink:0,
      }}>
        <div style={{
          width:32, height:32, background:"#FF7A00", borderRadius:8,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}>
          <Icon name="dashboard" size={15} color="#121212" />
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:"#E0E0E0", letterSpacing:-0.3 }}>
            GovCore
          </div>
          <div style={{ fontSize:10, color:S.muted, marginTop:1 }}>Lei 14.133 / 2021</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:"12px 8px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>
        <p style={{
          fontSize:10, fontWeight:600, color:S.muted,
          textTransform:"uppercase", letterSpacing:"0.08em",
          padding:"0 10px", marginBottom:6, marginTop:4,
        }}>Gestão</p>
        {TABS.map(t => {
          const active = tab === t.id && !(hasSubNav(t) && subNavActive);
          const isExpandable = hasSubNav(t);
          return (
            <div key={t.id}>
              <button
                onClick={() => {
                  if (isExpandable) {
                    setExpanded(e => !e);
                    if (!subNavActive) { subItems[0].onClick(); setSideOpen && setSideOpen(false); }
                  } else {
                    setTab(t.id); setSideOpen && setSideOpen(false);
                  }
                }}
                onMouseEnter={e => { if (!active && !subNavActive) { e.currentTarget.style.background = S.hover; e.currentTarget.style.color = S.text; } }}
                onMouseLeave={e => { if (!active && !subNavActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = S.muted; } }}
                style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"10px 10px", borderRadius:8, border:"none",
                  borderLeft: (active || subNavActive) ? `3px solid ${S.primary}` : "3px solid transparent",
                  background: (active || subNavActive) ? S.active : "transparent",
                  color: (active || subNavActive) ? S.text : S.muted,
                  fontSize:13, fontWeight: (active || subNavActive) ? 600 : 400,
                  cursor:"pointer", transition:"background 0.12s, color 0.12s",
                  textAlign:"left", width:"100%", fontFamily:"inherit",
                }}
              >
                <Icon
                  name={t.icon}
                  size={15}
                  strokeWidth={(active || subNavActive) ? 2 : 1.6}
                  color={(active || subNavActive) ? S.primary : "currentColor"}
                />
                <span style={{ flex:1 }}>{t.label}</span>
                {t.id === "claude" && (
                  <span style={{
                    background:"rgba(255,122,0,0.15)", color:S.primary,
                    borderRadius:4, padding:"1px 6px", fontSize:9, fontWeight:700,
                  }}>AI</span>
                )}
                {isExpandable && (
                  <span style={{ display:"flex", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition:"transform 0.15s" }}>
                    <Icon name="chevronDown" size={13} strokeWidth={2} color="currentColor" />
                  </span>
                )}
              </button>
              {isExpandable && expanded && (
                <div style={{ display:"flex", flexDirection:"column", gap:2, margin:"2px 0 2px 14px", paddingLeft:12, borderLeft:`1px solid ${S.border}` }}>
                  {subItems.map(s => (
                    <button key={s.id}
                      onClick={() => { s.onClick(); setSideOpen && setSideOpen(false); }}
                      onMouseEnter={e => { if (!s.active) { e.currentTarget.style.background = S.hover; e.currentTarget.style.color = S.text; } }}
                      onMouseLeave={e => { if (!s.active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = S.muted; } }}
                      style={{
                        display:"flex", alignItems:"center", gap:8,
                        padding:"8px 10px", borderRadius:7, border:"none",
                        background: s.active ? "rgba(255,122,0,0.12)" : "transparent",
                        color: s.active ? S.primary : S.muted,
                        fontSize:12.5, fontWeight: s.active ? 600 : 400,
                        cursor:"pointer", transition:"background 0.12s, color 0.12s",
                        textAlign:"left", width:"100%", fontFamily:"inherit",
                      }}
                    >
                      <Icon name={s.icon} size={13} strokeWidth={s.active ? 2 : 1.6} color="currentColor" />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* PWA install */}
      {deferredPrompt && (
        <div style={{ padding:"10px 12px", borderTop:`1px solid ${S.border}` }}>
          <button onClick={installPWA} style={{
            width:"100%", background:"#FF7A00", border:"none", borderRadius:8,
            padding:"9px 12px", color:"#121212", fontSize:12, fontWeight:600,
            cursor:"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          }}>
            <Icon name="install" size={13} color="#121212" /> Instalar App
          </button>
        </div>
      )}

      {/* Footer — prefeitura info */}
      <div style={{ padding:"12px 14px", borderTop:`1px solid ${S.border}`, flexShrink:0, background:"rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:32, height:32, background:"rgba(255,255,255,0.1)", borderRadius:"50%",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:700, color:"#E0E0E0", flexShrink:0,
            border:`1px solid ${S.border}`,
          }}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize:12, fontWeight:500, color:S.text, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prefLabel}</div>
            <div style={{ fontSize:11, color:S.muted }}>{subLabel}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
