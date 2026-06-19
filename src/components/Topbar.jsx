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
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
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
            <div style={{ fontSize:18, fontWeight:700, color:T.text }}>
              {curTab?.label}
            </div>
            <div style={{ fontSize:11, color:T.sub, marginTop:1, textTransform:"capitalize" }}>{today}</div>
          </div>
        )}
      </div>

      {/* Right */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {deferredPrompt && isMobile && (
          <button onClick={installPWA} style={{
            background:T.accent, border:"none", borderRadius:8,
            padding:"6px 12px", color:"#fff", fontSize:11, fontWeight:600,
            cursor:"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", gap:5,
          }}>
            <Icon name="install" size={12} color="#fff" /> Instalar
          </button>
        )}

        {/* User chip */}
        <div style={{
          display:"flex", alignItems:"center", gap:7,
          background:T.subtle, border:`1px solid ${T.border}`,
          borderRadius:8, padding:"6px 12px",
        }}>
          <div style={{
            width:24, height:24, background:"#eff6ff", borderRadius:"50%",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:10, fontWeight:700, color:T.accent, flexShrink:0,
          }}>
            {(userEmail[0] || "U").toUpperCase()}
          </div>
          <span style={{ fontSize:12, color:T.sub }}>
            {isMobile ? userEmail.split("@")[0] : userEmail}
          </span>
        </div>

        {/* Sign out */}
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
          {!isMobile && "Sair"}
        </button>
      </div>
    </header>
  );
}
