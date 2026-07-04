// Agente de Dispensas — gerador de .pdf (Node/Vercel only)
// Usa pdfmake/pdfkit com fontes padrão (Helvetica) — sem dependência de
// binários externos (LibreOffice/Chromium), compatível com serverless.
import PdfPrinter from "pdfmake";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Brasão do Município de Mascote/BA, extraído do modelo oficial (mesmo
// arquivo usado no cabeçalho do .docx — ver dispensaDocx.js).
const brasaoPath = path.join(__dirname, "..", "assets", "brasao-mascote.png");
let brasaoBase64 = null;
try { brasaoBase64 = `data:image/png;base64,${readFileSync(brasaoPath).toString("base64")}`; } catch { /* segue sem brasão se o arquivo não existir */ }

const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

const CAIXA_MARCADOR = /^\{\{CAIXA:(\d+)\}\}$/;

// Caixa com borda (reproduz a caixa de protocolo / caixa de objeto do
// modelo original).
function buildCaixa(caixa) {
  return {
    table: {
      widths: ["*"],
      body: [[{ stack: caixa.linhas.map(l => ({ text: l, alignment: "center", fontSize: 9 })), margin: [4, 4, 4, 4] }]],
    },
    layout: { hLineColor: () => "#1a1a1a", vLineColor: () => "#1a1a1a" },
    alignment: "center",
    margin: [0, 4, 0, 10],
  };
}

export function buildPdfBuffer(secoes, dados) {
  const content = [
    { text: `PROCESSO ADMINISTRATIVO Nº ${dados.numeroProcesso}`, alignment: "center", margin: [0, 0, 0, 2] },
    { text: `DISPENSA DE LICITAÇÃO Nº ${dados.numeroDispensa}`, alignment: "center", margin: [0, 0, 0, 16] },
  ];

  secoes.forEach((sec, idx) => {
    content.push({ text: sec.titulo, style: "titulo", pageBreak: idx > 0 ? "before" : undefined });
    sec.paragrafos.forEach(p => {
      const marcador = CAIXA_MARCADOR.exec(p);
      if (marcador && sec.caixas?.[Number(marcador[1])]) {
        content.push(buildCaixa(sec.caixas[Number(marcador[1])]));
        return;
      }
      content.push({ text: p, style: "paragrafo" });
    });
    if (sec.tabela) {
      content.push({
        table: {
          headerRows: 1,
          widths: sec.tabela.cabecalho.map(() => "*"),
          body: [
            sec.tabela.cabecalho.map(h => ({ text: h, bold: true, fillColor: "#1a1a1a", color: "#ffffff", fontSize: 7 })),
            ...sec.tabela.linhas.map(linha => linha.map(v => ({ text: String(v ?? ""), fontSize: 7 }))),
          ],
        },
        margin: [0, 6, 0, 12],
      });
    }
    (sec.paragrafosApos || []).forEach(p => content.push({ text: p, style: "paragrafo" }));
  });

  const docDefinition = {
    content,
    header: {
      margin: [0, 16, 0, 0],
      stack: [
        brasaoBase64 ? { image: brasaoBase64, width: 26, alignment: "center", margin: [0, 0, 0, 2] } : null,
        { text: `Município de ${dados.municipio || ""}`, bold: true, fontSize: 8, alignment: "center" },
        { text: `ESTADO DA ${dados.uf === "BA" ? "BAHIA" : (dados.uf || "")}`, fontSize: 7, alignment: "center" },
        { text: "Serviço Público Municipal", fontSize: 7, alignment: "center" },
        { text: "DEPARTAMENTO DE LICITAÇÕES E CONTRATOS", bold: true, fontSize: 7, alignment: "center" },
      ].filter(Boolean),
    },
    defaultStyle: { font: "Helvetica", fontSize: 10, lineHeight: 1.25 },
    styles: {
      titulo: { fontSize: 12, bold: true, alignment: "center", margin: [0, 0, 0, 10] },
      paragrafo: { alignment: "justify", margin: [0, 0, 0, 6] },
    },
    pageMargins: [56, 100, 56, 56],
    info: {
      title: `Dispensa ${dados.numeroDispensa} — Processo ${dados.numeroProcesso}`,
      creator: "LicitaGov — Agente de Dispensas",
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
