// Agente de Dispensas — gerador de .docx (Node/Vercel only)
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, PageBreak } from "docx";

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
  });

  const doc = new Document({
    creator: "LicitaGov — Agente de Dispensas",
    title: `Dispensa ${dados.numeroDispensa} — Processo ${dados.numeroProcesso}`,
    styles: {
      default: { document: { run: { font: "Calibri" } } },
    },
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}
