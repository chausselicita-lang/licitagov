import { useEffect, useMemo, useState } from "react";
import { fmtBRL, fmtDate, diasParaVencer, useMobile } from "../lib/utils.js";
import { sbListTodosEmpenhosAtas } from "../lib/ataEmpenhos.js";

/* ══════════════════════════════════════════════════════════════
   Dashboard de Atas de Registro de Preços
   - "Resumo geral": visão consolidada de todas as atas
   - "Por ata": detalhamento item a item (quantidade, valor, %, saldo)
   Gráficos em SVG puro (sem dependências). Visual escuro, igual ao FrotaCore.
══════════════════════════════════════════════════════════════ */

const K = {
  fundo: "#121212", fundo2: "#1a1a1a", borda: "#2a2a2a", trilho: "#2b2b2b",
  texto: "#f3f4f6", sub: "#9ca3af", laranja: "#FF7A00",
  verde: "#34d399", ambar: "#f59e0b", vermelho: "#f87171", azul: "#60a5fa", roxo: "#a78bfa", cinza: "#9aa3b2",
};
const CORES = [K.laranja, K.azul, K.verde, K.roxo, K.vermelho, K.cinza];
const corPct = p => (p >= 90 ? K.vermelho : p >= 70 ? K.ambar : K.verde);

