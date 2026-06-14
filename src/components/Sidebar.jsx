import Icon from "./Icon.jsx";

const S = {
  bg:       "#111214",
  border:   "rgba(255,255,255,0.06)",
  fg:       "#c5c7cf",
  accent:   "#1c1d21",
  accentFg: "#e8e9ed",
  primary:  "#4f7ef7",
  sub:      "#8a8d96",
};

export default function Sidebar({ TABS, tab, setTab, setSideOpen, deferredPrompt, installPWA }) {
  return (
    <aside style={{
      position:"fixed", left:0, top:0, bottom:0, width:220,
      background: S.bg,
      borderRight:`1px solid ${S.border}`,
      display:"flex", flexDirection:"column", zIndex:30,
    }}>
      {/* Logo */}
      <div style={{
        height:64, padding:"0 16px",
        borderBottom:`1px solid ${S.border}`,
        display:"flex", alignItems:"center", gap:10, flexShrink:0,
      }}>
        <div style={{
          width:32, height:32, background:S.primary, borderRadius:8,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}>
          <Icon name="dashboard" size={15} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, fontFamily:"'Syne',sans-serif", color:S.accentFg, letterSpacing:-0.3 }}>
            GovCore
          </div>
          <div style={{ fontSize:10, color:S.sub, marginTop:1 }}>Lei 14.133 / 2021</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:"12px 8px", display:"flex", flexDirection:"column", gap:1, overflowY:"auto" }}>
        <p style={{
          fontSize:10, fontWeight:600, color:S.sub,
          textTransform:"uppercase", letterSpacing:"0.08em",
          padding:"0 10px", marginBottom:8,
        }}>Gestão</p>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id}
              onClick={() => { setTab(t.id); setSideOpen && setSideOpen(false); }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background=S.accent; e.currentTarget.style.color=S.accentFg; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=S.fg; } }}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"9px 10px", borderRadius:6, border:"none",
                background: active ? S.accent : "transparent",
                color: active ? S.accentFg : S.fg,
                fontSize:13, fontWeight: active ? 600 : 400,
                cursor:"pointer", transition:"background 0.12s, color 0.12s",
                textAlign:"left", width:"100%", fontFamily:"inherit",
              }}
            >
              <Icon
                name={t.icon}
                size={15}
                strokeWidth={active ? 2 : 1.6}
                color={active ? S.primary : "currentColor"}
              />
              <span style={{ flex:1 }}>{t.label}</span>
              {t.id === "claude" && (
                <span style={{
                  background:`${S.primary}22`, color:S.primary,
                  borderRadius:4, padding:"1px 5px", fontSize:9, fontWeight:700,
                }}>AI</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* PWA install */}
      {deferredPrompt && (
        <div style={{ padding:"10px 12px", borderTop:`1px solid ${S.border}` }}>
          <button onClick={installPWA} style={{
            width:"100%", background:S.primary, border:"none", borderRadius:6,
            padding:"9px 12px", color:"#f0f0f0", fontSize:12, fontWeight:500,
            cursor:"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          }}>
            <Icon name="install" size={13} color="#f0f0f0" /> Instalar App
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding:"12px 14px", borderTop:`1px solid ${S.border}`, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:30, height:30, background:S.accent, borderRadius:"50%",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:600, color:S.accentFg, flexShrink:0,
            border:`1px solid ${S.border}`,
          }}>PM</div>
          <div>
            <div style={{ fontSize:12, fontWeight:500, color:S.accentFg, lineHeight:1.3 }}>Prefeitura Municipal</div>
            <div style={{ fontSize:10, color:S.sub }}>Módulo Licitações</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
