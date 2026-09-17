import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelRoot = path.join(root, 'public', 'models', 'onnx-community', 'modnet-webnn');
const onnxDir = path.join(modelRoot, 'onnx');
const wasmDir = path.join(root, 'public', 'transformers-wasm');

const files = [
  ['config.json', 'https://huggingface.co/onnx-community/modnet-webnn/resolve/main/config.json?download=true'],
  ['preprocessor_config.json', 'https://huggingface.co/onnx-community/modnet-webnn/resolve/main/preprocessor_config.json?download=true'],
  ['quantize_config.json', 'https://huggingface.co/onnx-community/modnet-webnn/resolve/main/quantize_config.json?download=true'],
];
const modelUrls = {
  quantized: 'https://huggingface.co/onnx-community/modnet-webnn/resolve/main/onnx/model_quantized.onnx?download=true',
  fp16: 'https://huggingface.co/onnx-community/modnet-webnn/resolve/main/onnx/model_fp16.onnx?download=true',
};

await fs.mkdir(onnxDir, { recursive: true });
await fs.mkdir(wasmDir, { recursive: true });

async function downloadIfMissing(url, target) {
  try {
    const stat = await fs.stat(target);
    if (stat.size > 0) {
      console.log(`[pro-matte] present: ${path.relative(root, target)}`);
      return;
    }
  } catch {}
  console.log(`[pro-matte] downloading ${url}`);
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(target, buffer);
  console.log(`[pro-matte] saved ${path.relative(root, target)} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

for (const [name, url] of files) await downloadIfMissing(url, path.join(modelRoot, name));
await downloadIfMissing(modelUrls.quantized, path.join(onnxDir, 'model_quantized.onnx'));
await downloadIfMissing(modelUrls.fp16, path.join(onnxDir, 'model_fp16.onnx'));

const transformersDist = path.join(root, 'node_modules', '@huggingface', 'transformers', 'dist');
try {
  const entries = await fs.readdir(transformersDist, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.wasm')) continue;
    const src = path.join(entry.parentPath || transformersDist, entry.name);
    const dst = path.join(wasmDir, entry.name);
    await fs.copyFile(src, dst);
    console.log(`[pro-matte] staged WASM: ${entry.name}`);
  }
} catch (error) {
  throw new Error(`Could not stage Transformers.js WASM assets. Run npm install first. ${error.message}`);
}

const required = [
  path.join(modelRoot, 'config.json'),
  path.join(modelRoot, 'preprocessor_config.json'),
  path.join(onnxDir, 'model_quantized.onnx'),
  path.join(onnxDir, 'model_fp16.onnx'),
];
for (const file of required) {
  const stat = await fs.stat(file);
  if (stat.size === 0) throw new Error(`Required Pro Matte asset is empty: ${file}`);
}
console.log('[pro-matte] local MODNet assets are ready.');
