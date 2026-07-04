import { useState, useEffect } from "react";
import { getSupabase } from "../lib/supabase.js";
import { useOverlayBack } from "../lib/useOverlayBack.js";

const C = {
  bg: "#f5f5f5",
  surface: "#ffffff",
  border: "#e4e8ef",
  borderStrong: "#cbd5e1",
  accent: "#FF7A00",
  accentSubtle: "#fff1e6",
  text: "#111827",
  sub: "#6b7280",
  red: "#b91c1c",
  green: "#15803d",
  gold: "#b45309",
  sidebar: "#161616",
  sideText: "#E0E0E0",
  sideMuted: "#9a9a9a",
  sideActive: "#2a2a2a",
  sideHover: "#232323",
  sideBorder: "rgba(255,122,0,0.15)",
  sidePrimary: "#FF7A00",
};

const fmtDate = d => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

function Icon({ name, size = 16, color = "currentColor" }) {
  const icons = {
    dashboard: <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></>,
    buildings: <><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/><rect x="10" y="10" width="4" height="4"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    block: <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    close:    <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
    orgaos:   <><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></>,
    trash:    <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
    edit:     <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {icons[name] || null}
    </svg>
  );
}

function Toast({ msg, type }) {
  const bg = type === "error" ? C.red : type === "warn" ? C.gold : C.green;
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: bg, color: "#fff", borderRadius: 8, padding: "11px 18px", fontSize: 13, fontWeight: 500, boxShadow: `0 4px 16px ${bg}44`, maxWidth: 340, animation: "slideIn 0.22s ease" }}>
      {msg}
    </div>
  );
}

