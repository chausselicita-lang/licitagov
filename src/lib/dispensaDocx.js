// Agente de Dispensas — gerador de .docx (Node/Vercel only)
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, PageBreak, Header, ImageRun, BorderStyle } from "docx";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Brasão do Município de Mascote/BA, extraído do modelo oficial (EMF do
// cabeçalho dos 5 .docx originais, rasterizado para PNG). Reproduz o
// cabeçalho do modelo real usado como referência deste gerador.
const brasaoPath = path.join(__dirname, "..", "assets", "brasao-mascote.png");
let brasaoBuffer = null;
try { brasaoBuffer = readFileSync(brasaoPath); } catch { /* segue sem brasão se o arquivo não existir */ }

const CAIXA_MARCADOR = /^\{\{CAIXA:(\d+)\}\}$/;

function buildTable(tabela) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: tabela.cabecalho.map(h => new TableCell({
      shading: { fill: "1a1a1a" },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 18 })] })],
    })),
  });
  const rows = tabela.linhas.map(linha => new TableRow({
    children: linha.map(v => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: String(v ?? ""), size: 18 })] })],
    })),
  }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...rows] });
}

// Caixa com borda (reproduz a caixa de protocolo / caixa de objeto do
// modelo original, que no .docx fonte são caixas de texto flutuantes).
function buildCaixa(caixa) {
  const borda = { style: BorderStyle.SINGLE, size: 4, color: "1a1a1a" };
  return new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    rows: [new TableRow({
      children: [new TableCell({
        borders: { top: borda, bottom: borda, left: borda, right: borda },
        margins: { top: 150, bottom: 150, left: 150, right: 150 },
        children: caixa.linhas.map(l => new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: l, size: 20 })],
          spacing: { after: 60 },
        })),
      })],
    })],
  });
}

export async function buildDocxBuffer(secoes, dados) {
  const children = [];

  children.push(
    new Paragraph({ text: `PROCESSO ADMINISTRATIVO Nº ${dados.numeroProcesso}`, alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
    new Paragraph({ text: `DISPENSA DE LICITAÇÃO Nº ${dados.numeroDispensa}`, alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
  );

  secoes.forEach((sec, idx) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: sec.titulo, bold: true, size: 26 })],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { before: idx === 0 ? 0 : 200, after: 200 },
        pageBreakBefore: idx > 0,
      })
    );

    sec.paragrafos.forEach(p => {
      const marcador = CAIXA_MARCADOR.exec(p);
      if (marcador && sec.caixas?.[Number(marcador[1])]) {
        children.push(buildCaixa(sec.caixas[Number(marcador[1])]));
        children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        return;
      }
      children.push(new Paragraph({
        children: [new TextRun({ text: p, size: 21 })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120 },
      }));
    });

    if (sec.tabela) {
      children.push(buildTable(sec.tabela));
      children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
    }

    (sec.paragrafosApos || []).forEach(p => {
      children.push(new Paragraph({
        children: [new TextRun({ text: p, size: 21 })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120 },
      }));
    });
  });

  const headerChildren = [];
  if (brasaoBuffer) {
    headerChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ data: brasaoBuffer, transformation: { width: 46, height: 60 }, type: "png" })],
    }));
  }
  headerChildren.push(
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Município de ${dados.municipio || ""}`, bold: true, size: 16 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `ESTADO DA ${dados.uf === "BA" ? "BAHIA" : (dados.uf || "")}`, size: 14 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Serviço Público Municipal", size: 14 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DEPARTAMENTO DE LICITAÇÕES E CONTRATOS", bold: true, size: 14 })], spacing: { after: 120 } }),
  );

  const doc = new Document({
    creator: "LicitaGov — Agente de Dispensas",
    title: `Dispensa ${dados.numeroDispensa} — Processo ${dados.numeroProcesso}`,
    styles: {
      default: { document: { run: { font: "Calibri" } } },
    },
    sections: [{
      properties: { page: { margin: { top: 1900, bottom: 1134, left: 1134, right: 1134 } } },
      headers: { default: new Header({ children: headerChildren }) },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}
