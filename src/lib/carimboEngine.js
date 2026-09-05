import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

function hexToRgb01(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#1a1a6e');
  if (!m) return rgb(0.1, 0.1, 0.43);
  return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
}

// Le as dimensoes reais (px) de um PNG a partir dos bytes, sem precisar de
// canvas/Image (funciona igual em worker e em main thread) - o cabecalho
// IHDR do PNG guarda largura/altura nos bytes 16-24.
function pngDimensions(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/**
 * Mescla os PDFs (na ordem recebida) em um unico documento e carimba cada
 * pagina com o carimbo oficial (que ja inclui a rubrica desenhada na
 * propria imagem) + numero de folha sequencial, usando as posicoes
 * relativas de `config`. Roda tanto na main thread quanto no Web Worker.
 *
 * @param {ArrayBuffer[]} pdfBuffers - PDFs na ordem final desejada
 * @param {Uint8Array} carimboPngBytes
 * @param {ArrayBuffer} fontBytes - fonte manuscrita (Caveat) em TTF
 * @param {object} config - carimbo_config (camelCase, ver carimboDb.js)
 * @param {number} startNumber
 * @param {(done:number, total:number)=>void} onProgress
 * @returns {Promise<{bytes: Uint8Array, totalFolhas: number, numeroFinal: number}>}
 */
export async function stampPdfs({ pdfBuffers, carimboPngBytes, fontBytes, config, startNumber, onProgress }) {
  const merged = await PDFDocument.create();
  merged.registerFontkit(fontkit);

  for (const buf of pdfBuffers) {
    const src = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }

  const totalFolhas = merged.getPageCount();
  const carimboImg = await merged.embedPng(carimboPngBytes);
  const font = await merged.embedFont(fontBytes, { subset: true });
  const numeroColor = hexToRgb01(config.numeroColor);

  const carimboDim = pngDimensions(carimboPngBytes);
  const carimboAspect = carimboDim.height / carimboDim.width;

  const pages = merged.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width: pageW, height: pageH } = page.getSize();
    const numero = startNumber + i;

    const carimboW = config.carimboWidthPct * pageW;
    const carimboH = carimboW * carimboAspect;
    const carimboLeft = config.posCarimboX * pageW;
    const carimboTopFromTop = config.posCarimboY * pageH;
    const carimboBottomY = pageH - carimboTopFromTop - carimboH;

    page.drawImage(carimboImg, { x: carimboLeft, y: carimboBottomY, width: carimboW, height: carimboH });

    const numeroText = String(numero);
    const fontSize = config.numeroFontSize;
    const textWidth = font.widthOfTextAtSize(numeroText, fontSize);
    const numeroCenterX = carimboLeft + config.posNumeroX * carimboW;
    const numeroCenterYFromTop = config.posNumeroY * carimboH;
    const numeroCenterY = carimboBottomY + carimboH - numeroCenterYFromTop;
    page.drawText(numeroText, {
      x: numeroCenterX - textWidth / 2,
      y: numeroCenterY - fontSize * 0.35,
      size: fontSize,
      font,
      color: numeroColor,
    });

    if (onProgress && (i % 5 === 0 || i === pages.length - 1)) onProgress(i + 1, totalFolhas);
  }

  const bytes = await merged.save();
  return { bytes, totalFolhas, numeroFinal: startNumber + totalFolhas - 1 };
}
