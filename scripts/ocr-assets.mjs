import { mkdir, copyFile } from 'node:fs/promises';
const target = 'public/ocr';
await mkdir(target, { recursive: true });
const assets = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt', 'worker.min.js.LICENSE.txt'],
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
  ['node_modules/tesseract.js/LICENSE.md', 'LICENSE-tesseract.txt'],
  ['node_modules/tesseract.js-core/LICENSE', 'LICENSE-core.txt'],
];
for (const suffix of ['lstm', 'simd-lstm', 'relaxedsimd-lstm']) {
  const name = `tesseract-core-${suffix}.wasm.js`;
  assets.push([`node_modules/tesseract.js-core/${name}`, name]);
}
for (const [source, name] of assets) await copyFile(source, `${target}/${name}`);
console.log('Local OCR assets ready.');