function KPICard({ label, value, color = C.accent, icon }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: C.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <div style={{ width: 34, height: 34, background: `${color}15`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={16} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useOverlayBack(true, onClose);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 12, padding: "28px 32px", width: "100%", maxWidth: 480, boxShadow: "0 20px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", padding: 4, borderRadius: 4 }}>
            <Icon name="close" size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Inp({ label, value, onChange, type = "text", placeholder = "", required = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>{label}{required && <span style={{ color: C.red }}> *</span>}</label>}
      <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 11px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }}
        onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accentSubtle}`; }}
        onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
      />
    </div>
  );
}

function ModalAddPrefeitura({ onClose, onSuccess, session }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [prefNome, setPrefNome] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const criar = async () => {
    if (!email || !senha || !prefNome) { setErr("Email, senha e nome da prefeitura são obrigatórios."); return; }
    if (senha.length < 6) { setErr("A senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true); setErr("");
    try {
      const token = session?.access_token;
      const res = await fetch("/api/admin-create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ email, password: senha, nome, prefeitura_nome: prefNome, prefeitura_municipio: municipio }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar usuário");
      onSuccess();
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Nova Prefeitura / Cliente" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Inp label="Nome da Prefeitura" value={prefNome} onChange={setPrefNome} placeholder="Prefeitura Municipal de..." required />
        <Inp label="Município / UF" value={municipio} onChange={setMunicipio} placeholder="ex: Palmas/TO" />
        <Inp label="Nome do Responsável" value={nome} onChange={setNome} placeholder="Nome do administrador" />
        <Inp label="E-mail de acesso" value={email} onChange={setEmail} type="email" placeholder="admin@prefeitura.gov.br" required />
        <Inp label="Senha provisória" value={senha} onChange={setSenha} type="password" placeholder="Mínimo 6 caracteres" required />
        {err && <div style={{ fontSize: 12, color: C.red, background: "rgba(220,38,38,0.06)", padding: "8px 12px", borderRadius: 6 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: C.sub }}>Cancelar</button>
          <button onClick={criar} disabled={loading}
            style={{ background: C.accent, color: "#121212", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit" }}>
            {loading ? "Criando..." : "Criar Prefeitura"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminPanel({ signOut, onImpersonate, session }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [prefeituras, setPrefeituras] = useState([]);
  const [metrics, setMetrics] = useState({ processos: 0, usuarios: 0 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);
  const [isMobile] = useState(() => window.innerWidth < 768);

  const showMsg = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }
    setLoading(true);
    try {
      const [profRes, procRes] = await Promise.all([
        sb.from("user_profiles").select("*").neq("role", "super_admin").order("created_at", { ascending: false }),
        sb.from("processos").select("id", { count: "exact", head: true }),
      ]);
      setPrefeituras(profRes.data || []);
      setMetrics({
        processos: procRes.count || 0,
        usuarios: (profRes.data || []).length,
      });
    } catch (e) {
      showMsg("Erro ao carregar dados: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const toggleAtivo = async (id, ativo) => {
    const sb = getSupabase();
    const { error } = await sb.from("user_profiles").update({ ativo: !ativo }).eq("id", id);
    if (error) { showMsg("Erro ao atualizar: " + error.message, "error"); return; }
    showMsg(ativo ? "Prefeitura bloqueada" : "Prefeitura reativada");
    loadData();
  };

  const ADMIN_TABS = [
    { id: "dashboard",    label: "Dashboard",    icon: "dashboard" },
    { id: "prefeituras",  label: "Prefeituras",  icon: "buildings" },
    { id: "orgaos",       label: "Órgãos",       icon: "orgaos" },
    { id: "configuracoes",label: "Configurações", icon: "settings" },
  ];

  return (
    <div style={{ minHeight: "100vh", height: "100vh", display: "flex", overflow: "hidden", fontFamily: "'Inter',system-ui,sans-serif", background: C.bg }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {showAdd && <ModalAddPrefeitura session={session} onClose={() => setShowAdd(false)} onSuccess={() => { showMsg("Prefeitura criada com sucesso!"); loadData(); }} />}

      {/* Sidebar */}
      {!isMobile && (
        <aside style={{ width: 240, background: C.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, borderRight: `1px solid ${C.sideBorder}` }}>
          {/* Logo */}
          <div style={{ height: 56, padding: "0 16px", borderBottom: `1px solid ${C.sideBorder}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: C.red, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>GovCore</div>
              <div style={{ fontSize: 9, color: C.red, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 1 }}>SUPER ADMIN</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: C.sideMuted, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 10px", marginBottom: 6, marginTop: 4 }}>Administração</p>
            {ADMIN_TABS.map(t => {
              const active = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.sideHover; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 8, border: "none", borderLeft: active ? `3px solid ${C.sidePrimary}` : "3px solid transparent", background: active ? C.sideActive : "transparent", color: active ? C.sideText : C.sideMuted, fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%", transition: "background 0.12s" }}>
                  <Icon name={t.icon} size={15} color={active ? C.sidePrimary : "currentColor"} />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.sideBorder}`, background: "rgba(0,0,0,0.15)" }}>
            <button onClick={signOut}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", color: C.sideMuted, cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "4px 0", transition: "opacity 0.12s" }}>
              <Icon name="logout" size={13} color="currentColor" />
              Sair do sistema
            </button>
          </div>
        </aside>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, height: 56, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isMobile && <span style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>Gov<span style={{ color: C.text }}>Core</span></span>}
            {!isMobile && <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{ADMIN_TABS.find(t => t.id === activeTab)?.label}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => window.open("/portal", "_blank")}
              onMouseEnter={e => { e.currentTarget.style.background = C.accentSubtle; e.currentTarget.style.borderColor = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; }}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", color: C.accent, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, fontFamily: "inherit", transition: "all 0.12s" }}>
              <Icon name="external" size={13} color={C.accent} />
              {!isMobile && "Ver Portal"}
            </button>
            <span style={{ background: C.red, color: "#fff", borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              SUPER ADMIN
            </span>
            <div style={{ width: 32, height: 32, background: C.red, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>C</div>
            {!isMobile && (
              <button onClick={signOut}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#fca5a5"; e.currentTarget.style.color = C.red; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.sub; }}
                style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontFamily: "inherit", transition: "all 0.12s" }}>
                <Icon name="logout" size={13} color="currentColor" />
                Sair
              </button>
            )}
          </div>
        </header>

        {/* Mobile tabs */}
        {isMobile && (
          <div style={{ display: "flex", background: C.sidebar, borderBottom: `1px solid ${C.sideBorder}` }}>
            {ADMIN_TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ flex: 1, padding: "10px 6px", border: "none", background: activeTab === t.id ? C.sideActive : "transparent", color: activeTab === t.id ? "#fff" : C.sideMuted, fontSize: 11, fontWeight: activeTab === t.id ? 700 : 400, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <Icon name={t.icon} size={16} color="currentColor" />
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px" : "28px" }}>
          {activeTab === "dashboard" && (
            <TabDashboardAdmin prefeituras={prefeituras} metrics={metrics} loading={loading} onAddPrefeitura={() => setShowAdd(true)} onImpersonate={onImpersonate} onToggleAtivo={toggleAtivo} />
          )}
          {activeTab === "prefeituras" && (
            <TabPrefeituras prefeituras={prefeituras} loading={loading} onAdd={() => setShowAdd(true)} onImpersonate={onImpersonate} onToggleAtivo={toggleAtivo} />
          )}
          {activeTab === "orgaos" && (
            <TabOrgaosAdmin showMsg={showMsg} />
          )}
          {activeTab === "configuracoes" && (
            <TabConfiguracoes />
          )}
        </div>
      </div>
    </div>
  );
}

function TabDashboardAdmin({ prefeituras, metrics, loading, onAddPrefeitura, onImpersonate, onToggleAtivo }) {
  const ativas = prefeituras.filter(p => p.ativo !== false).length;
  const bloqueadas = prefeituras.length - ativas;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1100 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>Visão Geral do Sistema</div>
        <div style={{ fontSize: 13, color: C.sub }}>Gerencie todas as prefeituras e monitore o uso da plataforma.</div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
        <KPICard label="Prefeituras" value={loading ? "—" : prefeituras.length} icon="buildings" color={C.accent} />
        <KPICard label="Ativas" value={loading ? "—" : ativas} icon="check" color={C.green} />
        <KPICard label="Bloqueadas" value={loading ? "—" : bloqueadas} icon="block" color={C.red} />
        <KPICard label="Processos" value={loading ? "—" : metrics.processos} icon="file" color={C.gold} />
      </div>

      {/* Quick add */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onAddPrefeitura}
          style={{ background: C.accent, color: "#121212", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="plus" size={14} color="#121212" />
          Adicionar Prefeitura
        </button>
      </div>

      {/* Recent prefeituras */}
      <PrefeiturасTable prefeituras={prefeituras.slice(0, 5)} loading={loading} onImpersonate={onImpersonate} onToggleAtivo={onToggleAtivo} title="Prefeituras Recentes" />
    </div>
  );
}

function TabPrefeituras({ prefeituras, loading, onAdd, onImpersonate, onToggleAtivo }) {
  const [busca, setBusca] = useState("");
  const filtered = prefeituras.filter(p =>
    !busca || (p.prefeitura_nome || "").toLowerCase().includes(busca.toLowerCase()) || (p.prefeitura_municipio || "").toLowerCase().includes(busca.toLowerCase())
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Prefeituras Cadastradas</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar prefeitura..."
              style={{ padding: "8px 12px 8px 32px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", background: C.surface, color: C.text, width: 220 }} />
          </div>
          <button onClick={onAdd}
            style={{ background: C.accent, color: "#121212", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="plus" size={13} color="#121212" />
            Nova Prefeitura
          </button>
        </div>
      </div>
      <PrefeiturасTable prefeituras={filtered} loading={loading} onImpersonate={onImpersonate} onToggleAtivo={onToggleAtivo} />
    </div>
  );
}

function PrefeiturасTable({ prefeituras, loading, onImpersonate, onToggleAtivo, title }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {title && (
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 700, color: C.text }}>
          {title}
        </div>
      )}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: C.sub, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 24, height: 24, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          Carregando...
        </div>
      ) : prefeituras.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", color: C.sub }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Nenhuma prefeitura cadastrada</div>
          <div style={{ fontSize: 13 }}>Clique em "Nova Prefeitura" para começar.</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Prefeitura", "Município", "Responsável", "Email", "Status", "Criada em", "Ações"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prefeituras.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 600, color: C.text }}>{p.prefeitura_nome || "—"}</td>
                  <td style={{ padding: "12px 14px", color: C.sub }}>{p.prefeitura_municipio || "—"}</td>
                  <td style={{ padding: "12px 14px", color: C.text }}>{p.nome || "—"}</td>
                  <td style={{ padding: "12px 14px", color: C.sub, fontSize: 12 }}>{p.email}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ background: p.ativo !== false ? "#f0fdf4" : "#fef2f2", color: p.ativo !== false ? C.green : C.red, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                      {p.ativo !== false ? "Ativa" : "Bloqueada"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", color: C.sub, fontSize: 12 }}>{fmtDate(p.created_at)}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => onImpersonate(p)} title="Acessar como esta prefeitura"
                        style={{ background: "#fff1e6", border: "none", borderRadius: 6, padding: "5px 10px", color: C.accent, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                        <Icon name="eye" size={12} color={C.accent} />
                        Acessar como
                      </button>
                      <button onClick={() => onToggleAtivo(p.id, p.ativo !== false)} title={p.ativo !== false ? "Bloquear" : "Reativar"}
                        style={{ background: p.ativo !== false ? "#fef2f2" : "#f0fdf4", border: "none", borderRadius: 6, padding: "5px 10px", color: p.ativo !== false ? C.red : C.green, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                        <Icon name={p.ativo !== false ? "block" : "check"} size={12} color="currentColor" />
                        {p.ativo !== false ? "Bloquear" : "Reativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const ORGAO_EMPTY = { nome: "", responsavel: "", email: "", telefone: "" };

function TabOrgaosAdmin({ showMsg }) {
  const [orgaos, setOrgaos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "add" | {id,...}
  const [form, setForm] = useState(ORGAO_EMPTY);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");

  const load = async () => {
    const sb = getSupabase();
    setLoading(true);
    const { data } = await sb.from("orgaos").select("*").order("nome");
    setOrgaos(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(ORGAO_EMPTY); setModal("add"); };
  const openEdit = o => { setForm({ nome: o.nome || "", responsavel: o.responsavel || "", email: o.email || "", telefone: o.telefone || "" }); setModal(o); };
  const closeModal = () => setModal(null);

  const save = async () => {
    if (!form.nome.trim()) { showMsg("Nome do órgão é obrigatório.", "error"); return; }
    setSaving(true);
    const sb = getSupabase();
    let err;
    if (modal === "add") {
      ({ error: err } = await sb.from("orgaos").insert([{ nome: form.nome.trim(), responsavel: form.responsavel, email: form.email, telefone: form.telefone }]));
    } else {
      ({ error: err } = await sb.from("orgaos").update({ nome: form.nome.trim(), responsavel: form.responsavel, email: form.email, telefone: form.telefone }).eq("id", modal.id));
    }
    setSaving(false);
    if (err) { showMsg("Erro: " + err.message, "error"); return; }
    showMsg(modal === "add" ? "Órgão criado!" : "Órgão atualizado!");
    closeModal();
    load();
  };

  const del = async id => {
    if (!window.confirm("Excluir este órgão?")) return;
    const sb = getSupabase();
    const { error } = await sb.from("orgaos").delete().eq("id", id);
    if (error) { showMsg("Erro: " + error.message, "error"); return; }
    showMsg("Órgão excluído.");
    load();
  };

  const filtered = orgaos.filter(o => !busca || (o.nome || "").toLowerCase().includes(busca.toLowerCase()) || (o.responsavel || "").toLowerCase().includes(busca.toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
      {modal && (
        <Modal title={modal === "add" ? "Novo Órgão" : "Editar Órgão"} onClose={closeModal}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Inp label="Nome do Órgão / Secretaria" value={form.nome} onChange={v => setForm(f => ({ ...f, nome: v }))} placeholder="Secretaria Municipal de..." required />
            <Inp label="Responsável" value={form.responsavel} onChange={v => setForm(f => ({ ...f, responsavel: v }))} placeholder="Nome do secretário" />
            <Inp label="E-mail" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" placeholder="secretaria@prefeitura.gov.br" />
            <Inp label="Telefone" value={form.telefone} onChange={v => setForm(f => ({ ...f, telefone: v }))} placeholder="(00) 00000-0000" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button onClick={closeModal} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: C.sub }}>Cancelar</button>
              <button onClick={save} disabled={saving}
                style={{ background: C.accent, color: "#121212", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "inherit" }}>
                {saving ? "Salvando..." : modal === "add" ? "Criar Órgão" : "Salvar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 2 }}>Órgãos e Secretarias</div>
          <div style={{ fontSize: 13, color: C.sub }}>Unidades que aparecem no Portal de Transparência.</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
              style={{ padding: "8px 12px 8px 32px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", background: C.surface, color: C.text, width: 200 }} />
          </div>
          <button onClick={openAdd}
            style={{ background: C.accent, color: "#121212", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="plus" size={13} color="#121212" />
            Novo Órgão
          </button>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px", color: C.sub, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div style={{ width: 22, height: 22, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 24px", color: C.sub }}>
            <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.2 }}>🏛️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Nenhum órgão cadastrado</div>
            <div style={{ fontSize: 13 }}>Clique em "Novo Órgão" para adicionar.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Órgão / Secretaria", "Responsável", "E-mail", "Telefone", "Ações"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: C.text }}>{o.nome || "—"}</td>
                    <td style={{ padding: "12px 14px", color: C.sub }}>{o.responsavel || "—"}</td>
                    <td style={{ padding: "12px 14px", color: C.sub, fontSize: 12 }}>{o.email || "—"}</td>
                    <td style={{ padding: "12px 14px", color: C.sub, fontSize: 12 }}>{o.telefone || "—"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(o)}
                          style={{ background: C.accentSubtle, border: "none", borderRadius: 6, padding: "5px 10px", color: C.accent, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                          <Icon name="edit" size={12} color={C.accent} />
                          Editar
                        </button>
                        <button onClick={() => del(o.id)}
                          style={{ background: "#fef2f2", border: "none", borderRadius: 6, padding: "5px 10px", color: C.red, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                          <Icon name="trash" size={12} color={C.red} />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TabConfiguracoes() {
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>Configurações</div>
      <div style={{ fontSize: 13, color: C.sub, marginBottom: 24 }}>Configurações globais do sistema GovCore.</div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <ConfigItem label="Versão do Sistema" value="1.0.0 — GovCore RBAC" />
          <ConfigItem label="Supabase Project" value="xqlrfsrjvqmucchzpapk" />
          <ConfigItem label="Portal de Transparência" value={<a href="/portal" target="_blank" style={{ color: C.accent, textDecoration: "none", fontSize: 13 }}>/portal →</a>} />
          <ConfigItem label="Lei de Referência" value="Lei 14.133/2021 (Nova Lei de Licitações)" />
        </div>
      </div>
    </div>
  );
}

function ConfigItem({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, paddingBottom: 14 }}>
      <span style={{ fontSize: 13, color: C.sub, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
