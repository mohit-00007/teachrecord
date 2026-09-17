import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules', '@mediapipe', 'selfie_segmentation');
const dst = path.join(root, 'public', 'mediapipe');

const required = [
  'selfie_segmentation.js',
  'selfie_segmentation.binarypb',
  'selfie_segmentation.tflite',
  'selfie_segmentation_landscape.tflite',
  'selfie_segmentation_solution_simd_wasm_bin.js',
  'selfie_segmentation_solution_simd_wasm_bin.wasm',
  'selfie_segmentation_solution_wasm_bin.js',
  'selfie_segmentation_solution_wasm_bin.wasm',
];

await mkdir(dst, { recursive: true });

if (!existsSync(src)) {
  throw new Error('MediaPipe package is missing. Run `npm install` before building the offline release.');
}

for (const file of required) {
  const from = path.join(src, file);
  const to = path.join(dst, file);
  if (!existsSync(from)) throw new Error(`Missing MediaPipe asset: ${file}`);
  await copyFile(from, to);
}

const pkg = JSON.parse(await readFile(path.join(src, 'package.json'), 'utf8'));
await writeFile(path.join(dst, 'VERSION.json'), JSON.stringify({
  package: '@mediapipe/selfie_segmentation',
  version: pkg.version,
  offline: true,
  assets: required,
}, null, 2));

console.log(`Prepared ${required.length} MediaPipe assets for offline runtime: ${dst}`);
