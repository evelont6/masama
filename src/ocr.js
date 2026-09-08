import { parseReceiptText } from './receipt.js';

async function prepareImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally { URL.revokeObjectURL(url); }
}

export async function scanReceipt(file, onProgress, signal, { currency = 'IDR', language = 'id' } = {}) {
  let worker;
  let timer;
  let abort;
  const stopped = new Promise((_, reject) => {
    abort = () => reject(new DOMException('Scan dibatalkan.', 'AbortError'));
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => reject(new Error('Scan terlalu lama. Coba foto yang lebih jelas atau isi manual.')), 120_000);
  });
  let finished = false;
  const run = async () => {
    const { createWorker } = await import('tesseract.js');
    if (finished) return;
    const base = new URL(`${import.meta.env.BASE_URL}ocr/`, location.origin).href;
    onProgress(language === 'en' ? 'Preparing receipt scanner. The first download may take a moment...' : 'Menyiapkan pembaca struk. Unduhan pertama bisa memerlukan waktu...');
    worker = await createWorker('eng', 1, {
      workerPath: `${base}worker.min.js`,
      corePath: base,
      langPath: base,
      workerBlobURL: false,
      logger: message => {
        if (!finished && message.status === 'recognizing text') onProgress(`${language === 'en' ? 'Reading receipt' : 'Membaca struk'}: ${Math.round(message.progress * 100)}%`);
      },
      errorHandler: () => {},
    });
    if (finished) { await worker.terminate(); return; }
    const image = await prepareImage(file);
    if (finished) return;
    await worker.setParameters({ preserve_interword_spaces: '1' });
    const { data } = await worker.recognize(image);
    return parseReceiptText(data.text, currency);
  };
  try { return await Promise.race([run(), stopped]); }
  finally {
    finished = true;
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
    if (worker) await worker.terminate();
  }
}
