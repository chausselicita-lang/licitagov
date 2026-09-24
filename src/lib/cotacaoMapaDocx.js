// Mapa Comparativo de Preços — pesquisa por item via MCP (PNCP + Painel de
// Preços). Padrão visual segue LexCore (src/lib/lexcoreDocx.js): Times New
// Roman, margens iguais, footer com número de página. Node/Vercel only.
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, PageNumber, Footer,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from "docx";

function fmtBRL(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(String(d).length <= 10 ? `${d}T00:00:00` : d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-BR");
}

function mediana(valores) {
  const nums = valores.filter(v => typeof v === "number" && !Number.isNaN(v)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const meio = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[meio] : (nums[meio - 1] + nums[meio]) / 2;
}

const FONTE_LABEL = { pncp: "PNCP", painel_precos: "Painel de Preços", web_search: "Web" };

const CELL_BORDER = { style: BorderStyle.SINGLE, size: 2, color: "D0D0D0" };
const BORDERS_ALL = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };

function headerCell(texto, width) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: "1F2937" },
    borders: BORDERS_ALL,
    children: [new Paragraph({
      children: [new TextRun({ text: texto, bold: true, color: "FFFFFF", size: 16 })],
    })],
  });
}

function cell(texto, { width, bold = false, align = AlignmentType.LEFT, fill } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    borders: BORDERS_ALL,
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text: String(texto ?? "—"), bold, size: 16 })],
    })],
  });
}

/**
 * @param {{cotacao:{numero:string,objeto:string,processo?:string,dataCriacao?:string}, itens:Array<{descricao:string,unidade?:string,qtd?:number,fontes:Array<{fonte:string,fornecedor?:string,valor_unitario:number,orgao_referencia?:string,data_referencia?:string,url?:string}>}>}} params
 */
export async function buildMapaComparativoDocx({ cotacao, itens }) {
  const children = [
    new Paragraph({
      children: [new TextRun({ text: "MAPA COMPARATIVO DE PREÇOS", bold: true, size: 26 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Pesquisa de preços — art. 23 da Lei nº 14.133/2021, fontes oficiais (PNCP e Painel de Preços)", italics: true, size: 18 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: [
          `Cotação: ${cotacao.numero || "—"}`,
          cotacao.processo ? `Processo nº ${cotacao.processo}` : null,
          cotacao.dataCriacao ? `Data: ${fmtDate(cotacao.dataCriacao)}` : null,
        ].filter(Boolean).join("  —  "),
        size: 18,
      })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Objeto: ${cotacao.objeto || "—"}`, size: 18 })],
      spacing: { after: 260 },
    }),
  ];

  let totalGeral = 0;

  for (const item of itens) {
    const valores = item.fontes.map(f => Number(f.valor_unitario)).filter(v => v > 0);
    const med = mediana(valores);
    const qtd = Number(item.qtd) || 0;
    const totalItem = (med || 0) * qtd;
    totalGeral += totalItem;

    children.push(new Paragraph({
      children: [new TextRun({ text: `${item.descricao}${item.unidade ? ` (${item.unidade})` : ""}`, bold: true, size: 20 })],
      spacing: { before: 200, after: 100 },
    }));

    const rows = [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell("Fonte", 12),
          headerCell("Descrição / Fornecedor", 30),
          headerCell("Órgão de referência", 22),
          headerCell("Data", 12),
          headerCell("Valor Unit.", 12),
          headerCell("Link", 12),
        ],
      }),
      ...item.fontes.map(f => new TableRow({
        children: [
          cell(FONTE_LABEL[f.fonte] || f.fonte, { width: 12 }),
          cell(f.fornecedor || f.descricao || "—", { width: 30 }),
          cell(f.orgao_referencia || "—", { width: 22 }),
          cell(fmtDate(f.data_referencia), { width: 12, align: AlignmentType.CENTER }),
          cell(fmtBRL(f.valor_unitario), { width: 12, align: AlignmentType.RIGHT }),
          cell(f.url ? "ver fonte" : "—", { width: 12, align: AlignmentType.CENTER }),
        ],
      })),
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 4,
            width: { size: 76, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: "FEF3C7" },
            borders: BORDERS_ALL,
            children: [new Paragraph({
              children: [new TextRun({ text: "MEDIANA — Valor de Referência (art. 23, Lei 14.133/2021)", bold: true, size: 16 })],
            })],
          }),
          cell(med != null ? fmtBRL(med) : "—", { width: 12, bold: true, align: AlignmentType.RIGHT, fill: "FEF3C7" }),
          cell(qtd ? fmtBRL(totalItem) : "—", { width: 12, bold: true, align: AlignmentType.RIGHT, fill: "FEF3C7" }),
        ],
      }),
    ];

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    }));
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: `VALOR TOTAL DE REFERÊNCIA DA COTAÇÃO: ${fmtBRL(totalGeral)}`, bold: true, size: 22 })],
    alignment: AlignmentType.RIGHT,
    spacing: { before: 300 },
  }));

  const doc = new Document({
    creator: "LicitaGov — GovCore",
    title: `Mapa Comparativo de Preços — ${cotacao.numero || ""}`,
    styles: {
      default: { document: { run: { font: "Times New Roman" } } },
    },
    sections: [{
      properties: { page: { margin: { top: 1700, bottom: 1700, left: 1417, right: 1134 } } },
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

export function nomeArquivoMapaComparativo({ numero }) {
  const base = (numero || "mapa-comparativo").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `mapa-comparativo-${base}.docx`;
}
