import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'public/mediapipe/selfie_segmentation.js',
  'public/mediapipe/selfie_segmentation.binarypb',
  'public/mediapipe/selfie_segmentation.tflite',
  'public/mediapipe/selfie_segmentation_landscape.tflite',
  'public/mediapipe/selfie_segmentation_solution_simd_wasm_bin.js',
  'public/mediapipe/selfie_segmentation_solution_simd_wasm_bin.wasm',
  'public/mediapipe/selfie_segmentation_solution_wasm_bin.js',
  'public/mediapipe/selfie_segmentation_solution_wasm_bin.wasm',
  'public/models/onnx-community/modnet-webnn/config.json',
  'public/models/onnx-community/modnet-webnn/preprocessor_config.json',
  'public/models/onnx-community/modnet-webnn/onnx/model_quantized.onnx',
  'public/models/onnx-community/modnet-webnn/onnx/model_fp16.onnx',
  'dist/index.html',
];

const missing = required.filter((file) => !existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Offline release validation failed. Missing:');
  for (const file of missing) console.error(`  - ${file}`);
  process.exit(1);
}

const indexHtml = readFileSync(path.join(root, 'dist/index.html'), 'utf8');
const forbiddenRuntimeHosts = ['cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'huggingface.co'];
const hits = forbiddenRuntimeHosts.filter((host) => indexHtml.includes(host));
if (hits.length) {
  console.error(`Offline release validation failed. External runtime hosts found: ${hits.join(', ')}`);
  process.exit(1);
}

console.log('Offline release validation passed: AI runtime assets are bundled and index.html has no forbidden CDN/font runtime dependency.');
