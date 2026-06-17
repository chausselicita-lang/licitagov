import { useState } from "react";
import { C, shadow } from "../lib/theme.js";
import { fmtBRL, fmtDate, uid } from "../lib/utils.js";
import Badge from "../components/Badge.jsx";
import Btn from "../components/Btn.jsx";
import { Input, Select, SearchInput } from "../components/Fields.jsx";
import { Modal, EmptyState } from "../components/UI.jsx";

const MODALIDADES = [
  "Pregão Eletrônico","Pregão Presencial","Concorrência Eletrônica",
  "Concorrência Presencial","Concorrência","Concurso","Leilão","Diálogo Competitivo",
];
const EXCLUIR_MODALIDADES = new Set(["Dispensa","Dispensa de Licitação","Inexigibilidade","Inexigibilidade de Licitação"]);
const FASES = ["Todos","Planejamento","Publicado","Em andamento","Homologado","Revogado","Suspenso"];

export default function Processos({ processos, setProcessos, toast }) {
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroFase, setFiltroFase] = useState("Todos");
  const [form, setForm] = useState({ numero:"", objeto:"", modalidade:"Pregão Eletrônico", fase:"Planejamento", valor:"", abertura:"", orgao:"" });

  const f = v => n => setForm(p => ({ ...p, [n]: v }));
  const set = n => v => setForm(p => ({ ...p, [n]: v }));

  const filtered = processos.filter(p => {
    if (EXCLUIR_MODALIDADES.has(p.modalidade)) return false;
    const ok = filtroFase === "Todos" || p.fase === filtroFase;
    const s = search.toLowerCase();
    return ok && (p.numero.toLowerCase().includes(s) || p.objeto.toLowerCase().includes(s) || (p.orgao||"").toLowerCase().includes(s));
  });

  const salvar = () => {
    if (!form.numero || !form.objeto) { toast("Número e objeto são obrigatórios", "error"); return; }
    setProcessos(prev => [{ id: uid(), ...form, valor: parseFloat(form.valor) || 0 }, ...prev]);
    setModal(false);
    setForm({ numero:"", objeto:"", modalidade:"Pregão Eletrônico", fase:"Planejamento", valor:"", abertura:"", orgao:"" });
    toast("Processo cadastrado com sucesso!");
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar processo..." />
        <Select value={filtroFase} onChange={setFiltroFase} options={FASES} />
        <Btn onClick={() => setModal(true)}>+ Novo Processo</Btn>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon="processos" title="Nenhum processo encontrado" sub="Cadastre um novo processo para começar" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(p => (
            <div key={p.id} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "16px 20px", boxShadow: shadow.card,
              transition: "box-shadow 0.14s, border-color 0.14s",
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = shadow.cardHover; e.currentTarget.style.borderColor = C.borderStrong; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = shadow.card; e.currentTarget.style.borderColor = C.border; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: "0.02em" }}>{p.numero}</span>
                    <Badge label={p.fase} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6, lineHeight: 1.4 }}>{p.objeto}</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: C.sub }}>{p.modalidade}</span>
                    <span style={{ fontSize: 12, color: C.sub }}>{p.orgao}</span>
                    {p.abertura && <span style={{ fontSize: 12, color: C.tertiary }}>Abertura: {fmtDate(p.abertura)}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{fmtBRL(p.valor)}</div>
                  <div style={{ fontSize: 11, color: C.tertiary, marginTop: 2 }}>Valor estimado</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title="Novo Processo Licitatório" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Número" value={form.numero} onChange={set("numero")} placeholder="001/2025" required />
              <Select label="Modalidade" value={form.modalidade} onChange={set("modalidade")} options={MODALIDADES} />
            </div>
            <Input label="Objeto" value={form.objeto} onChange={set("objeto")} placeholder="Descreva o objeto da licitação" required />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Órgão / Setor" value={form.orgao} onChange={set("orgao")} placeholder="Secretaria..." />
              <Select label="Fase" value={form.fase} onChange={set("fase")} options={FASES.slice(1)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Valor Estimado (R$)" value={form.valor} onChange={set("valor")} type="number" placeholder="0,00" />
              <Input label="Data de Abertura" value={form.abertura} onChange={set("abertura")} type="date" />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6, justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setModal(false)} color={C.sub}>Cancelar</Btn>
              <Btn onClick={salvar}>Salvar Processo</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
