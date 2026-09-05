import { stampPdfs } from '../lib/carimboEngine.js';

self.onmessage = async (e) => {
  const { pdfBuffers, carimboPngBytes, fontBytes, config, startNumber } = e.data;
  try {
    const result = await stampPdfs({
      pdfBuffers,
      carimboPngBytes: new Uint8Array(carimboPngBytes),
      fontBytes,
      config,
      startNumber,
      onProgress: (done, total) => self.postMessage({ type: 'progress', done, total }),
    });
    self.postMessage({ type: 'done', bytes: result.bytes, totalFolhas: result.totalFolhas, numeroFinal: result.numeroFinal }, [result.bytes.buffer]);
  } catch (err) {
    self.postMessage({ type: 'error', message: err?.message || 'Erro ao processar os PDFs' });
  }
};
