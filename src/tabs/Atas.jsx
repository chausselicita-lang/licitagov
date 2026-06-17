import { useState } from "react";
import { C, shadow } from "../lib/theme.js";
import { fmtBRL, fmtDate, diasParaVencer, uid } from "../lib/utils.js";
import Badge from "../components/Badge.jsx";
import Btn from "../components/Btn.jsx";
import { Input } from "../components/Fields.jsx";
import { Modal, EmptyState, KpiCard } from "../components/UI.jsx";

function AtaDetalhe({ ata, onVoltar }) {
  const pctUsado = ((ata.valorTotal - ata.saldoDisponivel) / ata.valorTotal * 100).toFixed(1);
  const dias = diasParaVencer(ata.vigencia);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <Btn variant="outline" onClick={onVoltar} color={C.sub} size="sm">← Voltar</Btn>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: C.text }}>{ata.numero}</div>
          <div style={{ fontSize: 12, color: C.sub }}>{ata.objeto}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: 14, marginBottom: 20 }}>
        <KpiCard label="Fornecedor" value={ata.fornecedor.split(" ").slice(0, 2).join(" ")} color={C.accent} />
        <KpiCard label="Valor Total" value={fmtBRL(ata.valorTotal)} color={C.accent2} />
        <KpiCard label="Saldo Disponível" value={fmtBRL(ata.saldoDisponivel)} sub={`${(100 - parseFloat(pctUsado)).toFixed(1)}% disponível`} color={C.green} />
        <KpiCard label="Vigência" value={fmtDate(ata.vigencia)} sub={dias !== null ? `${dias} dias` : "—"} color={dias !== null && dias < 30 ? C.red : C.amber} />
      </div>

      {/* Barra de utilização */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 16, boxShadow: shadow.card }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>Utilização da Ata</span>
          <span style={{ fontSize: 13, color: C.accent, fontWeight: 700 }}>{pctUsado}% utilizado</span>
        </div>
        <div style={{ background: C.subtle, borderRadius: 4, height: 6, overflow: "hidden" }}>
          <div style={{ width: `${pctUsado}%`, height: "100%", background: C.accent, borderRadius: 4, transition: "width 0.6s" }} />
        </div>
      </div>

      {/* Tabela de itens */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", boxShadow: shadow.card }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, color: C.text }}>
          Itens da Ata
        </div>
        {!ata.itens?.length ? (
          <EmptyState icon="atas" title="Sem itens cadastrados" sub="" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr style={{ background: C.overlay }}>
                  {["Descrição","Unidade","Qtd Reg.","Qtd Util.","Vlr Unit.","Saldo"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: C.sub, fontWeight: 600, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ata.itens.map(it => {
                  const saldo = it.qtdRegistrada - it.qtdUtilizada;
                  const pct   = (it.qtdUtilizada / it.qtdRegistrada * 100).toFixed(0);
                  return (
                    <tr key={it.id} style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.overlay}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: C.text }}>{it.descricao}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: C.sub }}>{it.unidade}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: C.text }}>{it.qtdRegistrada.toLocaleString("pt-BR")}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: C.gold }}>
                        {it.qtdUtilizada.toLocaleString("pt-BR")} <span style={{ fontSize: 11, color: C.sub }}>({pct}%)</span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: C.accent2, fontWeight: 500 }}>{fmtBRL(it.valorUnit)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: saldo < it.qtdRegistrada * 0.1 ? C.red : C.green, fontWeight: 600 }}>
                        {saldo.toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Atas({ atas, setAtas, toast }) {
  const [modal,    setModal]    = useState(false);
  const [ataAtiva, setAtaAtiva] = useState(null);
  const [form, setForm] = useState({ numero:"", objeto:"", fornecedor:"", cnpj:"", vigencia:"", valorTotal:"" });

  const set = n => v => setForm(p => ({ ...p, [n]: v }));

  const salvar = () => {
    if (!form.numero || !form.objeto || !form.fornecedor) { toast("Preencha os campos obrigatórios", "error"); return; }
    const vt = parseFloat(form.valorTotal) || 0;
    setAtas(prev => [{ id: uid(), ...form, valorTotal: vt, saldoDisponivel: vt, itens: [] }, ...prev]);
    setModal(false);
    setForm({ numero:"", objeto:"", fornecedor:"", cnpj:"", vigencia:"", valorTotal:"" });
    toast("Ata registrada com sucesso!");
  };

  if (ataAtiva) {
    const ata = atas.find(a => a.id === ataAtiva);
    if (!ata) { setAtaAtiva(null); return null; }
    return <AtaDetalhe ata={ata} onVoltar={() => setAtaAtiva(null)} />;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        <Btn onClick={() => setModal(true)} color={C.accent2}>+ Nova Ata de RP</Btn>
      </div>

      {atas.length === 0 ? (
        <EmptyState icon="atas" title="Nenhuma Ata cadastrada" sub="Registre uma Ata de Registro de Preços" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {atas.map(a => {
            const d   = diasParaVencer(a.vigencia);
            const pct = ((a.valorTotal - a.saldoDisponivel) / a.valorTotal * 100).toFixed(0);
            const status = d > 0 ? "Vigente" : d === 0 ? "Vence hoje" : "Vencida";
            return (
              <div key={a.id}
                onClick={() => setAtaAtiva(a.id)}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", cursor: "pointer", boxShadow: shadow.card, transition: "box-shadow 0.14s, border-color 0.14s" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = shadow.cardHover; e.currentTarget.style.borderColor = C.borderStrong; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = shadow.card; e.currentTarget.style.borderColor = C.border; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.accent2 }}>{a.numero}</span>
                      <Badge label={status} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 5 }}>{a.objeto}</div>
                    <div style={{ fontSize: 12, color: C.sub }}>{a.fornecedor} · CNPJ {a.cnpj} · Vigência: {fmtDate(a.vigencia)}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: C.green }}>{fmtBRL(a.saldoDisponivel)}</div>
                    <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>saldo disponível</div>
                    <div style={{ fontSize: 11, color: C.gold, marginTop: 1 }}>{pct}% utilizado</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, background: C.subtle, borderRadius: 4, height: 5, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: C.accent2, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title="Nova Ata de Registro de Preços" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Número da Ata" value={form.numero} onChange={set("numero")} placeholder="ARP 001/2025" required />
              <Input label="Vigência" value={form.vigencia} onChange={set("vigencia")} type="date" />
            </div>
            <Input label="Objeto" value={form.objeto} onChange={set("objeto")} placeholder="Objeto do registro de preços" required />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Fornecedor" value={form.fornecedor} onChange={set("fornecedor")} placeholder="Razão social" required />
              <Input label="CNPJ" value={form.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0001-00" />
            </div>
            <Input label="Valor Total da Ata (R$)" value={form.valorTotal} onChange={set("valorTotal")} type="number" placeholder="0,00" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
              <Btn variant="outline" onClick={() => setModal(false)} color={C.sub}>Cancelar</Btn>
              <Btn onClick={salvar} color={C.accent2}>Salvar Ata</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
