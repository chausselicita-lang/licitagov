import { useState } from "react";
import { C, shadow } from "../lib/theme.js";
import { fmtBRL, fmtDate, diasParaVencer, uid, useMobile } from "../lib/utils.js";
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
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{ata.numero}</div>
          <div style={{ fontSize: 12, color: C.sub }}>{ata.objeto}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: 14, marginBottom: 20 }}>
        <KpiCard label="Fornecedor" value={ata.fornecedor.split(" ").slice(0, 2).join(" ")} color={C.accent} />
        <KpiCard label="Valor Total" value={fmtBRL(ata.valorTotal)} color={C.accent2} />
        <KpiCard label="Saldo Disponível" value={fmtBRL(ata.saldoDisponivel)} sub={`${(100 - parseFloat(pctUsado)).toFixed(1)}% disponível`} color={C.green} />
        <KpiCard label="Vigência" value={fmtDate(ata.vigencia)} sub={dias !== null ? `${dias} dias` : "—"} color={dias !== null && dias < 30 ? C.red : C.amber} />
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 16, boxShadow: shadow.card }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>Utilização da Ata</span>
          <span style={{ fontSize: 13, color: C.accent, fontWeight: 700 }}>{pctUsado}% utilizado</span>
        </div>
        <div style={{ background: C.subtle, borderRadius: 4, height: 6, overflow: "hidden" }}>
          <div style={{ width: `${pctUsado}%`, height: "100%", background: C.accent, borderRadius: 4, transition: "width 0.6s" }} />
        </div>
      </div>

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

function AtaCard({ a, onClick }) {
  const isMobile = useMobile();
  const d   = diasParaVencer(a.vigencia);
  const pct = a.valorTotal > 0
    ? ((a.valorTotal - a.saldoDisponivel) / a.valorTotal * 100).toFixed(0)
    : "0";
  const status = d === null ? "Vencida" : d > 0 ? "Vigente" : d === 0 ? "Vence hoje" : "Vencida";

  if (isMobile) {
    return (
      <div
        onClick={onClick}
        style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: 16, cursor: "pointer", boxShadow: shadow.card,
          display: "flex", flexDirection: "column", gap: 8,
        }}
      >
        {/* Linha 1: número + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.accent2 }}>{a.numero}</span>
          <Badge label={status} />
        </div>

        {/* Linha 2: valor grande em verde */}
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.green, lineHeight: 1.1 }}>{fmtBRL(a.saldoDisponivel)}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 3 }}>
            <span style={{ fontSize: 11, color: C.sub }}>saldo disponível</span>
            <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>{pct}% utilizado</span>
          </div>
        </div>

        {/* Linha 3: objeto com até 2 linhas */}
        <div style={{
          fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{a.objeto}</div>

        {/* Linha 4: fornecedor */}
        <div style={{ fontSize: 12, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {a.fornecedor}
        </div>

        {/* Linha 5: CNPJ · Vigência */}
        <div style={{ fontSize: 12, color: C.tertiary }}>
          {a.cnpj ? `CNPJ ${a.cnpj} · ` : ""}Vigência: {fmtDate(a.vigencia)}
        </div>

        {/* Progress bar */}
        <div style={{ background: C.subtle, borderRadius: 4, height: 4, overflow: "hidden", marginTop: 2 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: C.accent2, borderRadius: 4 }} />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: "16px 20px", cursor: "pointer", boxShadow: shadow.card,
        transition: "box-shadow 0.14s, border-color 0.14s",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = shadow.cardHover; e.currentTarget.style.borderColor = C.borderStrong; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = shadow.card; e.currentTarget.style.borderColor = C.border; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.accent2 }}>{a.numero}</span>
            <Badge label={status} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.objeto}</div>
          <div style={{ fontSize: 12, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {a.fornecedor}{a.cnpj ? ` · CNPJ ${a.cnpj}` : ""} · Vigência: {fmtDate(a.vigencia)}
          </div>
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
          {atas.map(a => (
            <AtaCard key={a.id} a={a} onClick={() => setAtaAtiva(a.id)} />
          ))}
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