const num = (v, d = 0) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const pctTxt = p => `${num(p, p >= 10 || p === 0 ? 0 : 1)}%`;
const compacto = v => {
  const a = Math.abs(v);
  if (a >= 1e6) return `R$ ${num(v / 1e6, 1)} mi`;
  if (a >= 1e3) return `R$ ${num(v / 1e3, 0)} mil`;
  return `R$ ${num(v, 0)}`;
};
const mesRot = k => {
  const [a, m] = k.split("-");
  return new Date(Number(a), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
};

/* ── Modelo derivado ───────────────────────────────────────── */

function situacao(vigencia) {
  const d = diasParaVencer(vigencia);
  if (d === null) return { rot: "Sem vigência", cor: K.cinza, dias: null };
  if (d < 0) return { rot: "Vencida", cor: K.vermelho, dias: d };
  if (d <= 90) return { rot: "Vence em breve", cor: K.ambar, dias: d };
  return { rot: "Vigente", cor: K.verde, dias: d };
}

function analisarAta(ata, empenhos) {
  const total = Number(ata.valorTotal) || 0;
  const consumido = Math.min(total, Math.max(0, total - (Number(ata.saldoDisponivel) || 0)));
  const itens = (ata.itens || []).map(it => {
    const reg = Number(it.qtdRegistrada) || 0;
    const uti = Number(it.qtdUtilizada) || 0;
    const vu = Number(it.valorUnit) || 0;
    return {
      ...it, reg, uti, vu,
      saldoQtd: Math.max(0, reg - uti),
      pct: reg > 0 ? Math.min(100, (uti / reg) * 100) : 0,
      valorTotal: reg * vu,
      valorConsumido: uti * vu,
      valorSaldo: Math.max(0, reg - uti) * vu,
    };
  });
  const ordenados = [...(empenhos || [])].sort((a, b) =>
    String(a.dataEmissao || a.createdAt || "").localeCompare(String(b.dataEmissao || b.createdAt || "")));
  let acum = 0;
  const lancamentos = ordenados.map(e => {
    acum += Number(e.valor) || 0;
    return { ...e, saldoApos: Math.max(0, total - acum), acumulado: acum };
  });
  return {
    ata, total, consumido, saldo: total - consumido,
    pct: total > 0 ? (consumido / total) * 100 : 0,
    itens, lancamentos, totalEmpenhado: acum,
    sit: situacao(ata.vigencia),
  };
}

const agrupa = (lista, chave, valor) => {
  const m = new Map();
  for (const x of lista) m.set(chave(x), (m.get(chave(x)) || 0) + valor(x));
  return [...m.entries()].map(([label, v]) => ({ label, valor: v })).filter(d => d.valor > 0).sort((a, b) => b.valor - a.valor);
};
const topN = (lista, n) => {
  if (lista.length <= n) return lista;
  return [...lista.slice(0, n), { label: "Outros", valor: lista.slice(n).reduce((t, d) => t + d.valor, 0) }];
};
const mesDe = e => String(e.dataEmissao || e.createdAt || "").slice(0, 7);

/* ── Blocos visuais ────────────────────────────────────────── */

function Cartao({ titulo, sub, children, style }) {
  return (
    <div style={{ background: K.fundo, border: `1px solid ${K.borda}`, borderRadius: 12, padding: 18, color: K.texto, minWidth: 0, ...style }}>
      {(titulo || sub) && (
        <div style={{ marginBottom: 14 }}>
          {titulo && <div style={{ fontSize: 11, fontWeight: 700, color: K.sub, textTransform: "uppercase", letterSpacing: "0.07em" }}>{titulo}</div>}
          {sub && <div style={{ fontSize: 12, color: K.sub, marginTop: 3 }}>{sub}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Indicador({ rotulo, valor, sub, cor = K.laranja }) {
  return (
    <div style={{ background: K.fundo, border: `1px solid ${K.borda}`, borderLeft: `3px solid ${cor}`, borderRadius: 12, padding: "14px 16px", minWidth: 0 }}>
      <div style={{ fontSize: 11, color: K.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{rotulo}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: K.texto, lineHeight: 1.15, wordBreak: "break-word" }}>{valor}</div>
      {sub && <div style={{ fontSize: 12, color: cor, marginTop: 6, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

const R = 42, CIRC = 2 * Math.PI * R;

function Donut({ dados, centro, centroSub, onSelect, vazio = "Sem dados" }) {
  const total = dados.reduce((t, d) => t + d.valor, 0);
  let ac = 0;
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: 150, height: 150, flexShrink: 0 }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r={R} fill="none" stroke={K.trilho} strokeWidth="11" />
          {total > 0 && dados.map((d, i) => {
            const f = d.valor / total;
            const el = (
              <circle key={d.label} cx="50" cy="50" r={R} fill="none" stroke={d.cor || CORES[i % CORES.length]} strokeWidth="11"
                strokeDasharray={`${Math.max(0, f * CIRC - 1.2)} ${CIRC}`} strokeDashoffset={-ac * CIRC}
                style={{ cursor: onSelect && d.id ? "pointer" : "default" }} onClick={() => d.id && onSelect && onSelect(d.id)} />
            );
            ac += f;
            return el;
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 18 }}>
          <strong style={{ fontSize: 16, color: K.texto, lineHeight: 1.1 }}>{total > 0 ? centro : "—"}</strong>
          <span style={{ fontSize: 10, color: K.sub, marginTop: 2 }}>{centroSub}</span>
        </div>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 7 }}>
        {total === 0 && <li style={{ color: K.sub, fontSize: 12 }}>{vazio}</li>}
        {total > 0 && dados.map((d, i) => (
          <li key={d.label} onClick={() => d.id && onSelect && onSelect(d.id)}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: onSelect && d.id ? "pointer" : "default" }}>
            <i style={{ width: 9, height: 9, borderRadius: 3, background: d.cor || CORES[i % CORES.length], flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: K.texto }} title={d.label}>{d.label}</span>
            <span style={{ color: K.sub, whiteSpace: "nowrap" }}>{d.texto ?? num(d.valor)} <em style={{ fontStyle: "normal", color: K.texto, fontWeight: 600 }}>{pctTxt((d.valor / total) * 100)}</em></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Anel({ pct, grande }) {
  const p = Math.max(0, Math.min(100, pct)) / 100;
  const cor = corPct(pct);
  return (
    <div style={{ position: "relative", width: grande ? 170 : 120, height: grande ? 170 : 120, margin: "0 auto" }}>
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={R} fill="none" stroke={K.trilho} strokeWidth="11" />
        {p > 0 && <circle cx="50" cy="50" r={R} fill="none" stroke={cor} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${p * CIRC} ${CIRC}`} />}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <strong style={{ fontSize: grande ? 28 : 20, color: K.texto }}>{pctTxt(pct)}</strong>
        <span style={{ fontSize: 10, color: K.sub }}>consumido</span>
      </div>
    </div>
  );
}

function Barras({ dados, cor = K.laranja, onSelect, vazio = "Sem dados", corDe }) {
  const max = Math.max(...dados.map(d => d.valor), 0) || 1;
  if (!dados.length) return <div style={{ color: K.sub, fontSize: 12 }}>{vazio}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {dados.map(d => (
        <div key={d.id || d.label} onClick={() => d.id && onSelect && onSelect(d.id)}
          style={{ cursor: onSelect && d.id ? "pointer" : "default" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: K.texto, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }} title={d.label}>{d.label}</span>
            <span style={{ color: K.sub, whiteSpace: "nowrap", fontWeight: 600 }}>{d.texto}</span>
          </div>
          <div style={{ background: K.trilho, borderRadius: 4, height: 8, overflow: "hidden" }}>
            <div style={{ width: `${(d.valor / max) * 100}%`, height: "100%", background: corDe ? corDe(d) : cor, borderRadius: 4, transition: "width .5s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Linha({ serie, cor = K.laranja, formato = fmtBRL, vazio = "Sem lançamentos no período" }) {
  const [sel, setSel] = useState(null);
  if (!serie.length) return <div style={{ color: K.sub, fontSize: 12, padding: "24px 0" }}>{vazio}</div>;
  const W = 300, H = 120, pad = { t: 12, b: 20, l: 4, r: 6 };
  const max = Math.max(...serie.map(p => p.v), 0) || 1;
  const x = i => pad.l + (serie.length <= 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (serie.length - 1));
  const y = v => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const pts = serie.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`);
  const linha = `M${pts.join(" L")}`;
  const area = `${linha} L${x(serie.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`;
  const gid = `g${cor.replace("#", "")}${serie.length}`;
  const mover = ev => {
    const r = ev.currentTarget.getBoundingClientRect();
    const f = (ev.clientX - r.left) / r.width;
    setSel(Math.max(0, Math.min(serie.length - 1, Math.round(f * (serie.length - 1)))));
  };
  const i = sel ?? serie.length - 1;
  const p = serie[i];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <strong style={{ fontSize: 18, color: K.texto }}>{formato(p.v)}</strong>
        <span style={{ fontSize: 12, color: K.sub }}>{p.rot}</span>
      </div>
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 150, display: "block", touchAction: "none" }} onPointerMove={mover} onPointerLeave={() => setSel(null)}>
          <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={cor} stopOpacity="0.4" /><stop offset="100%" stopColor={cor} stopOpacity="0" /></linearGradient></defs>
          {[0, 0.5, 1].map(f => <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} stroke={K.borda} strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          <path d={area} fill={`url(#${gid})`} />
          <path d={linha} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <i style={{ position: "absolute", left: `${(x(i) / W) * 100}%`, top: `${(y(p.v) / H) * 100}%`, width: 9, height: 9, marginLeft: -4.5, marginTop: -4.5, borderRadius: "50%", background: cor, border: `2px solid ${K.fundo}`, pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: K.sub }}><span>{serie[0].rot}</span><span>{serie[serie.length - 1].rot}</span></div>
    </div>
  );
}

function Progresso({ pct, altura = 8 }) {
  return (
    <div style={{ background: K.trilho, borderRadius: 4, height: altura, overflow: "hidden", minWidth: 60 }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: corPct(pct), borderRadius: 4, transition: "width .5s" }} />
    </div>
  );
}

const th = { padding: "10px 12px", fontSize: 10.5, color: K.sub, fontWeight: 700, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", borderBottom: `1px solid ${K.borda}` };
const td = { padding: "11px 12px", fontSize: 12.5, color: K.texto, borderBottom: `1px solid ${K.borda}`, verticalAlign: "middle" };
const tdN = { ...td, textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };

function Selo({ cor, children }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color: cor, background: cor + "22", padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>{children}</span>;
}

/* ── Modo demonstração (dados fictícios, só na tela) ───────── */

function dadosDemo() {
  const hoje = new Date();
  const dt = (mesesAtras, dia = 10) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, dia);
    return d.toISOString().slice(0, 10);
  };
  const vig = meses => { const d = new Date(hoje.getFullYear(), hoje.getMonth() + meses, 15); return d.toISOString().slice(0, 10); };
  const mk = (id, numero, objeto, fornecedor, cnpj, meses, itens, gastos) => {
    const its = itens.map((x, i) => ({ id: `${id}-${i}`, descricao: x[0], unidade: x[1], qtdRegistrada: x[2], qtdUtilizada: 0, valorUnit: x[3] }));
    const emps = gastos.map((g, k) => {
      const linhas = g.itens.map(([idx, q]) => ({ ataItemId: its[idx].id, qtd: q, valorUnit: its[idx].valorUnit }));
      linhas.forEach(l => { const it = its.find(i => i.id === l.ataItemId); it.qtdUtilizada += l.qtd; });
      return { id: `${id}-e${k}`, parentId: id, numero: `2026NE${String(id.length * 100 + k).padStart(6, "0")}`, dataEmissao: dt(g.mes, 8 + k), unidadeGestora: g.un, valor: linhas.reduce((t, l) => t + l.qtd * l.valorUnit, 0), itens: linhas };
    });
    const total = its.reduce((t, i) => t + i.qtdRegistrada * i.valorUnit, 0);
    const usado = emps.reduce((t, e) => t + e.valor, 0);
    return { ata: { id, numero, objeto, fornecedor, cnpj, vigencia: vig(meses), valorTotal: total, saldoDisponivel: total - usado, itens: its }, emps };
  };
  const pacotes = [
    mk("d1", "ARP 012/2026", "Gêneros alimentícios para merenda escolar", "Distribuidora Boa Mesa Ltda", "12.345.678/0001-90", 7, [
      ["Arroz tipo 1 — 5 kg", "Pct", 4000, 21.5], ["Feijão carioca — 1 kg", "Kg", 6000, 7.9], ["Óleo de soja — 900 ml", "Un", 3000, 6.8], ["Macarrão espaguete — 500 g", "Pct", 5000, 4.2], ["Leite integral — 1 L", "Un", 8000, 5.1],
    ], [
      { mes: 5, un: "Secretaria de Educação", itens: [[0, 700], [1, 1200], [4, 1500]] },
      { mes: 4, un: "Secretaria de Educação", itens: [[0, 600], [2, 800], [3, 900]] },
      { mes: 3, un: "Secretaria de Assistência Social", itens: [[1, 1500], [3, 1000], [4, 1800]] },
      { mes: 2, un: "Secretaria de Educação", itens: [[0, 900], [2, 700], [4, 1700]] },
      { mes: 1, un: "Secretaria de Educação", itens: [[0, 800], [1, 1600], [3, 1400]] },
      { mes: 0, un: "Secretaria de Assistência Social", itens: [[0, 300], [2, 500], [4, 900]] },
    ]),
    mk("d2", "ARP 007/2026", "Combustíveis e lubrificantes", "Posto Rodovia Combustíveis Ltda", "98.765.432/0001-10", 2, [
      ["Óleo diesel S10", "L", 60000, 6.19], ["Gasolina comum", "L", 25000, 6.35], ["Etanol", "L", 10000, 4.79],
    ], [
      { mes: 6, un: "Secretaria de Obras", itens: [[0, 12000], [1, 3000]] },
      { mes: 5, un: "Secretaria de Saúde", itens: [[0, 8000], [1, 5000]] },
      { mes: 4, un: "Secretaria de Obras", itens: [[0, 11000], [2, 2500]] },
      { mes: 3, un: "Secretaria de Educação", itens: [[0, 9000], [1, 4500]] },
      { mes: 2, un: "Secretaria de Obras", itens: [[0, 10000], [1, 3500], [2, 3000]] },
      { mes: 1, un: "Secretaria de Saúde", itens: [[0, 6500], [1, 4000]] },
    ]),
    mk("d3", "ARP 019/2026", "Material de limpeza e higiene", "Limpa Mais Comércio Ltda", "45.678.901/0001-23", 10, [
      ["Detergente neutro — 500 ml", "Un", 2000, 2.4], ["Água sanitária — 2 L", "Un", 1500, 5.6], ["Papel higiênico — fardo 64 rolos", "Fd", 300, 118], ["Desinfetante — 2 L", "Un", 1200, 7.3],
    ], [
      { mes: 2, un: "Secretaria de Administração", itens: [[0, 400], [1, 300], [2, 60]] },
      { mes: 1, un: "Secretaria de Saúde", itens: [[0, 300], [3, 250], [2, 40]] },
    ]),
    mk("d4", "ARP 003/2025", "Material de expediente", "Papelaria Central Ltda", "33.222.111/0001-44", -1, [
      ["Papel A4 — resma 500 fls", "Rm", 2500, 28.9], ["Caneta esferográfica azul", "Cx", 400, 34], ["Pasta suspensa", "Un", 1500, 3.1],
    ], [
      { mes: 9, un: "Secretaria de Administração", itens: [[0, 800], [1, 120]] },
      { mes: 8, un: "Secretaria de Educação", itens: [[0, 700], [2, 600]] },
      { mes: 7, un: "Secretaria de Saúde", itens: [[0, 600], [1, 150], [2, 500]] },
      { mes: 6, un: "Secretaria de Administração", itens: [[0, 380], [1, 100], [2, 300]] },
    ]),
  ];
  const empenhos = {};
  pacotes.forEach(p => { empenhos[p.ata.id] = p.emps; });
  return { atas: pacotes.map(p => p.ata), empenhos };
}

/* ── Resumo geral ──────────────────────────────────────────── */

function ResumoGeral({ analises, onAbrir, mobile }) {
  const tot = useMemo(() => {
    const total = analises.reduce((t, a) => t + a.total, 0);
    const consumido = analises.reduce((t, a) => t + a.consumido, 0);
    const emps = analises.flatMap(a => a.lancamentos.map(e => ({ ...e, ataNumero: a.ata.numero })));
    const porSit = { Vigente: 0, "Vence em breve": 0, Vencida: 0, "Sem vigência": 0 };
    analises.forEach(a => { porSit[a.sit.rot]++; });
    const sitCor = { Vigente: K.verde, "Vence em breve": K.ambar, Vencida: K.vermelho, "Sem vigência": K.cinza };
    const mensal = agrupa(emps.filter(e => mesDe(e)), mesDe, e => Number(e.valor) || 0).sort((a, b) => a.label.localeCompare(b.label));
    let ac = 0;
    const serieMes = mensal.map(m => ({ rot: mesRot(m.label), v: m.valor }));
    const serieAcum = mensal.map(m => { ac += m.valor; return { rot: mesRot(m.label), v: ac }; });
    const porUnidade = agrupa(emps, e => e.unidadeGestora || "Não informada", e => Number(e.valor) || 0);
    const porFornecedor = agrupa(analises, a => a.ata.fornecedor || "—", a => a.consumido);
    const itensCriticos = analises.flatMap(a => a.itens.filter(i => i.reg > 0 && i.pct >= 85).map(i => ({ ...i, ata: a.ata })))
      .sort((x, y) => y.pct - x.pct).slice(0, 8);
    return { total, consumido, saldo: total - consumido, pct: total > 0 ? (consumido / total) * 100 : 0, emps, porSit, sitCor, serieMes, serieAcum, porUnidade, porFornecedor, itensCriticos };
  }, [analises]);

  const alertas = [];
  analises.forEach(a => {
    if (a.sit.rot === "Vence em breve") alertas.push({ cor: K.ambar, txt: `${a.ata.numero} vence em ${a.sit.dias} dia(s) — saldo de ${fmtBRL(a.saldo)} ainda não consumido`, id: a.ata.id });
    if (a.sit.rot === "Vencida" && a.saldo > 0) alertas.push({ cor: K.vermelho, txt: `${a.ata.numero} está vencida com saldo de ${fmtBRL(a.saldo)} não utilizado`, id: a.ata.id });
    if (a.pct >= 90 && a.sit.rot !== "Vencida") alertas.push({ cor: K.vermelho, txt: `${a.ata.numero} já consumiu ${pctTxt(a.pct)} do valor registrado`, id: a.ata.id });
    else if (a.pct >= 70 && a.sit.rot !== "Vencida") alertas.push({ cor: K.ambar, txt: `${a.ata.numero} chegou a ${pctTxt(a.pct)} de consumo`, id: a.ata.id });
  });

  const grid = (min) => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${mobile ? 260 : min}px,1fr))`, gap: 14 });
  const porAta = [...analises].sort((a, b) => b.pct - a.pct);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={grid(190)}>
        <Indicador rotulo="Valor registrado" valor={fmtBRL(tot.total)} sub={`${analises.length} ata(s)`} cor={K.laranja} />
        <Indicador rotulo="Valor consumido" valor={fmtBRL(tot.consumido)} sub={`${pctTxt(tot.pct)} do total`} cor={corPct(tot.pct)} />
        <Indicador rotulo="Saldo a consumir" valor={fmtBRL(tot.saldo)} sub={`${pctTxt(100 - tot.pct)} disponível`} cor={K.verde} />
        <Indicador rotulo="Atas vigentes" valor={tot.porSit.Vigente + tot.porSit["Vence em breve"]} sub={`${tot.porSit["Vence em breve"]} vencem em 90 dias · ${tot.porSit.Vencida} vencida(s)`} cor={K.azul} />
        <Indicador rotulo="Notas de empenho" valor={tot.emps.length} sub={tot.emps.length ? `${fmtBRL(tot.emps.reduce((t, e) => t + (Number(e.valor) || 0), 0))} empenhados` : "nenhuma lançada"} cor={K.roxo} />
      </div>

      <div style={grid(330)}>
        <Cartao titulo="Consumo geral das atas" sub="Quanto do valor registrado já foi gasto">
          <Donut centro={pctTxt(tot.pct)} centroSub="consumido"
            dados={[{ label: "Consumido", valor: tot.consumido, cor: K.laranja, texto: compacto(tot.consumido) }, { label: "Saldo disponível", valor: Math.max(0, tot.saldo), cor: K.verde, texto: compacto(tot.saldo) }]} />
        </Cartao>
        <Cartao titulo="Situação das atas" sub="Pela data de vigência">
          <Donut centro={analises.length} centroSub="atas"
            dados={Object.entries(tot.porSit).filter(([, n]) => n > 0).map(([label, valor]) => ({ label, valor, cor: tot.sitCor[label], texto: `${valor}` }))} />
        </Cartao>
        <Cartao titulo="Alertas" sub="O que precisa de atenção">
          {alertas.length === 0 ? <div style={{ color: K.verde, fontSize: 13 }}>Nenhum alerta. Todas as atas estão dentro do esperado.</div> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9, maxHeight: 190, overflowY: "auto" }}>
              {alertas.map((a, i) => (
                <li key={i} onClick={() => onAbrir(a.id)} style={{ display: "flex", gap: 9, fontSize: 12.5, lineHeight: 1.45, cursor: "pointer", color: K.texto }}>
                  <i style={{ width: 8, height: 8, borderRadius: "50%", background: a.cor, marginTop: 5, flexShrink: 0 }} />{a.txt}
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      <div style={grid(420)}>
        <Cartao titulo="Consumo por ata" sub="Clique para abrir o detalhamento">
          <Barras onSelect={onAbrir} dados={porAta.map(a => ({ id: a.ata.id, label: `${a.ata.numero} · ${a.ata.fornecedor}`, valor: a.pct, texto: `${pctTxt(a.pct)} · ${compacto(a.consumido)}` }))} corDe={d => corPct(d.valor)} vazio="Nenhuma ata cadastrada" />
        </Cartao>
        <Cartao titulo="Gasto por fornecedor" sub="Valor consumido nas atas de cada fornecedor">
          <Barras dados={topN(tot.porFornecedor, 6).map(d => ({ ...d, texto: compacto(d.valor) }))} vazio="Sem consumo registrado" />
        </Cartao>
      </div>

      <div style={grid(330)}>
        <Cartao titulo="Gastos por mês" sub="Notas de empenho lançadas">
          <Linha serie={tot.serieMes} />
        </Cartao>
        <Cartao titulo="Gasto acumulado" sub="Soma dos empenhos ao longo do tempo">
          <Linha serie={tot.serieAcum} cor={K.azul} />
        </Cartao>
        <Cartao titulo="Gasto por secretaria / unidade" sub="Conforme a unidade gestora dos empenhos">
          <Barras dados={topN(tot.porUnidade, 6).map(d => ({ ...d, texto: compacto(d.valor) }))} cor={K.roxo} vazio="Sem empenhos lançados" />
        </Cartao>
      </div>

      {tot.itensCriticos.length > 0 && (
        <Cartao titulo="Itens quase esgotados" sub="Itens com 85% ou mais da quantidade registrada já consumida">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead><tr><th style={th}>Item</th><th style={th}>Ata</th><th style={{ ...th, textAlign: "right" }}>Saldo (qtd)</th><th style={{ ...th, width: 160 }}>Consumo</th></tr></thead>
              <tbody>
                {tot.itensCriticos.map(i => (
                  <tr key={i.id} onClick={() => onAbrir(i.ata.id)} style={{ cursor: "pointer" }}>
                    <td style={td}>{i.descricao}</td><td style={td}>{i.ata.numero}</td>
                    <td style={tdN}>{num(i.saldoQtd, 2)} {i.unidade}</td>
                    <td style={td}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Progresso pct={i.pct} /><span style={{ fontSize: 12, width: 38 }}>{pctTxt(i.pct)}</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      )}

      <Cartao titulo="Todas as atas" sub="Clique em uma linha para ver o dashboard completo da ata">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead><tr>
              <th style={th}>Ata</th><th style={th}>Fornecedor</th><th style={{ ...th, textAlign: "right" }}>Valor total</th>
              <th style={{ ...th, textAlign: "right" }}>Consumido</th><th style={{ ...th, textAlign: "right" }}>Saldo</th>
              <th style={{ ...th, width: 150 }}>% consumo</th><th style={th}>Vigência</th>
            </tr></thead>
            <tbody>
              {analises.length === 0 && <tr><td style={{ ...td, color: K.sub }} colSpan={7}>Nenhuma ata cadastrada.</td></tr>}
              {analises.map(a => (
                <tr key={a.ata.id} onClick={() => onAbrir(a.ata.id)} style={{ cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = K.fundo2)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ ...td, fontWeight: 700, color: K.laranja, whiteSpace: "nowrap" }}>{a.ata.numero}</td>
                  <td style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.ata.fornecedor}</td>
                  <td style={tdN}>{fmtBRL(a.total)}</td>
                  <td style={{ ...tdN, color: K.ambar }}>{fmtBRL(a.consumido)}</td>
                  <td style={{ ...tdN, color: K.verde, fontWeight: 600 }}>{fmtBRL(a.saldo)}</td>
                  <td style={td}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Progresso pct={a.pct} /><span style={{ fontSize: 12, width: 38 }}>{pctTxt(a.pct)}</span></div></td>
                  <td style={td}><Selo cor={a.sit.cor}>{a.sit.rot}</Selo> <span style={{ fontSize: 11, color: K.sub }}>{fmtDate(a.ata.vigencia)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </div>
  );
}

/* ── Detalhe de uma ata ────────────────────────────────────── */

function DetalheAta({ analise, mobile }) {
  const { ata, itens, lancamentos } = analise;
  const [aberto, setAberto] = useState(null);
  const [ordem, setOrdem] = useState("original");

  const grid = min => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${mobile ? 260 : min}px,1fr))`, gap: 14 });
  const itensOrd = useMemo(() => {
    const l = [...itens];
    if (ordem === "valor") l.sort((a, b) => b.valorConsumido - a.valorConsumido);
    if (ordem === "pct") l.sort((a, b) => b.pct - a.pct);
    if (ordem === "saldo") l.sort((a, b) => b.valorSaldo - a.valorSaldo);
    return l;
  }, [itens, ordem]);

  const somaItens = itens.reduce((t, i) => t + i.valorTotal, 0);
  const somaConsumoItens = itens.reduce((t, i) => t + i.valorConsumido, 0);
  const consumoPorItem = topN(itens.map(i => ({ label: i.descricao, valor: i.valorConsumido })).filter(d => d.valor > 0).sort((a, b) => b.valor - a.valor), 5)
    .map(d => ({ ...d, texto: compacto(d.valor) }));
  const unidades = topN(agrupa(lancamentos, e => e.unidadeGestora || "Não informada", e => Number(e.valor) || 0), 6).map(d => ({ ...d, texto: compacto(d.valor) }));

  // Saldo da ata a cada empenho (a "baixa" do valor)
  const serieSaldo = lancamentos.length
    ? [{ rot: "Início", v: analise.total }, ...lancamentos.map((e, i) => ({ rot: `Emp. ${e.numero}`, v: e.saldoApos }))]
    : [];

  // Empenhos que consumiram um item
  const empenhosDoItem = id => lancamentos
    .map(e => ({ e, l: (e.itens || []).filter(x => x.ataItemId === id) }))
    .filter(x => x.l.length)
    .map(x => ({ ...x.e, qtdItem: x.l.reduce((t, y) => t + (Number(y.qtd) || 0), 0), valorItem: x.l.reduce((t, y) => t + (Number(y.qtd) || 0) * (Number(y.valorUnit) || 0), 0) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: K.fundo, border: `1px solid ${K.borda}`, borderRadius: 12, padding: "16px 18px", display: "flex", gap: 14, justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: K.laranja }}>{ata.numero}</span>
            <Selo cor={analise.sit.cor}>{analise.sit.rot}</Selo>
          </div>
          <div style={{ fontSize: 14, color: K.texto, marginTop: 5 }}>{ata.objeto}</div>
          <div style={{ fontSize: 12, color: K.sub, marginTop: 3 }}>{ata.fornecedor}{ata.cnpj ? ` · CNPJ ${ata.cnpj}` : ""}</div>
        </div>
        <div style={{ textAlign: mobile ? "left" : "right" }}>
          <div style={{ fontSize: 11, color: K.sub, textTransform: "uppercase", letterSpacing: "0.06em" }}>Vigência</div>
          <div style={{ fontSize: 15, color: K.texto, fontWeight: 600 }}>{fmtDate(ata.vigencia)}</div>
          <div style={{ fontSize: 12, color: analise.sit.cor }}>{analise.sit.dias === null ? "—" : analise.sit.dias < 0 ? `venceu há ${-analise.sit.dias} dia(s)` : `faltam ${analise.sit.dias} dia(s)`}</div>
        </div>
      </div>

      <div style={grid(190)}>
        <Indicador rotulo="Valor total da ata" valor={fmtBRL(analise.total)} sub={`${itens.length} item(ns) registrado(s)`} cor={K.laranja} />
        <Indicador rotulo="Valor consumido" valor={fmtBRL(analise.consumido)} sub={`${pctTxt(analise.pct)} do total`} cor={corPct(analise.pct)} />
        <Indicador rotulo="Saldo a consumir" valor={fmtBRL(analise.saldo)} sub={`${pctTxt(100 - analise.pct)} disponível`} cor={K.verde} />
        <Indicador rotulo="Notas de empenho" valor={lancamentos.length} sub={lancamentos.length ? `${fmtBRL(analise.totalEmpenhado)} empenhados` : "nenhuma lançada"} cor={K.roxo} />
      </div>

      <div style={grid(300)}>
        <Cartao titulo="Utilização da ata" sub="Valor consumido x saldo">
          <Anel pct={analise.pct} grande />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: K.sub, marginTop: 14 }}>
            <span>Consumido <b style={{ color: K.ambar }}>{compacto(analise.consumido)}</b></span>
            <span>Saldo <b style={{ color: K.verde }}>{compacto(analise.saldo)}</b></span>
          </div>
        </Cartao>
        <Cartao titulo="Valor consumido por item" sub="Onde o dinheiro da ata foi gasto">
          <Donut centro={compacto(somaConsumoItens)} centroSub="consumido" dados={consumoPorItem} vazio="Nenhum item consumido ainda" />
        </Cartao>
        <Cartao titulo="Gasto por secretaria / unidade" sub="Conforme os empenhos desta ata">
          <Barras dados={unidades} cor={K.roxo} vazio="Sem empenhos lançados" />
        </Cartao>
      </div>

      <Cartao titulo="Baixa do saldo da ata" sub="Quanto sobrou do valor total após cada nota de empenho">
        <Linha serie={serieSaldo} cor={K.verde} vazio="Nenhum empenho lançado — o saldo ainda está integral" />
      </Cartao>

      <Cartao titulo="Detalhamento por item" sub="Quantidade, valor, percentual consumido e quanto ainda resta de cada item. Clique no item para ver os empenhos que o consumiram.">
        {itens.length === 0 ? (
          <div style={{ color: K.sub, fontSize: 13 }}>Esta ata não tem itens cadastrados. Cadastre os itens na aba Atas de RP para ver o detalhamento.</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {[["original", "Ordem da ata"], ["valor", "Mais gasto (R$)"], ["pct", "Maior % consumido"], ["saldo", "Maior saldo (R$)"]].map(([k, r]) => (
                <button key={k} onClick={() => setOrdem(k)} style={{ background: ordem === k ? K.laranja : "transparent", color: ordem === k ? "#121212" : K.sub, border: `1px solid ${ordem === k ? K.laranja : K.borda}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{r}</button>
              ))}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                <thead><tr>
                  <th style={th}>Item</th><th style={th}>Un.</th>
                  <th style={{ ...th, textAlign: "right" }}>Qtd registrada</th><th style={{ ...th, textAlign: "right" }}>Qtd consumida</th><th style={{ ...th, textAlign: "right" }}>Qtd saldo</th>
                  <th style={{ ...th, textAlign: "right" }}>Valor unit.</th><th style={{ ...th, textAlign: "right" }}>Valor total</th>
                  <th style={{ ...th, textAlign: "right" }}>Valor consumido</th><th style={{ ...th, textAlign: "right" }}>Valor saldo</th>
                  <th style={{ ...th, width: 150 }}>% consumido</th>
                </tr></thead>
                <tbody>
                  {itensOrd.map(i => {
                    const emps = aberto === i.id ? empenhosDoItem(i.id) : [];
                    return [
                      <tr key={i.id} onClick={() => setAberto(aberto === i.id ? null : i.id)} style={{ cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = K.fundo2)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ ...td, fontWeight: 600, minWidth: 200 }}><span style={{ color: K.sub, marginRight: 6 }}>{aberto === i.id ? "▾" : "▸"}</span>{i.descricao}</td>
                        <td style={{ ...td, color: K.sub }}>{i.unidade}</td>
                        <td style={tdN}>{num(i.reg, 2)}</td>
                        <td style={{ ...tdN, color: K.ambar }}>{num(i.uti, 2)}</td>
                        <td style={{ ...tdN, color: i.reg > 0 && i.saldoQtd < i.reg * 0.1 ? K.vermelho : K.verde, fontWeight: 600 }}>{num(i.saldoQtd, 2)}</td>
                        <td style={tdN}>{fmtBRL(i.vu)}</td>
                        <td style={tdN}>{fmtBRL(i.valorTotal)}</td>
                        <td style={{ ...tdN, color: K.ambar }}>{fmtBRL(i.valorConsumido)}</td>
                        <td style={{ ...tdN, color: K.verde, fontWeight: 600 }}>{fmtBRL(i.valorSaldo)}</td>
                        <td style={td}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Progresso pct={i.pct} /><span style={{ fontSize: 12, width: 38, textAlign: "right" }}>{pctTxt(i.pct)}</span></div></td>
                      </tr>,
                      aberto === i.id && (
                        <tr key={i.id + "-det"}>
                          <td colSpan={10} style={{ ...td, background: K.fundo2, padding: "12px 20px" }}>
                            {emps.length === 0 ? <span style={{ color: K.sub, fontSize: 12 }}>Nenhum empenho vinculado a este item{i.uti > 0 ? " (o consumo foi lançado direto na quantidade)" : ""}.</span> : (
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead><tr><th style={th}>Empenho</th><th style={th}>Data</th><th style={th}>Unidade</th><th style={{ ...th, textAlign: "right" }}>Qtd</th><th style={{ ...th, textAlign: "right" }}>Valor</th></tr></thead>
                                <tbody>{emps.map(e => (
                                  <tr key={e.id}><td style={{ ...td, borderBottom: "none" }}>{e.numero}</td><td style={{ ...td, borderBottom: "none" }}>{fmtDate(e.dataEmissao)}</td><td style={{ ...td, borderBottom: "none" }}>{e.unidadeGestora || "—"}</td><td style={{ ...tdN, borderBottom: "none" }}>{num(e.qtdItem, 2)}</td><td style={{ ...tdN, borderBottom: "none" }}>{fmtBRL(e.valorItem)}</td></tr>
                                ))}</tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                  <tr>
                    <td style={{ ...td, fontWeight: 700 }} colSpan={6}>Soma dos itens</td>
                    <td style={{ ...tdN, fontWeight: 700 }}>{fmtBRL(somaItens)}</td>
                    <td style={{ ...tdN, fontWeight: 700, color: K.ambar }}>{fmtBRL(somaConsumoItens)}</td>
                    <td style={{ ...tdN, fontWeight: 700, color: K.verde }}>{fmtBRL(somaItens - somaConsumoItens)}</td>
                    <td style={td}>{somaItens > 0 ? pctTxt((somaConsumoItens / somaItens) * 100) : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </Cartao>

      {itens.length > 0 && (
        <div style={grid(420)}>
          <Cartao titulo="Percentual consumido por item" sub="Do que está mais perto de acabar ao que menos saiu">
            <Barras dados={[...itens].sort((a, b) => b.pct - a.pct).map(i => ({ label: i.descricao, valor: i.pct, texto: `${pctTxt(i.pct)} · ${num(i.uti, 0)} de ${num(i.reg, 0)} ${i.unidade}` }))} corDe={d => corPct(d.valor)} />
          </Cartao>
          <Cartao titulo="Saldo restante por item (R$)" sub="Quanto ainda dá para comprar de cada item">
            <Barras dados={[...itens].sort((a, b) => b.valorSaldo - a.valorSaldo).map(i => ({ label: i.descricao, valor: i.valorSaldo, texto: `${fmtBRL(i.valorSaldo)} · ${num(i.saldoQtd, 0)} ${i.unidade}` }))} cor={K.verde} />
          </Cartao>
        </div>
      )}

      <Cartao titulo="Notas de empenho da ata" sub="Cada lançamento baixa o saldo da ata">
        {lancamentos.length === 0 ? <div style={{ color: K.sub, fontSize: 13 }}>Nenhum empenho lançado nesta ata.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead><tr><th style={th}>Empenho</th><th style={th}>Data</th><th style={th}>Unidade gestora</th><th style={{ ...th, textAlign: "right" }}>Valor</th><th style={{ ...th, textAlign: "right" }}>Acumulado</th><th style={{ ...th, textAlign: "right" }}>Saldo da ata</th></tr></thead>
              <tbody>
                {[...lancamentos].reverse().map(e => (
                  <tr key={e.id}>
                    <td style={{ ...td, fontWeight: 600 }}>{e.numero}</td><td style={td}>{fmtDate(e.dataEmissao)}</td><td style={td}>{e.unidadeGestora || "—"}</td>
                    <td style={{ ...tdN, color: K.ambar }}>− {fmtBRL(e.valor)}</td><td style={tdN}>{fmtBRL(e.acumulado)}</td><td style={{ ...tdN, color: K.verde, fontWeight: 600 }}>{fmtBRL(e.saldoApos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  );
}

/* ── Painel ────────────────────────────────────────────────── */

export default function DashboardAtas({ atas }) {
  const mobile = useMobile();
  const [aba, setAba] = useState("geral");       // geral | ata
  const [ataId, setAtaId] = useState("");
  const [demo, setDemo] = useState(false);
  const [emps, setEmps] = useState({});          // { ataId: [empenhos] }
  const [carregando, setCarregando] = useState(true);
  const [erroTabela, setErroTabela] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    sbListTodosEmpenhosAtas().then(({ data, error }) => {
      if (!vivo) return;
      setErroTabela(!!error);
      const m = {};
      (data || []).forEach(e => { (m[e.parentId] ||= []).push(e); });
      setEmps(m);
      setCarregando(false);
    });
    return () => { vivo = false; };
  }, [tick, atas.length]);

  const demoData = useMemo(() => (demo ? dadosDemo() : null), [demo]);
  const listaAtas = demo ? demoData.atas : atas;
  const mapaEmps = demo ? demoData.empenhos : emps;
  const analises = useMemo(() => listaAtas.map(a => analisarAta(a, mapaEmps[a.id])), [listaAtas, mapaEmps]);

  const abrir = id => { setAtaId(id); setAba("ata"); window.scrollTo?.(0, 0); };
  const atual = analises.find(a => a.ata.id === ataId) || null;

  const botao = ativo => ({ background: ativo ? K.laranja : "transparent", color: ativo ? "#121212" : K.sub, border: `1px solid ${ativo ? K.laranja : K.borda}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });

  return (
    <div>
      <div style={{ background: K.fundo, border: `1px solid ${K.borda}`, borderRadius: 12, padding: 12, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button style={botao(aba === "geral")} onClick={() => setAba("geral")}>Resumo geral</button>
        <button style={botao(aba === "ata")} onClick={() => setAba("ata")}>Por ata</button>
        {aba === "ata" && (
          <select value={ataId} onChange={e => setAtaId(e.target.value)} style={{ flex: "1 1 240px", minWidth: 0, background: K.fundo2, color: K.texto, border: `1px solid ${K.borda}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit" }}>
            <option value="">Selecione uma ata…</option>
            {analises.map(a => <option key={a.ata.id} value={a.ata.id}>{a.ata.numero} — {a.ata.fornecedor} ({pctTxt(a.pct)} consumido)</option>)}
          </select>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setTick(t => t + 1)} disabled={demo} style={{ ...botao(false), padding: "8px 12px", opacity: demo ? 0.4 : 1 }} title="Recarregar empenhos">↻</button>
          <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 12, color: K.sub, cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={demo} onChange={e => setDemo(e.target.checked)} style={{ accentColor: K.laranja }} /> Modo demonstração
          </label>
        </div>
      </div>

      {demo && <div style={{ background: "#FF7A0022", border: `1px solid ${K.laranja}66`, color: "#9a4a00", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, marginBottom: 14 }}>Dados fictícios apenas para demonstração — nada aqui é salvo e nenhuma ata real é alterada.</div>}
      {!demo && erroTabela && <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", color: "#92400e", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, marginBottom: 14 }}>O controle de empenhos ainda não foi ativado no banco (tabela ata_empenhos). O dashboard mostra o consumo pelos itens das atas; os gráficos por mês e por secretaria dependem dos empenhos.</div>}
      {!demo && carregando && <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>Carregando empenhos…</div>}

      {aba === "geral" && <ResumoGeral analises={analises} onAbrir={abrir} mobile={mobile} />}
      {aba === "ata" && (atual
        ? <DetalheAta key={atual.ata.id + (demo ? "d" : "")} analise={atual} mobile={mobile} />
        : (
          <Cartao titulo="Escolha uma ata" sub="Selecione acima ou clique em uma das atas">
            {analises.length === 0 ? <div style={{ color: K.sub, fontSize: 13 }}>Nenhuma ata cadastrada.</div> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                {analises.map(a => (
                  <div key={a.ata.id} onClick={() => abrir(a.ata.id)} style={{ background: K.fundo2, border: `1px solid ${K.borda}`, borderRadius: 10, padding: 14, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><b style={{ color: K.laranja }}>{a.ata.numero}</b><Selo cor={a.sit.cor}>{a.sit.rot}</Selo></div>
                    <div style={{ fontSize: 12.5, color: K.texto, margin: "7px 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.ata.objeto}</div>
                    <div style={{ fontSize: 11.5, color: K.sub, marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.ata.fornecedor}</div>
                    <Progresso pct={a.pct} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: K.sub, marginTop: 6 }}><span>{pctTxt(a.pct)} consumido</span><span style={{ color: K.verde }}>{compacto(a.saldo)} de saldo</span></div>
                  </div>
                ))}
              </div>
            )}
          </Cartao>
        ))}
    </div>
  );
}
