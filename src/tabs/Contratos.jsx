import { useState } from "react";
import { C, shadow } from "../lib/theme.js";
import { fmtBRL, fmtDate, diasParaVencer, uid } from "../lib/utils.js";
import Badge from "../components/Badge.jsx";
import Btn from "../components/Btn.jsx";
import { Input, Select, SearchInput } from "../components/Fields.jsx";
import { Modal, EmptyState } from "../components/UI.jsx";

const STATUS_BORDER = {
  "Vigente":  C => C.green,
  "A vencer": C => C.amber,
  "Vencido":  C => C.red,
};

export default function Contratos({ contratos, setContratos, toast }) {
  const [modal,  setModal]  = useState(false);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [form, setForm] = useState({ numero:"", objeto:"", fornecedor:"", cnpj:"", valor:"", inicio:"", fim:"", processo:"" });

  const set = n => v => setForm(p => ({ ...p, [n]: v }));

  const filtered = contratos.filter(c => {
    const ok = filtro === "Todos" || c.status === filtro;
    const s  = search.toLowerCase();
    return ok && (c.numero.toLowerCase().includes(s) || c.objeto.toLowerCase().includes(s) || c.fornecedor.toLowerCase().includes(s));
  }).map(c => {
    const d = diasParaVencer(c.fim);
    let status = c.status;
    if (d !== null && c.status !== "Encerrado") {
      if (d < 0) status = "Vencido";
      else if (d <= 30) status = "A vencer";
      else status = "Vigente";
    }
    return { ...c, status, diasRestantes: d };
  });

  const salvar = () => {
    if (!form.numero || !form.objeto || !form.fornecedor) { toast("Preencha os campos obrigatórios", "error"); return; }
    setContratos(prev => [{ id: uid(), ...form, valor: parseFloat(form.valor) || 0, status: "Vigente" }, ...prev]);
    setModal(false);
    setForm({ numero:"", objeto:"", fornecedor:"", cnpj:"", valor:"", inicio:"", fim:"", processo:"" });
    toast("Contrato cadastrado!");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar contrato..." />
        <Select value={filtro} onChange={setFiltro} options={["Todos","Vigente","A vencer","Encerrado","Vencido"]} />
        <Btn onClick={() => setModal(true)} color={C.green}>+ Novo Contrato</Btn>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="contratos" title="Nenhum contrato encontrado" sub="Cadastre contratos para acompanhar a vigência" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(c => {
            const borderColor = c.status === "A vencer" ? C.amber : c.status === "Vencido" ? C.red : c.status === "Vigente" ? C.green : "transparent";
            return (
              <div key={c.id} style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${borderColor}`,
                borderRadius: 12,
                padding: "16px 20px",
                boxShadow: shadow.card,
                transition: "box-shadow 0.14s",
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = shadow.cardHover}
                onMouseLeave={e => e.currentTarget.style.boxShadow = shadow.card}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{c.numero}</span>
                      <Badge label={c.status} />
                      {c.processo && c.processo !== "—" && (
                        <span style={{ fontSize: 11, color: C.sub }}>Proc. {c.processo}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 5 }}>{c.objeto}</div>
                    <div style={{ fontSize: 12, color: C.sub }}>{c.fornecedor} · CNPJ {c.cnpj}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>
                      {fmtDate(c.inicio)} → {fmtDate(c.fim)}
                      {c.diasRestantes !== null && c.status !== "Encerrado" && (
                        <span style={{ marginLeft: 10, color: c.status === "A vencer" ? C.amber : c.status === "Vencido" ? C.red : C.green, fontWeight: 600 }}>
                          {c.diasRestantes < 0 ? `Venceu há ${Math.abs(c.diasRestantes)}d` : `${c.diasRestantes}d restantes`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{fmtBRL(c.valor)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title="Novo Contrato" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Número do Contrato" value={form.numero} onChange={set("numero")} placeholder="CT 001/2025" required />
              <Input label="Processo (opcional)" value={form.processo} onChange={set("processo")} placeholder="001/2025" />
            </div>
            <Input label="Objeto" value={form.objeto} onChange={set("objeto")} required />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Fornecedor" value={form.fornecedor} onChange={set("fornecedor")} required />
              <Input label="CNPJ" value={form.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0001-00" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Input label="Valor (R$)" value={form.valor} onChange={set("valor")} type="number" />
              <Input label="Início" value={form.inicio} onChange={set("inicio")} type="date" />
              <Input label="Fim" value={form.fim} onChange={set("fim")} type="date" />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
              <Btn variant="outline" onClick={() => setModal(false)} color={C.sub}>Cancelar</Btn>
              <Btn onClick={salvar} color={C.green}>Salvar Contrato</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
