# TeachRecord — Production Offline Runtime

## Runtime guarantee
The Windows application is designed to perform camera capture, screen capture, recording, and AI background segmentation without a network connection after installation.

The AI pipeline bundles the MediaPipe Selfie Segmentation runtime, WASM binaries, and TFLite models inside `public/mediapipe/` during the build.

## Build requirement
The **build machine** needs internet access the first time so `npm install` can obtain the pinned dependency:

`@mediapipe/selfie_segmentation@0.1.1675465747`

After `npm install` has completed, the application itself does not use a CDN for AI assets.

## Build

```powershell
npm install
npm run lint
npm run build:exe
```

The build intentionally fails if any required AI asset is missing. This prevents shipping an installer that silently depends on the internet.

## Offline QA

1. Install the generated NSIS installer.
2. Disconnect Wi-Fi/Ethernet.
3. Start TeachRecord.
4. Select Front Camera Studio → AI Remove Background.
5. Confirm the subject is segmented with no network request.
6. Record Screen + Camera.
7. Stop and replay the recording.
8. Test AI Remove, AI Blur, Studio, and Chroma Key.

## Bundled assets

- selfie_segmentation.js
- selfie_segmentation.binarypb
- selfie_segmentation.tflite
- selfie_segmentation_landscape.tflite
- selfie_segmentation_solution_simd_wasm_bin.js/.wasm
- selfie_segmentation_solution_wasm_bin.js/.wasm

MediaPipe Selfie Segmentation is distributed under Apache-2.0. Keep the upstream license/attribution with the release.


Offline font fix: Google Fonts runtime links were removed. Canvas typography uses local system fonts so the packaged desktop app does not require fonts.googleapis.com or fonts.gstatic.com.
