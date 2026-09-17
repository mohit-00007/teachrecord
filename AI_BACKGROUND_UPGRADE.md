# TeachRecord – AI Background Upgrade

## Added
- AI Remove Background toggle in Front Camera settings.
- Three AI presentation modes: Remove, Blur, Studio.
- Edge Feather control for cleaner subject boundaries.
- AI background blur strength control.
- AI inference throttled to ~18 FPS so 1080p recording stays responsive.
- Segmentation is performed in the renderer; camera frames are not sent to a TeachRecord server.
- Graceful fallback to the normal camera feed while the model warms up.
- Existing Chroma Key remains available for fully offline green/blue-screen workflows.

## Runtime requirement
The current AI implementation loads MediaPipe Selfie Segmentation from jsDelivr the first time the feature is enabled. This keeps the installer small and avoids bundling the legacy MediaPipe runtime. An internet connection is therefore required for the first AI initialization unless the runtime assets are later vendored into `public/mediapipe/`.

MediaPipe's Selfie Segmentation is designed for real-time human segmentation and is suitable for webcam/selfie scenarios. See the Google MediaPipe documentation for model details.

## Build
```powershell
npm install
npm run build:exe
```
