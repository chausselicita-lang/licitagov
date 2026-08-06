// Planejamento Assistido por IA — gerador de .docx das peças (Node/Vercel only)
// Mesmo padrão do lexcoreDocx.js (lib "docx", não docxtemplater — as peças
// são texto dinâmico, não preenchimento de template fixo).
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageNumber, Footer, Table, TableRow, TableCell, WidthType } from "docx";

const TITULOS_PECA_PLANEJAMENTO = {
  dfd: "DOCUMENTO DE FORMALIZAÇÃO DA DEMANDA — DFD",
  etp: "ESTUDO TÉCNICO PRELIMINAR — ETP",
  tr: "TERMO DE REFERÊNCIA",
  mapa_riscos: "MAPA DE RISCOS",
};

// Linha curta e (quase) toda em maiúsculas = título de seção (ex.: "1 — DEFINIÇÃO
// DO OBJETO", "DECLARAÇÃO DE VIABILIDADE") — ignora dígitos/pontuação na comparação.
function isHeaderLine(line) {
  if (!line || line.length > 100) return false;
  const letras = line.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (!letras) return false;
  return letras === letras.toUpperCase();
}

// A IA separa parágrafos/seções por linha em branco; dentro de um bloco,
// linhas simples só ocorrem nas tabelas (" | " em cada linha).
function blocosDoTexto(texto) {
  return String(texto || "")
    .split(/\n{2,}/)
    .map(b => b.trim())
    .filter(Boolean)
    .map(b => b.split(/\n/).map(l => l.trim()).filter(Boolean));
}

function celula(texto, { header = false } = {}) {
  return new TableCell({
    shading: header ? { fill: "1a1a1a" } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: texto, size: 17, bold: header, color: header ? "ffffff" : undefined })] })],
  });
}

function tabelaDoBloco(linhas) {
  const [header, ...linhasDados] = linhas;
  const rows = [
    new TableRow({ tableHeader: true, children: header.split(" | ").map(c => celula(c.trim(), { header: true })) }),
    ...linhasDados.map(linha => new TableRow({ children: linha.split(" | ").map(c => celula(c.trim())) })),
  ];
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

export async function buildPlanejamentoDocx({ tipoPeca, conteudoGerado, processoObjeto, numeroProcesso }) {
  const titulo = TITULOS_PECA_PLANEJAMENTO[tipoPeca] || "DOCUMENTO DE PLANEJAMENTO";
  const blocos = blocosDoTexto(conteudoGerado);

  const children = [
    new Paragraph({
      children: [new TextRun({ text: titulo, bold: true, size: 26 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
  ];

  if (processoObjeto || numeroProcesso) {
    children.push(new Paragraph({
      children: [new TextRun({
        text: [processoObjeto, numeroProcesso ? `Processo nº ${numeroProcesso}` : null].filter(Boolean).join(" — "),
        size: 18, italics: true,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }));
  }

  blocos.forEach(linhas => {
    const ehTabela = linhas.length > 1 && linhas.every(l => l.includes(" | "));
    if (ehTabela) {
      children.push(tabelaDoBloco(linhas));
      children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      return;
    }
    const texto = linhas.join(" ");
    const ehTitulo = linhas.length === 1 && isHeaderLine(linhas[0]);
    children.push(new Paragraph({
      children: [new TextRun({ text: texto, size: 22, bold: ehTitulo })],
      alignment: ehTitulo ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
      spacing: { before: ehTitulo ? 200 : 0, after: 200, line: 360 },
    }));
  });

  const doc = new Document({
    creator: "LicitaGov — Planejamento Assistido por IA",
    title: `${titulo}${processoObjeto ? ` — ${processoObjeto}` : ""}`,
    styles: {
      default: { document: { run: { font: "Times New Roman" } } },
    },
    sections: [{
      properties: { page: { margin: { top: 1700, bottom: 1700, left: 1700, right: 1134 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 16 })],
          })],
        }),
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}

export function nomeArquivoPlanejamento({ tipoPeca, numeroProcesso }) {
  const base = (TITULOS_PECA_PLANEJAMENTO[tipoPeca] || tipoPeca).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const sufixo = numeroProcesso ? `-${String(numeroProcesso).replace(/[^a-z0-9]+/gi, "-")}` : "";
  return `${base}${sufixo}.docx`;
}
