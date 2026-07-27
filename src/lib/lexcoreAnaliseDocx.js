// LexCore — gerador do .docx de "Análise Completa" (relatório informal
// com todos os pontos críticos de uma análise, independente de seleção).
// Node/Vercel only. Não confundir com lexcoreDocx.js (esse gera a peça
// jurídica formal — Impugnação/Recurso/Contrarrazões/Petição).
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageNumber, Footer } from "docx";
import { sanitizeStorageFileName } from "./storageSafeName.js";
import { TIPOS_PROBLEMA, labelTipoProblema } from "./lexcoreLegal.js";

const NIVEIS_RISCO = ["alto", "medio", "baixo"];
const RISCO_LABEL = { alto: "RISCO ALTO", medio: "RISCO MÉDIO", baixo: "RISCO BAIXO" };
// Mesmos tons de RISCO_COLOR em src/App.jsx, sem o "#" (TextRun.color espera hex puro).
const RISCO_COLOR_HEX = { alto: "b91c1c", medio: "b45309", baixo: "15803d" };

function contarPorNivel(pontos) {
  return NIVEIS_RISCO.map(nivel => ({ nivel, itens: pontos.filter(p => p.nivelRisco === nivel) }));
}

function formatarData(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? "—" : d.toLocaleDateString("pt-BR");
}

export async function buildLexcoreAnaliseDocx({ nomeEdital, numeroProcesso, dataAnaliseISO, orgaoNome, pontos }) {
  const grupos = contarPorNivel(pontos);
  const children = [
    new Paragraph({
      children: [new TextRun({ text: "ANÁLISE DE EDITAL — RELATÓRIO DE PONTOS CRÍTICOS", bold: true, size: 26 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `${nomeEdital || "Edital sem nome"} — Processo nº ${numeroProcesso || "Sem número"}`,
        size: 20, italics: true,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `Órgão: ${orgaoNome || "não informado"}    |    Data da análise: ${formatarData(dataAnaliseISO)}`,
        size: 18, color: "555555",
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "RESUMO EXECUTIVO", bold: true, size: 22 })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Total de pontos críticos identificados: ${pontos.length}`, size: 20 })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `Risco Alto: ${grupos.find(g => g.nivel === "alto").itens.length}   |   Risco Médio: ${grupos.find(g => g.nivel === "medio").itens.length}   |   Risco Baixo: ${grupos.find(g => g.nivel === "baixo").itens.length}`,
        size: 20,
      })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: TIPOS_PROBLEMA.map(t => `${t.label}: ${pontos.filter(p => p.tipoProblema === t.value).length}`).join("   |   "),
        size: 20,
      })],
      spacing: { after: 300 },
    }),
  ];

  grupos.filter(g => g.itens.length > 0).forEach(g => {
    children.push(new Paragraph({
      children: [new TextRun({ text: `${RISCO_LABEL[g.nivel]} (${g.itens.length})`, bold: true, size: 22, color: RISCO_COLOR_HEX[g.nivel] })],
      spacing: { before: 200, after: 120 },
    }));

    g.itens.forEach(p => {
      children.push(new Paragraph({
        children: [new TextRun({
          text: `${labelTipoProblema(p.tipoProblema)}${p.artigoLei ? ` — ${p.artigoLei}` : ""}`,
          bold: true, size: 20,
        })],
        spacing: { after: 60 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: p.descricaoProblema, size: 20 })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 80, line: 300 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: `"${p.trechoEdital}"`, italics: true, size: 19, color: "555555" })],
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: 400 },
        spacing: { after: 80, line: 300 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: `Fundamentação: ${p.fundamentacaoLegal}`, size: 19 })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 240, line: 300 },
      }));
    });
  });

  const doc = new Document({
    creator: "LicitaGov — LexCore",
    title: `Análise de Edital — ${nomeEdital || "sem nome"}`,
    styles: {
      default: { document: { run: { font: "Calibri" } } },
    },
    sections: [{
      properties: { page: { margin: { top: 1700, bottom: 1700, left: 1700, right: 1134 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              text: `Documento gerado por LexCore — GovCore em ${new Date().toLocaleString("pt-BR")} — página `,
              size: 15, color: "888888",
            }), new TextRun({ children: [PageNumber.CURRENT], size: 15, color: "888888" })],
          })],
        }),
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}

export function nomeArquivoAnalise({ nomeEdital, numeroProcesso }) {
  const dataSlug = new Date().toISOString().slice(0, 10);
  const base = sanitizeStorageFileName(nomeEdital || "edital");
  const proc = numeroProcesso ? sanitizeStorageFileName(String(numeroProcesso)) : "sem_numero";
  return `Analise_${base}_${proc}_${dataSlug}.docx`;
}
