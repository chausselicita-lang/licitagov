import { useState, useEffect } from "react";
import { getSupabase } from "../lib/supabase.js";

const C = {
  bg: "#f0f2f5",
  surface: "#ffffff",
  border: "#e4e8ef",
  accent: "#1d4ed8",
  text: "#111827",
  sub: "#6b7280",
  red: "#b91c1c",
};

const fmtBRL = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtDate = d => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

const STATUS_PUBLICOS = ["Publicado", "Homologado"];

const MODALIDADES = ["Todas", "Pregão Eletrônico", "Pregão Presencial", "Concorrência", "Tomada de Preços", "Convite", "Leilão", "Concurso", "Dispensa", "Inexigibilidade"];

function BadgePub({ label }) {
  const map = {
    Publicado: { bg: "#eff6ff", fg: "#1d4ed8" },
    Homologado: { bg: "#f0fdf4", fg: "#15803d" },
  };
  const c = map[label] || { bg: "#f3f4f6", fg: "#6b7280" };
  return (
    <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />{label}
    </span>
  );
}

function ModalProcesso({ p, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "28px 32px", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Processo Licitatório</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{p.numero || "—"}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.sub, fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Row label="Objeto" value={p.objeto} />
          <Row label="Modalidade" value={p.modalidade} />
          <Row label="Status" value={<BadgePub label={p.status} />} />
          <Row label="Valor Estimado" value={p.valor_estimado ? fmtBRL(p.valor_estimado) : "—"} />
          <Row label="Data de Abertura" value={fmtDate(p.data_abertura)} />
          <Row label="Vencedor / Adjudicatário" value={p.adjudicatario || "—"} />
          <Row label="Valor Adjudicado" value={p.valor_adjudicado ? fmtBRL(p.valor_adjudicado) : "—"} />
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button onClick={onClose} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 28px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: C.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: 14, color: C.text }}>{value || "—"}</span>
    </div>
  );
}

export default function Portal() {
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalidade, setModalidade] = useState("Todas");
  const [selected, setSelected] = useState(null);
  const [isMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }
    sb.from("processos")
      .select("id,numero,objeto,modalidade,status,valor_estimado,data_abertura,adjudicatario,valor_adjudicado")
      .in("status", STATUS_PUBLICOS)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setProcessos(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = processos.filter(p => {
    const q = busca.toLowerCase();
    const matchBusca = !q || (p.numero || "").toLowerCase().includes(q) || (p.objeto || "").toLowerCase().includes(q);
    const matchMod = modalidade === "Todas" || p.modalidade === modalidade;
    return matchBusca && matchMod;
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter',system-ui,sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {selected && <ModalProcesso p={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: isMobile ? "0 16px" : "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Gov<span style={{ color: C.accent }}>Core</span></div>
            {!isMobile && <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>Portal de Transparência · Lei 14.133/2021</div>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: "#eff6ff", color: C.accent, borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 700, border: `1px solid ${C.accent}33` }}>
            PORTAL PÚBLICO
          </span>
        </div>
      </header>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%)", padding: isMobile ? "28px 16px" : "40px 32px", color: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, marginBottom: 6 }}>Portal de Transparência de Licitações</div>
          <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 24 }}>Consulte processos licitatórios publicados e homologados conforme a Lei 14.133/2021.</div>

          {/* Search + Filter */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por número ou objeto..."
                style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 8, border: "none", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            <select value={modalidade} onChange={e => setModalidade(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: 8, border: "none", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff", color: C.text, minWidth: 180 }}>
              {MODALIDADES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <main style={{ flex: 1, maxWidth: 1100, width: "100%", margin: "0 auto", padding: isMobile ? "16px" : "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.sub }}>{filtered.length} processo{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.sub, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ width: 28, height: 28, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            Carregando processos...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: C.sub }}>
            <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>Nenhum processo encontrado</div>
            <div style={{ fontSize: 13 }}>Tente ajustar os filtros de busca.</div>
          </div>
        ) : isMobile ? (
          // Mobile cards
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(p => (
              <div key={p.id} onClick={() => setSelected(p)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "box-shadow 0.14s" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{p.numero || "—"}</span>
                  <BadgePub label={p.status} />
                </div>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 4, lineHeight: 1.4 }}>{p.objeto || "—"}</div>
                <div style={{ fontSize: 12, color: C.sub }}>{p.modalidade || "—"} · {p.valor_estimado ? fmtBRL(p.valor_estimado) : "—"}</div>
              </div>
            ))}
          </div>
        ) : (
          // Desktop table
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Número", "Objeto", "Modalidade", "Valor Estimado", "Data Abertura", "Status"].map(h => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} onClick={() => setSelected(p)}
                    style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: i % 2 === 0 ? "#fff" : "#fafbfc", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafbfc"}>
                    <td style={{ padding: "13px 14px", fontWeight: 600, color: C.accent, whiteSpace: "nowrap" }}>{p.numero || "—"}</td>
                    <td style={{ padding: "13px 14px", color: C.text, maxWidth: 320 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.objeto || "—"}</div>
                    </td>
                    <td style={{ padding: "13px 14px", color: C.sub, whiteSpace: "nowrap" }}>{p.modalidade || "—"}</td>
                    <td style={{ padding: "13px 14px", color: C.text, whiteSpace: "nowrap" }}>{p.valor_estimado ? fmtBRL(p.valor_estimado) : "—"}</td>
                    <td style={{ padding: "13px 14px", color: C.sub, whiteSpace: "nowrap" }}>{fmtDate(p.data_abertura)}</td>
                    <td style={{ padding: "13px 14px" }}><BadgePub label={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "18px 32px", textAlign: "center", fontSize: 12, color: C.sub, background: C.surface }}>
        Powered by <strong style={{ color: C.accent }}>GovCore</strong> · Sistema de Gestão de Licitações Públicas · Lei 14.133/2021
      </footer>
    </div>
  );
}
