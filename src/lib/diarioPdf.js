// Diário Oficial — gerador de .pdf da edição consolidada (Node/Vercel only).
// Mesmo padrão de dispensaPdf.js: pdfmake/pdfkit com fonte Helvetica padrão,
// sem dependência de binários externos (LibreOffice/Chromium).
import PdfPrinter from "pdfmake";
import { labelCaderno } from "./diarioConstants.js";

const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

function fmtDataExtenso(dataISO) {
  const d = new Date(dataISO + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// materias: [{ caderno, titulo, corpo, orgaoNome }], já ordenadas por `ordem`.
export function buildEdicaoPdfBuffer({ municipio, uf, numero, anoSerie, dataPublicacao, materias }) {
  const porCaderno = new Map();
  materias.forEach(m => {
    const lista = porCaderno.get(m.caderno) || [];
    lista.push(m);
    porCaderno.set(m.caderno, lista);
  });

  const content = [
    { text: `DIÁRIO OFICIAL ELETRÔNICO DO MUNICÍPIO${municipio ? ` DE ${municipio.toUpperCase()}` : ""}`, style: "titulo" },
    { text: `Edição nº ${numero} · Ano ${anoSerie} · ${fmtDataExtenso(dataPublicacao)}`, alignment: "center", margin: [0, 0, 0, 20] },
  ];

  if (materias.length === 0) {
    content.push({ text: "Nenhuma matéria publicada nesta edição.", italics: true, alignment: "center" });
  }

  for (const [caderno, itens] of porCaderno) {
    content.push({ text: labelCaderno(caderno).toUpperCase(), style: "caderno" });
    itens.forEach(m => {
      content.push({ text: m.titulo, style: "materiaTitulo" });
      if (m.orgaoNome) content.push({ text: m.orgaoNome, style: "materiaOrgao" });
      content.push({ text: m.corpo, style: "materiaCorpo" });
    });
  }

  const docDefinition = {
    content,
    defaultStyle: { font: "Helvetica", fontSize: 10, lineHeight: 1.3 },
    styles: {
      titulo: { fontSize: 13, bold: true, alignment: "center", margin: [0, 0, 0, 4] },
      caderno: { fontSize: 11, bold: true, margin: [0, 16, 0, 8], decoration: "underline" },
      materiaTitulo: { fontSize: 10, bold: true, margin: [0, 8, 0, 2] },
      materiaOrgao: { fontSize: 8, italics: true, color: "#444444", margin: [0, 0, 0, 4] },
      materiaCorpo: { fontSize: 10, alignment: "justify", margin: [0, 0, 0, 6] },
    },
    pageMargins: [56, 56, 56, 56],
    footer: (currentPage, pageCount) => ({
      text: `Edição ${numero}/${anoSerie} — página ${currentPage} de ${pageCount}`,
      alignment: "center", fontSize: 7, color: "#666666", margin: [0, 8, 0, 0],
    }),
    info: {
      title: `Diário Oficial — Edição ${numero}/${anoSerie}`,
      creator: "GovCore — Diário Oficial",
    },
  };

  const printer = new PdfPrinter(fonts);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  return new Promise((resolve, reject) => {
    const chunks = [];
    pdfDoc.on("data", c => chunks.push(c));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}
