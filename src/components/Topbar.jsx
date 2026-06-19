import Icon from "./Icon.jsx";

const T = {
  bg:     "#ffffff",
  border: "#e4e8ef",
  text:   "#111827",
  sub:    "#6b7280",
  accent: "#1d4ed8",
  red:    "#b91c1c",
  subtle: "#f8fafc",
};

export default function Topbar({ isMobile, curTab, userEmail, signOut, setSideOpen, deferredPrompt, installPWA }) {
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday:"long", day:"numeric", month:"long", year:"numeric",
  });

  const initial = (userEmail?.[0] || "U").toUpperCase();
  const shortName = userEmail?.split("@")[0] || "Usuário";

  return (
    <header className="no-print" style={{
      background: T.bg,
      borderBottom:`1px solid ${T.border}`,
      padding: isMobile ? "0 16px" : "0 24px",
      height:56, flexShrink:0,
      display:"flex", alignItems:"center",
      justifyContent:"space-between", gap:12,
      position:"sticky", top:0, zIndex:20,
      fontFamily:"'Inter',system-ui,sans-serif",
    }}>
      {/* Left */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {isMobile && (
          <button
            onClick={() => setSideOpen(s => !s)}
            style={{ background:"none", border:"none", color:T.sub, cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}
          >
            <Icon name="menu" size={20} color={T.sub} />
          </button>
        )}
        {isMobile ? (
          <span style={{ fontSize:16, fontWeight:800, color:T.accent }}>
            Gov<span style={{ color:T.text }}>Core</span>
          </span>
        ) : (
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:T.text }}>{curTab?.label}</div>
            <div style={{ fontSize:11, color:T.sub, marginTop:1, textTransform:"capitalize" }}>{today}</div>
          </div>
        )}
      </div>

      {/* Right */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {deferredPrompt && isMobile && (
          <button onClick={installPWA} style={{
            background:T.accent, border:"none", borderRadius:8,
            padding:"6px 10px", color:"#fff", fontSize:11, fontWeight:600,
            cursor:"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", gap:5,
          }}>
            <Icon name="install" size={12} color="#fff" />
          </button>
        )}

        {/* Avatar */}
        <div style={{
          display:"flex", alignItems:"center", gap:8,
          background: T.subtle, border:`1px solid ${T.border}`,
          borderRadius:8, padding: isMobile ? "5px 8px" : "5px 12px",
        }}>
          <div style={{
            width:28, height:28, background:T.accent, borderRadius:"50%",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:12, fontWeight:700, color:"#fff", flexShrink:0,
          }}>
            {initial}
          </div>
          {!isMobile && (
            <span style={{ fontSize:13, fontWeight:500, color:T.text }}>
              {shortName}
            </span>
          )}
        </div>

        {/* Sign out — desktop only */}
        {!isMobile && (
          <button onClick={signOut} title="Sair do sistema"
            onMouseEnter={e => { e.currentTarget.style.borderColor="#fca5a5"; e.currentTarget.style.color=T.red; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.sub; }}
            style={{
              background:"none", border:`1px solid ${T.border}`,
              borderRadius:8, padding:"6px 10px", color:T.sub,
              cursor:"pointer", display:"flex", alignItems:"center", gap:5,
              fontSize:12, fontFamily:"inherit", transition:"all 0.12s",
            }}>
            <Icon name="logout" size={13} color="currentColor" />
            Sair
          </button>
        )}
      </div>
    </header>
  );
}
