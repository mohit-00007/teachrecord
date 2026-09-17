# TeachRecord Pro — Production Upgrade

## Benchmark review

The uploaded ScreenPal installer was inspected as a Windows PE/Nullsoft installer. It is a **Web Launcher installer**, not the recorder/editor payload itself, so the installer alone cannot expose ScreenPal's internal recording implementation.

The product benchmark was therefore taken from ScreenPal's current public feature documentation: screen/webcam recording, area/window/full-screen capture, background removal, drawing/annotations, trimming/editing, captions, audio, and local/offline recording are all part of the current product surface.

## Changes in this TeachRecord build

### AI background removal
- General segmentation model is the default quality mode.
- Speed mode can use the landscape model on lower-powered hardware.
- Segmentation confidence is temporally smoothed.
- Raw model confidence is converted to a hard/soft alpha matte instead of directly blurring the mask.
- The matte is processed at a controlled resolution to reduce CPU pressure.
- Camera and mask mirroring now use the same transform.
- Render-loop canvases are reused rather than allocated on every frame.
- AI quality controls expose Quality / Balanced / Speed.

### Recording reliability
- Recording chunks are persisted locally during capture.
- If the renderer crashes or the app is accidentally reloaded, TeachRecord can recover the unfinished recording on the next launch.
- Recovery data is stored in IndexedDB and removed after successful finalization.

### Recording quality
- Higher screen-text-oriented bitrate (5.5 Mbps video / 160 kbps audio).
- Two-second MediaRecorder slices provide a better durability/performance balance.

### Desktop security
- Electron renderer sandbox enabled.
- Node integration remains disabled.
- Context isolation remains enabled.
- External navigation is blocked from the local app and opened in the system browser.
- Device permissions are limited to camera/microphone.

### Offline release validation
- MediaPipe runtime, model, and WASM assets are bundled locally.
- Build validation fails if required AI assets are missing.
- Build validation fails if the production HTML contains the known CDN/font runtime dependencies.

## Remaining strategic upgrades

For a full commercial product, the next major layers are:

1. Native region/area capture overlay.
2. Native MP4 export using a bundled encoder.
3. Non-destructive timeline editor with trim/cut/split.
4. Offline speech-to-text captions and chapter generation.
5. Cursor spotlight/click effects captured into the recording.
6. GPU-accelerated portrait matting for substantially better hair/edge quality than lightweight selfie segmentation.
7. Crash-safe project files rather than only recovery chunks.
8. Automated Windows installer signing and release CI.
