import Icon from "./Icon.jsx";

const T = {
  bg:     "rgba(24,25,28,0.88)",
  border: "rgba(255,255,255,0.07)",
  card:   "#1c1d21",
  text:   "#e8e9ed",
  sub:    "#8a8d96",
  accent: "#4f7ef7",
  red:    "#f15b5b",
};

export default function Topbar({ isMobile, curTab, userEmail, signOut, setSideOpen, deferredPrompt, installPWA }) {
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday:"long", day:"numeric", month:"long", year:"numeric",
  });

  return (
    <header className="no-print" style={{
      background: T.bg,
      backdropFilter:"blur(12px)",
      WebkitBackdropFilter:"blur(12px)",
      borderBottom:`1px solid ${T.border}`,
      padding: isMobile ? "0 16px" : "0 24px",
      height:64, flexShrink:0,
      display:"flex", alignItems:"center",
      justifyContent:"space-between", gap:12,
      position:"sticky", top:0, zIndex:20,
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
          <span style={{ fontSize:15, fontWeight:800, fontFamily:"'Syne',sans-serif", color:T.text }}>
            Licita<span style={{ color:T.accent }}>Gov</span>
          </span>
        ) : (
          <div>
            <div style={{ fontSize:17, fontWeight:700, fontFamily:"'Syne',sans-serif", color:T.text }}>
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
            background:T.accent, border:"none", borderRadius:6,
            padding:"6px 12px", color:"#f0f0f0", fontSize:11, fontWeight:500,
            cursor:"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", gap:5,
          }}>
            <Icon name="install" size={12} color="#f0f0f0" /> Instalar
          </button>
        )}

        {/* User chip */}
        <div style={{
          display:"flex", alignItems:"center", gap:7,
          background:T.card, border:`1px solid ${T.border}`,
          borderRadius:6, padding:"5px 11px",
        }}>
          <div style={{
            width:22, height:22, background:`${T.accent}20`, borderRadius:"50%",
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
          onMouseEnter={e => { e.currentTarget.style.borderColor=T.red; e.currentTarget.style.color=T.red; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.sub; }}
          style={{
            background:"none", border:`1px solid ${T.border}`,
            borderRadius:6, padding:"5px 9px", color:T.sub,
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
