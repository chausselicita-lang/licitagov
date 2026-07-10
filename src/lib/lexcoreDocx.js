// LexCore — gerador de .docx da peça jurídica (Node/Vercel only)
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageNumber, Footer } from "docx";

const TITULOS_PECA = {
  impugnacao: "IMPUGNAÇÃO AO EDITAL",
  razoes_recurso: "RAZÕES DE RECURSO ADMINISTRATIVO",
  contrarrazoes: "CONTRARRAZÕES DE RECURSO",
  peticao: "PETIÇÃO",
};

// A IA devolve texto corrido; parágrafos separados por linha em branco.
function splitParagrafos(texto) {
  return String(texto || "")
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);
}

export async function buildLexcorePecaDocx({ tipoPeca, conteudoGerado, nomeEdital, numeroProcesso }) {
  const titulo = TITULOS_PECA[tipoPeca] || "PEÇA JURÍDICA";
  const paragrafos = splitParagrafos(conteudoGerado);

  const children = [
    new Paragraph({
      children: [new TextRun({ text: titulo, bold: true, size: 26 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
  ];

  if (nomeEdital || numeroProcesso) {
    children.push(new Paragraph({
      children: [new TextRun({
        text: [nomeEdital, numeroProcesso ? `Processo nº ${numeroProcesso}` : null].filter(Boolean).join(" — "),
        size: 18, italics: true,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }));
  }

  paragrafos.forEach(p => {
    children.push(new Paragraph({
      children: [new TextRun({ text: p, size: 22 })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200, line: 360 },
    }));
  });

  const doc = new Document({
    creator: "LicitaGov — LexCore",
    title: `${titulo}${nomeEdital ? ` — ${nomeEdital}` : ""}`,
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

export function nomeArquivoPeca({ tipoPeca, numeroProcesso }) {
  const base = (TITULOS_PECA[tipoPeca] || "peca").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const sufixo = numeroProcesso ? `-${String(numeroProcesso).replace(/[^a-z0-9]+/gi, "-")}` : "";
  return `${base}${sufixo}.docx`;
}
