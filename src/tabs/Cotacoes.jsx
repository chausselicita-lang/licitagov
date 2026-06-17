import { useState } from "react";
import { C, shadow } from "../lib/theme.js";
import { fmtBRL, fmtDate, calcMediana, hoje, uid } from "../lib/utils.js";
import Badge from "../components/Badge.jsx";
import Btn from "../components/Btn.jsx";
import { Input } from "../components/Fields.jsx";
import { Modal, EmptyState } from "../components/UI.jsx";

function StepIndicator({ current }) {
  const steps = ["Identificação", "Fornecedores", "Itens e Preços"];
  return (
    <div style={{ display: "flex", marginBottom: 22, paddingBottom: 18, borderBottom: `1px solid ${C.border}` }}>
      {steps.map((s, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 14,
            background: current > i + 1 ? C.green : current === i + 1 ? C.accent : C.subtle,
            border: `2px solid ${current > i + 1 ? C.green : current === i + 1 ? C.accent : C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: current >= i + 1 ? "#fff" : C.sub,
            transition: "all 0.2s",
          }}>
            {current > i + 1 ? "✓" : i + 1}
          </div>
          <span style={{ fontSize: 11, color: current === i + 1 ? C.accent : C.sub, fontWeight: current === i + 1 ? 600 : 400 }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

function CotacaoDetalhe({ cot, onVoltar }) {
  const total = cot.itens.reduce((acc, it) => {
    const vals = cot.fornecedores.map(f => it.valores[f.id] || 0).filter(v => v > 0);
    return acc + calcMediana(vals) * (parseFloat(it.qtd) || 0);
  }, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <Btn variant="outline" onClick={onVoltar} color={C.sub} size="sm">← Voltar</Btn>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: C.text }}>{cot.numero}</div>
          <div style={{ fontSize: 12, color: C.sub }}>{cot.objeto} · {fmtDate(cot.dataCriacao)}</div>
        </div>
        <Badge label={cot.status} />
      </div>

      {/* Fornecedores */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 14, boxShadow: shadow.card }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.07em" }}>Fornecedores Consultados</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {cot.fornecedores.map((f, i) => (
            <div key={f.id} style={{ background: C.overlay, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>F{i + 1}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.razao}</div>
              <div style={{ fontSize: 12, color: C.sub }}>{f.cnpj}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mapa de preços */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 14, boxShadow: shadow.card }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Mapa de Preços</span>
          <span style={{ fontSize: 12, color: C.sub }}>Mediana — Lei 14.133/2021</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
            <thead>
              <tr style={{ background: C.overlay }}>
                <th style={{ padding: "10px 16px", fontSize: 11, color: C.sub, fontWeight: 600, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.06em" }}>Item</th>
                <th style={{ padding: "10px 16px", fontSize: 11, color: C.sub, fontWeight: 600, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em" }}>Un.</th>
                <th style={{ padding: "10px 16px", fontSize: 11, color: C.sub, fontWeight: 600, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em" }}>Qtd</th>
                {cot.fornecedores.map((f, i) => (
                  <th key={f.id} style={{ padding: "10px 16px", fontSize: 11, color: C.accent, fontWeight: 600, textAlign: "right", textTransform: "uppercase", letterSpacing: "0.06em" }}>F{i + 1}</th>
                ))}
                <th style={{ padding: "10px 16px", fontSize: 11, color: C.gold, fontWeight: 700, textAlign: "right", background: "#FFFBEB", textTransform: "uppercase", letterSpacing: "0.06em" }}>Mediana</th>
                <th style={{ padding: "10px 16px", fontSize: 11, color: C.accent2, fontWeight: 700, textAlign: "right", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Ref.</th>
              </tr>
            </thead>
            <tbody>
              {cot.itens.map(it => {
                const vals    = cot.fornecedores.map(f => it.valores[f.id] || 0).filter(v => v > 0);
                const mediana = calcMediana(vals);
                const qtd     = parseFloat(it.qtd) || 0;
                return (
                  <tr key={it.id} style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.overlay}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: C.text }}>{it.descricao}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: C.sub, textAlign: "center" }}>{it.unidade}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, textAlign: "center", color: C.text }}>{qtd.toLocaleString("pt-BR")}</td>
                    {cot.fornecedores.map(f => {
                      const v = it.valores[f.id] || 0;
                      const isMin = v > 0 && v === Math.min(...vals);
                      return (
                        <td key={f.id} style={{ padding: "12px 16px", fontSize: 13, textAlign: "right", color: isMin ? C.green : C.text, fontWeight: isMin ? 700 : 400 }}>
                          {v > 0 ? fmtBRL(v) : <span style={{ color: C.tertiary }}>—</span>}
                        </td>
                      );
                    })}
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: C.gold, textAlign: "right", background: "#FFFBEB" }}>{fmtBRL(mediana)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: C.accent2, textAlign: "right" }}>{fmtBRL(mediana * qtd)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: C.accentSubtle, borderTop: `2px solid ${C.accentBorder}` }}>
                <td colSpan={3 + cot.fornecedores.length} style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Valor Total de Referência
                </td>
                <td style={{ padding: "12px 16px", fontSize: 15, fontWeight: 700, color: C.accent2, textAlign: "right" }}>{fmtBRL(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <Btn color={C.sub} variant="outline" onClick={() => window.print()}>Imprimir Mapa de Preços</Btn>
      </div>
    </div>
  );
}

export default function Cotacoes({ cotacoes, setCotacoes, toast }) {
  const [modal,    setModal]    = useState(null);
  const [cotAtiva, setCotAtiva] = useState(null);
  const [step,     setStep]     = useState(1);
  const [form, setForm] = useState({ numero:"", objeto:"", processo:"" });
  const [fornecedores, setFornecedores] = useState([{ id:"f1", razao:"", cnpj:"" }, { id:"f2", razao:"", cnpj:"" }, { id:"f3", razao:"", cnpj:"" }]);
  const [itens, setItens] = useState([{ id:"it1", descricao:"", unidade:"", qtd:"", valores:{} }]);

  const set = n => v => setForm(p => ({ ...p, [n]: v }));
  const addForn    = () => setFornecedores(p => [...p, { id: uid(), razao: "", cnpj: "" }]);
  const remForn    = id => setFornecedores(p => p.filter(f => f.id !== id));
  const updForn    = (id, field, val) => setFornecedores(p => p.map(f => f.id === id ? { ...f, [field]: val } : f));
  const addItem    = () => setItens(p => [...p, { id: uid(), descricao: "", unidade: "", qtd: "", valores: {} }]);
  const remItem    = id => setItens(p => p.filter(i => i.id !== id));
  const updItem    = (id, field, val) => setItens(p => p.map(i => i.id === id ? { ...i, [field]: val } : i));
  const updValor   = (itemId, fornId, val) => setItens(p => p.map(i => i.id === itemId ? { ...i, valores: { ...i.valores, [fornId]: parseFloat(val) || 0 } } : i));

  const resetForm = () => {
    setForm({ numero:"", objeto:"", processo:"" });
    setFornecedores([{ id:"f1", razao:"", cnpj:"" }, { id:"f2", razao:"", cnpj:"" }, { id:"f3", razao:"", cnpj:"" }]);
    setItens([{ id:"it1", descricao:"", unidade:"", qtd:"", valores:{} }]);
    setStep(1);
  };

  const salvarCotacao = () => {
    if (!form.numero || !form.objeto) { toast("Número e objeto são obrigatórios", "error"); return; }
    const fornsValidos = fornecedores.filter(f => f.razao.trim());
    if (fornsValidos.length < 2) { toast("Mínimo 2 fornecedores (Lei 14.133)", "error"); return; }
    const itensValidos = itens.filter(i => i.descricao.trim());
    if (!itensValidos.length) { toast("Adicione ao menos 1 item", "error"); return; }
    setCotacoes(p => [{ id: uid(), ...form, status: "Finalizada", dataCriacao: hoje(), fornecedores: fornsValidos, itens: itensValidos }, ...p]);
    setModal(null); resetForm();
    toast("Cotação finalizada — mapa de preços gerado!");
  };

  if (cotAtiva) {
    const cot = cotacoes.find(c => c.id === cotAtiva);
    if (!cot) { setCotAtiva(null); return null; }
    return <CotacaoDetalhe cot={cot} onVoltar={() => setCotAtiva(null)} />;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        <Btn onClick={() => { resetForm(); setModal("nova"); }}>+ Nova Pesquisa de Preços</Btn>
      </div>

      {cotacoes.length === 0 ? (
        <EmptyState icon="cotacoes" title="Nenhuma cotação cadastrada" sub="Crie uma pesquisa de preços conforme Lei 14.133/2021" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cotacoes.map(c => (
            <div key={c.id} onClick={() => setCotAtiva(c.id)}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", cursor: "pointer", boxShadow: shadow.card, transition: "box-shadow 0.14s, border-color 0.14s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = shadow.cardHover; e.currentTarget.style.borderColor = C.borderStrong; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = shadow.card; e.currentTarget.style.borderColor = C.border; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{c.numero}</span>
                    <Badge label={c.status} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 5 }}>{c.objeto}</div>
                  <div style={{ fontSize: 12, color: C.sub }}>
                    {c.fornecedores.length} fornecedores · {c.itens.length} itens · {fmtDate(c.dataCriacao)}
                    {c.processo && ` · Proc. ${c.processo}`}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: C.accent, fontWeight: 500 }}>Ver mapa →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === "nova" && (
        <Modal title={`Nova Pesquisa de Preços — Etapa ${step}/3`} onClose={() => setModal(null)} wide>
          <StepIndicator current={step} />

          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Número da Cotação" value={form.numero} onChange={set("numero")} placeholder="COT 001/2025" required />
                <Input label="Processo vinculado (opcional)" value={form.processo} onChange={set("processo")} placeholder="001/2025" />
              </div>
              <Input label="Objeto da pesquisa de preços" value={form.objeto} onChange={set("objeto")} placeholder="Descreva o objeto" required />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                <Btn onClick={() => { if (!form.numero || !form.objeto) { toast("Preencha os campos", "error"); return; } setStep(2); }}>Próximo →</Btn>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 12, color: C.accent, background: C.accentSubtle, borderRadius: 8, padding: "9px 14px", border: `1px solid ${C.accentBorder}` }}>
                Lei 14.133/2021 recomenda no mínimo 3 fornecedores para pesquisa de preços.
              </div>
              {fornecedores.map((f, i) => (
                <div key={f.id} style={{ background: C.overlay, borderRadius: 8, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-end", border: `1px solid ${C.border}` }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: C.accentSubtle, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{i + 1}</div>
                  <Input style={{ flex: 2 }} label={i === 0 ? "Razão Social" : ""} value={f.razao} onChange={v => updForn(f.id, "razao", v)} placeholder="Razão social / nome" />
                  <Input style={{ flex: 1 }} label={i === 0 ? "CNPJ/CPF" : ""} value={f.cnpj} onChange={v => updForn(f.id, "cnpj", v)} placeholder="00.000.000/0001" />
                  {fornecedores.length > 2 && <Btn variant="outline" color={C.red} size="sm" onClick={() => remForn(f.id)}>✕</Btn>}
                </div>
              ))}
              <Btn variant="outline" color={C.accent} size="sm" onClick={addForn}>+ Adicionar Fornecedor</Btn>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                <Btn variant="outline" color={C.sub} onClick={() => setStep(1)}>← Anterior</Btn>
                <Btn onClick={() => { if (fornecedores.filter(f => f.razao.trim()).length < 2) { toast("Mínimo 2 fornecedores", "error"); return; } setStep(3); }}>Próximo →</Btn>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {itens.map((it, i) => (
                <div key={it.id} style={{ background: C.overlay, borderRadius: 8, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.sub, background: C.subtle, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Item {i + 1}</span>
                    {itens.length > 1 && <Btn variant="outline" color={C.red} size="sm" onClick={() => remItem(it.id)}>✕</Btn>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <Input label="Descrição" value={it.descricao} onChange={v => updItem(it.id, "descricao", v)} placeholder="Descrição completa" />
                    <Input label="Unidade" value={it.unidade} onChange={v => updItem(it.id, "unidade", v)} placeholder="Un, Kg, L..." />
                    <Input label="Quantidade" value={it.qtd} onChange={v => updItem(it.id, "qtd", v)} type="number" placeholder="0" />
                  </div>
                  <div style={{ fontSize: 12, color: C.sub, marginBottom: 8, fontWeight: 500 }}>Preços por fornecedor:</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
                    {fornecedores.filter(f => f.razao.trim()).map((f, fi) => (
                      <Input key={f.id} label={`F${fi + 1}: ${f.razao.split(" ")[0]}`}
                        value={it.valores[f.id] || ""} onChange={v => updValor(it.id, f.id, v)} type="number" placeholder="0,00" />
                    ))}
                  </div>
                  {(() => {
                    const vals = fornecedores.filter(f => f.razao.trim()).map(f => parseFloat(it.valores[f.id]) || 0).filter(v => v > 0);
                    if (!vals.length) return null;
                    const med = calcMediana(vals);
                    return (
                      <div style={{ marginTop: 10, background: C.accentSubtle, borderRadius: 6, padding: "7px 12px", display: "flex", gap: 16, border: `1px solid ${C.accentBorder}` }}>
                        <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>Mediana: {fmtBRL(med)}</span>
                        {parseFloat(it.qtd) > 0 && <span style={{ fontSize: 12, color: C.accent2 }}>Total ref: {fmtBRL(med * parseFloat(it.qtd))}</span>}
                      </div>
                    );
                  })()}
                </div>
              ))}
              <Btn variant="outline" color={C.accent} size="sm" onClick={addItem}>+ Adicionar Item</Btn>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                <Btn variant="outline" color={C.sub} onClick={() => setStep(2)}>← Anterior</Btn>
                <Btn onClick={salvarCotacao} color={C.green}>✓ Finalizar Pesquisa</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
