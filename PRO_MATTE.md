# TeachRecord Pro Matte

TeachRecord includes an optional high-quality portrait matting engine based on the Apache-2.0 licensed ONNX Community MODNet model. The model is downloaded/staged at build time and is packaged locally with the Windows application. Runtime model loading is configured to disallow remote model access.

- **Auto**: prefers Pro Matte; falls back to the realtime MediaPipe engine if the local MODNet engine cannot initialize.
- **Pro Matte**: MODNet portrait matting, WebGPU when available, WASM fallback.
- **Realtime**: existing lightweight MediaPipe segmentation.

The bundled MODNet WebNN model is published by `onnx-community/modnet-webnn` and exposes quantized, FP16 and FP32 ONNX variants. TeachRecord uses the compact quantized variant for the realtime desktop path. See the model card and Transformers.js local-model configuration documentation for details.
