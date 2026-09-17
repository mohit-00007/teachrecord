import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Monitor } from 'lucide-react';
import {
  AnnotationTool,
  AnnotationStroke,
  CameraShape,
  CameraSize,
  PipPosition,
  RecordingMode,
  TeacherBadgeConfig,
  WhiteboardTheme,
  LaserPoint,
  CameraVisualConfig,
  CameraBorderColor,
  VirtualBackdropTheme,
} from '../types';

interface RecorderCanvasProps {
  mode: RecordingMode;
  screenStream: MediaStream | null;
  cameraStream: MediaStream | null;
  cameraShape: CameraShape;
  cameraSize: CameraSize;
  isCameraMirrored: boolean;
  pipPosition: PipPosition;
  onChangePipPosition: (pos: PipPosition) => void;
  teacherBadge: TeacherBadgeConfig;
  whiteboardTheme: WhiteboardTheme;
  customSlideUrl: string | null;
  currentTool: AnnotationTool;
  currentColor: string;
  strokeWidth: number;
  strokes: AnnotationStroke[];
  onAddStroke: (stroke: AnnotationStroke) => void;
  onUpdateCurrentStroke?: (stroke: AnnotationStroke | null) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraVisuals?: CameraVisualConfig;
  micVolume?: number;
  onSwitchMode?: (mode: RecordingMode) => void;
  onStartScreenShare?: () => void;
}

export const RecorderCanvas: React.FC<RecorderCanvasProps> = ({
  mode,
  screenStream,
  cameraStream,
  cameraShape,
  cameraSize,
  isCameraMirrored,
  pipPosition,
  onChangePipPosition,
  teacherBadge,
  whiteboardTheme,
  customSlideUrl,
  currentTool,
  currentColor,
  strokeWidth,
  strokes,
  onAddStroke,
  canvasRef,
  cameraVisuals,
  micVolume = 0,
  onSwitchMode,
  onStartScreenShare,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const aiMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const aiConfidenceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const aiProcessedMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const aiMaskViewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const aiForegroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const aiSubjectCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const aiSegmentationRef = useRef<any>(null);
  const aiSegmentationLoadingRef = useRef(false);
  const aiLastFrameRef = useRef(0);
  const aiReadyRef = useRef(false);
  const aiErrorRef = useRef(false);
  const proMatteRef = useRef<any>(null);
  const proMatteLoadingRef = useRef(false);
  const proMatteErrorRef = useRef(false);
  const proMatteLastFrameRef = useRef(0);
  const proMatteInputCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const proMatteMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const proMatteBusyRef = useRef(false);
  const aiMaskSourceSizeRef = useRef({ width: 1, height: 1 });
  const proMatteReadyRef = useRef(false);
  const proRawImageRef = useRef<any>(null);
  const [proMatteFailed, setProMatteFailed] = useState(false);

  const visuals: CameraVisualConfig = cameraVisuals || {
    brightness: 100,
    contrast: 108,
    saturation: 106,
    clarityMode: 'crisp_hd',
    resolution: '1080p',
    backgroundBlur: 'none',
    blurRadius: 14,
    focusRadius: 65,
    virtualBackdrop: 'none',
    chromaKeyEnabled: false,
    chromaKeyColor: 'green',
    chromaKeyTolerance: 38,
    chromaKeySoftness: 18,
    chromaKeySpill: 12,
    aiBackgroundRemoval: false,
    aiEngine: 'realtime',
    aiQuality: 'quality',
    aiBackgroundMode: 'transparent',
    aiBackgroundBlur: 16,
    aiEdgeFeather: 16,
    borderColor: 'none',
    borderWidth: 0,
    glowEffect: false,
    speakingRing: false,
    zoom: 1.0,
    panY: 0,
    colorTone: 'natural',
  };

  // Custom slide image element
  const slideImageRef = useRef<HTMLImageElement | null>(null);

  // Active drawing state
  const isInteractingRef = useRef<boolean>(false);
  const activeStrokeRef = useRef<AnnotationStroke | null>(null);
  const [isDraggingPip, setIsDraggingPip] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Laser points & spotlight tracking
  const laserTrailRef = useRef<LaserPoint[]>([]);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Fixed internal canvas dimensions for 1080p crisp recording
  const CANVAS_WIDTH = 1920;
  const CANVAS_HEIGHT = 1080;

  // Setup video elements when streams change
  useEffect(() => {
    const screenVid = screenVideoRef.current;
    if (!screenVid) return;
    screenVid.autoplay = true;
    screenVid.muted = true;
    screenVid.playsInline = true;

    if (screenStream) {
      screenVid.srcObject = screenStream;
      const play = () => screenVid.play().catch(() => {});
      screenVid.onloadedmetadata = play;
      play();
    } else {
      screenVid.srcObject = null;
    }
  }, [screenStream]);

  useEffect(() => {
    const camVid = cameraVideoRef.current;
    if (!camVid) return;
    camVid.autoplay = true;
    camVid.muted = true;
    camVid.playsInline = true;

    if (cameraStream) {
      camVid.srcObject = cameraStream;
      const play = () =>
        camVid.play().catch((err) => {
          console.warn('Camera play warning:', err);
        });
      camVid.onloadedmetadata = play;
      play();
    } else {
      camVid.srcObject = null;
    }
  }, [cameraStream]);

  // AI person segmentation. The model runs locally in the renderer once the
  // MediaPipe runtime is loaded; camera pixels are not uploaded by this feature.
  // The runtime, WASM binaries and TFLite models are bundled into the installer.
  // No network request is made by the AI background-removal pipeline.
  useEffect(() => {
    if (
      !visuals.aiBackgroundRemoval ||
      visuals.aiEngine === 'pro_matte' ||
      aiSegmentationRef.current ||
      aiSegmentationLoadingRef.current ||
      aiErrorRef.current
    )
      return;

    aiSegmentationLoadingRef.current = true;
    const scriptId = 'teachrecord-mediapipe-selfie-segmentation';
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

    const init = async () => {
      try {
        const MP = (window as any).SelfieSegmentation;
        if (!MP) throw new Error('MediaPipe Selfie Segmentation runtime unavailable');
        const segmenter = new MP({
          locateFile: (file: string) => new URL(`./mediapipe/${file}`, window.location.href).href,
        });
        // Quality uses the general model for cleaner head/shoulder separation.
        // Speed can use the landscape model on lower-powered machines.
        const modelSelection = visuals.aiQuality === 'speed' ? 1 : 0;
        segmenter.setOptions({ modelSelection, selfieMode: false });
        segmenter.onResults((results: any) => {
          const mask = results?.segmentationMask;
          if (!mask) return;
          const video = cameraVideoRef.current;
          if (!video) return;
          const w = video.videoWidth || 1280;
          const h = video.videoHeight || 720;

          // Keep the raw confidence mask at a modest processing size. This avoids
          // running expensive per-pixel cleanup over the full 1080p frame while
          // still producing a high-quality matte when it is scaled to the PiP.
          const pw = Math.min(640, w);
          const ph = Math.max(1, Math.round((pw * h) / w));
          const raw = aiMaskCanvasRef.current || document.createElement('canvas');
          const confidence = aiConfidenceCanvasRef.current || document.createElement('canvas');
          const processed = aiProcessedMaskCanvasRef.current || document.createElement('canvas');
          aiMaskCanvasRef.current = raw;
          aiConfidenceCanvasRef.current = confidence;
          aiProcessedMaskCanvasRef.current = processed;
          if (raw.width !== pw || raw.height !== ph) {
            raw.width = pw;
            raw.height = ph;
          }
          if (confidence.width !== pw || confidence.height !== ph) {
            confidence.width = pw;
            confidence.height = ph;
          }
          if (processed.width !== pw || processed.height !== ph) {
            processed.width = pw;
            processed.height = ph;
          }

          const rctx = raw.getContext('2d', { willReadFrequently: true });
          const cctx = confidence.getContext('2d', { willReadFrequently: true });
          const pctx = processed.getContext('2d', { willReadFrequently: true });
          if (!rctx || !cctx || !pctx) return;

          rctx.clearRect(0, 0, pw, ph);
          rctx.drawImage(mask, 0, 0, pw, ph);

          // Temporal confidence smoothing reduces the flicker/halo seen around
          // hair and shoulders when the teacher moves. Current frame dominates so
          // fast motion does not leave a visible ghost behind the subject.
          const current = rctx.getImageData(0, 0, pw, ph);
          const previous = cctx.getImageData(0, 0, pw, ph);
          for (let i = 0; i < current.data.length; i += 4) {
            const cur = current.data[i] / 255;
            const prev = previous.data[i] / 255;
            const smooth = cur * 0.78 + prev * 0.22;
            const value = Math.round(smooth * 255);
            previous.data[i] = value;
            previous.data[i + 1] = value;
            previous.data[i + 2] = value;
            previous.data[i + 3] = 255;
          }
          cctx.putImageData(previous, 0, 0);

          // Convert confidence to a clean alpha matte. Pixels below the lower
          // threshold are completely removed; pixels above the upper threshold
          // are fully opaque. This is the key difference from simply blurring the
          // raw model mask, which was producing the brown background halo.
          const conf = cctx.getImageData(0, 0, pw, ph);
          const out = pctx.createImageData(pw, ph);
          const low = visuals.aiQuality === 'speed' ? 0.38 : 0.32;
          const high = visuals.aiQuality === 'quality' ? 0.68 : 0.62;
          for (let i = 0; i < conf.data.length; i += 4) {
            const x = conf.data[i] / 255;
            let a = (x - low) / (high - low);
            a = Math.max(0, Math.min(1, a));
            // Smooth transition only in the narrow confidence band.
            a = a * a * (3 - 2 * a);
            out.data[i] = 255;
            out.data[i + 1] = 255;
            out.data[i + 2] = 255;
            out.data[i + 3] = Math.round(a * 255);
          }
          pctx.putImageData(out, 0, 0);
          aiMaskSourceSizeRef.current = { width: pw, height: ph };
          aiReadyRef.current = true;
        });
        aiSegmentationRef.current = segmenter;
        await segmenter.initialize();
      } catch (error) {
        console.warn('AI background removal initialization failed:', error);
        aiErrorRef.current = true;
      } finally {
        aiSegmentationLoadingRef.current = false;
      }
    };

    if (existing) {
      if ((window as any).SelfieSegmentation) init();
      else existing.addEventListener('load', init, { once: true });
    } else {
      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = new URL('./mediapipe/selfie_segmentation.js', window.location.href).href;
      script.onload = init;
      script.onerror = () => {
        aiErrorRef.current = true;
        aiSegmentationLoadingRef.current = false;
        console.warn(
          'Bundled MediaPipe runtime is unavailable. Rebuild the installer with npm run prepare:offline-ai.',
        );
      };
      document.head.appendChild(script);
    }

    return () => {
      // Keep the model warm while the app is running; close it only on component teardown.
    };
  }, [visuals.aiBackgroundRemoval, visuals.aiQuality, visuals.aiEngine, proMatteFailed]);

  // High-quality local portrait matting using MODNet's documented low-level
  // AutoProcessor + AutoModel path. This intentionally avoids the generic
  // background-removal pipeline because MODNet exposes a single-channel alpha
  // matte tensor; using the model directly lets us resize that tensor ourselves
  // without any segmentation post-processing assumptions.
  useEffect(() => {
    if (
      !visuals.aiBackgroundRemoval ||
      visuals.aiEngine !== 'pro_matte' ||
      proMatteRef.current ||
      proMatteLoadingRef.current ||
      proMatteErrorRef.current
    )
      return;
    proMatteLoadingRef.current = true;
    setProMatteFailed(false);
    proMatteErrorRef.current = false;
    let cancelled = false;

    (async () => {
      try {
        const mod = await import('@huggingface/transformers');
        const { env, AutoModel, AutoProcessor, RawImage } = mod as any;
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        env.localModelPath = new URL('./models/', window.location.href).href;
        if (env.backends?.onnx?.wasm) {
          env.backends.onnx.wasm.wasmPaths = new URL(
            './transformers-wasm/',
            window.location.href,
          ).href;
        }

        const device = (navigator as any).gpu ? 'webgpu' : 'wasm';
        const dtype = device === 'webgpu' ? 'fp16' : 'q8';
        const modelId = 'onnx-community/modnet-webnn';

        const [model, processor] = await Promise.all([
          AutoModel.from_pretrained(modelId, { device, dtype }),
          AutoProcessor.from_pretrained(modelId),
        ]);

        if (cancelled) return;
        proRawImageRef.current = RawImage;
        proMatteRef.current = { model, processor, device, dtype };
        proMatteReadyRef.current = true;
      } catch (error) {
        console.error('Pro portrait matting initialization failed:', error);
        proMatteErrorRef.current = true;
        proMatteReadyRef.current = false;
        setProMatteFailed(true);
      } finally {
        proMatteLoadingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visuals.aiBackgroundRemoval, visuals.aiEngine]);

  // Generate the alpha matte. MODNet's official Transformers.js example uses
  // AutoProcessor -> AutoModel -> output[0], then converts that single-channel
  // tensor to a RawImage and resizes it to the original image dimensions.
  useEffect(() => {
    if (!visuals.aiBackgroundRemoval || visuals.aiEngine !== 'pro_matte' || !cameraStream) return;
    let raf = 0;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      const video = cameraVideoRef.current;
      const runtime = proMatteRef.current;

      if (video && video.readyState >= 2 && runtime && !proMatteBusyRef.current) {
        const now = performance.now();
        const fps = visuals.aiQuality === 'speed' ? 6 : visuals.aiQuality === 'balanced' ? 8 : 10;
        if (now - proMatteLastFrameRef.current >= 1000 / fps) {
          proMatteLastFrameRef.current = now;
          proMatteBusyRef.current = true;

          try {
            const vw = video.videoWidth || 1280;
            const vh = video.videoHeight || 720;
            const processW =
              visuals.aiQuality === 'speed' ? 384 : visuals.aiQuality === 'balanced' ? 512 : 640;
            const processH = Math.max(1, Math.round((processW * vh) / vw));

            const input = proMatteInputCanvasRef.current || document.createElement('canvas');
            proMatteInputCanvasRef.current = input;
            if (input.width !== processW || input.height !== processH) {
              input.width = processW;
              input.height = processH;
            }
            const ictx = input.getContext('2d', { willReadFrequently: false });
            if (!ictx) throw new Error('Pro matte input canvas unavailable');

            ictx.clearRect(0, 0, processW, processH);
            ictx.imageSmoothingEnabled = true;
            ictx.imageSmoothingQuality = 'high';
            ictx.drawImage(video, 0, 0, vw, vh, 0, 0, processW, processH);

            const RawImage = proRawImageRef.current;
            if (!RawImage) throw new Error('Pro matting image runtime is not ready');

            const image = RawImage.fromCanvas(input);
            const { pixel_values } = await runtime.processor(image);
            const result = await runtime.model({ input: pixel_values });
            const tensor = result?.output?.[0];
            if (!tensor) throw new Error('MODNet returned no alpha tensor');

            // Follow the model author's documented conversion exactly: output[0]
            // is a single-channel alpha matte in 0..1.
            const mask = await RawImage.fromTensor(tensor.mul(255).to('uint8')).resize(vw, vh);
            if (!mask?.data || mask.channels !== 1) {
              throw new Error(`Unexpected MODNet mask: ${mask?.channels ?? 'unknown'} channels`);
            }

            // Keep the matte in the camera's native coordinate system. The renderer
            // later supplies the same srcX/srcY/srcW/srcH crop as it uses for
            // the video. A 640px matte here caused the source crop coordinates
            // to address the wrong part of the mask when zoom/pan was applied.
            const fullW = vw;
            const fullH = vh;
            const maskCanvas = proMatteMaskCanvasRef.current || document.createElement('canvas');
            proMatteMaskCanvasRef.current = maskCanvas;
            if (maskCanvas.width !== fullW || maskCanvas.height !== fullH) {
              maskCanvas.width = fullW;
              maskCanvas.height = fullH;
            }
            const mctx = maskCanvas.getContext('2d', { willReadFrequently: false });
            if (!mctx) throw new Error('Pro matte mask canvas unavailable');

            const maskRGBA = new Uint8ClampedArray(fullW * fullH * 4);
            const src = mask.data as Uint8Array | Uint8ClampedArray | Float32Array;
            const mw = mask.width;
            const mh = mask.height;

            // If the runtime returns a float mask, normalize it; if it returns
            // bytes, use the byte values directly. A narrow low-confidence clamp
            // removes background speckle while preserving hair/shoulder softness.
            for (let y = 0; y < fullH; y++) {
              const sy = Math.min(mh - 1, Math.floor((y * mh) / fullH));
              for (let x = 0; x < fullW; x++) {
                const sx = Math.min(mw - 1, Math.floor((x * mw) / fullW));
                const i = sy * mw + sx;
                let a = Number(src[i] ?? 0);
                if (a <= 1) a *= 255;
                a = Math.max(0, Math.min(255, a));
                const n = a / 255;
                // Keep a soft transition around the model's matte boundary.
                const lo = visuals.aiQuality === 'speed' ? 0.2 : 0.12;
                const hi = visuals.aiQuality === 'quality' ? 0.72 : 0.65;
                let alpha = Math.max(0, Math.min(1, (n - lo) / (hi - lo)));
                alpha = alpha * alpha * (3 - 2 * alpha);
                const k = (y * fullW + x) * 4;
                maskRGBA[k] = 255;
                maskRGBA[k + 1] = 255;
                maskRGBA[k + 2] = 255;
                maskRGBA[k + 3] = Math.round(alpha * 255);
              }
            }
            mctx.putImageData(new ImageData(maskRGBA, fullW, fullH), 0, 0);

            aiMaskSourceSizeRef.current = { width: fullW, height: fullH };
            aiReadyRef.current = true;
            aiProcessedMaskCanvasRef.current = maskCanvas;
            proMatteReadyRef.current = true;
          } catch (error) {
            console.debug('Pro matte frame skipped', error);
          } finally {
            proMatteBusyRef.current = false;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [visuals.aiBackgroundRemoval, visuals.aiEngine, visuals.aiQuality, cameraStream]);

  // Never display a stale matte after switching engines or toggling AI.
  useEffect(() => {
    aiReadyRef.current = false;
    aiMaskSourceSizeRef.current = { width: 1, height: 1 };
  }, [visuals.aiBackgroundRemoval, visuals.aiEngine]);

  // Allow the quality selector to switch models to switch models without tearing down the camera
  // pipeline or reloading the bundled runtime.
  useEffect(() => {
    const segmenter = aiSegmentationRef.current;
    if (!segmenter || !visuals.aiBackgroundRemoval) return;
    try {
      segmenter.setOptions({
        modelSelection: visuals.aiQuality === 'speed' ? 1 : 0,
        selfieMode: false,
      });
    } catch (error) {
      console.debug('AI quality switch skipped', error);
    }
  }, [visuals.aiQuality, visuals.aiBackgroundRemoval]);

  // Feed the camera into the AI segmenter at a controlled cadence. Keeping inference
  // below the render-loop rate avoids starving the recording canvas at 1080p.
  useEffect(() => {
    if (!visuals.aiBackgroundRemoval || !aiSegmentationRef.current || !cameraStream) return;
    let raf = 0;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      const video = cameraVideoRef.current;
      const segmenter = aiSegmentationRef.current;
      if (video && video.readyState >= 2 && segmenter) {
        const now = performance.now();
        const aiFps =
          visuals.aiQuality === 'speed' ? 12 : visuals.aiQuality === 'balanced' ? 15 : 18;
        if (now - aiLastFrameRef.current >= 1000 / aiFps) {
          aiLastFrameRef.current = now;
          try {
            await segmenter.send({ image: video });
          } catch (e) {
            console.debug('AI segmentation frame skipped', e);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [visuals.aiBackgroundRemoval, visuals.aiQuality, cameraStream]);

  // Load custom slide image if provided
  useEffect(() => {
    if (customSlideUrl) {
      const img = new Image();
      img.src = customSlideUrl;
      img.onload = () => {
        slideImageRef.current = img;
      };
    } else {
      slideImageRef.current = null;
    }
  }, [customSlideUrl]);

  // Helper to get PiP pixel bounds on 1920x1080 canvas
  const getPipDimensions = useCallback(() => {
    let dim = 320;
    if (cameraSize === 'sm') dim = 220;
    if (cameraSize === 'md') dim = 320;
    if (cameraSize === 'lg') dim = 420;
    if (cameraSize === 'xl') dim = 540;

    const x = (pipPosition.x / 100) * CANVAS_WIDTH;
    const y = (pipPosition.y / 100) * CANVAS_HEIGHT;

    return { x, y, width: dim, height: dim };
  }, [cameraSize, pipPosition]);

  // Check if coordinates (in canvas space) fall inside camera bubble
  const isInsidePip = useCallback(
    (cx: number, cy: number) => {
      if (mode !== 'screen_cam' && mode !== 'whiteboard_cam') return false;
      const { x, y, width, height } = getPipDimensions();
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      if (cameraShape === 'circle' || cameraShape === 'hexagon') {
        const r = width / 2;
        return Math.hypot(cx - centerX, cy - centerY) <= r;
      } else if (cameraShape === 'oval') {
        const rx = (width / 2) * 0.85;
        const ry = height / 2;
        return (
          Math.pow(cx - centerX, 2) / Math.pow(rx, 2) +
            Math.pow(cy - centerY, 2) / Math.pow(ry, 2) <=
          1
        );
      } else if (cameraShape === 'wide_16_9') {
        const h169 = height * 0.76;
        const y169 = y + height * 0.12;
        return cx >= x && cx <= x + width && cy >= y169 && cy <= y169 + h169;
      }
      return cx >= x && cx <= x + width && cy >= y && cy <= y + height;
    },
    [mode, cameraShape, getPipDimensions],
  );

  // Helper to translate mouse event coordinates to 1920x1080 canvas coordinates
  const getCanvasCoords = (
    e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent,
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Helper to map border color type to hex string
  const getBorderColorHex = (colorId?: CameraBorderColor): string => {
    switch (colorId) {
      case 'rose':
        return '#f43f5e';
      case 'amber':
        return '#f59e0b';
      case 'sky':
        return '#38bdf8';
      case 'emerald':
        return '#10b981';
      case 'white':
        return '#ffffff';
      case 'none':
        return 'transparent';
      default:
        return '#f43f5e';
    }
  };

  // Create shape path for clip and border
  const createPipShapePath = (
    ctx: CanvasRenderingContext2D,
    shape: CameraShape,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    ctx.beginPath();
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = w / 2;

    if (shape === 'circle') {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else if (shape === 'rounded') {
      ctx.roundRect(x, y, w, h, 32);
    } else if (shape === 'square') {
      ctx.rect(x, y, w, h);
    } else if (shape === 'oval') {
      ctx.ellipse(cx, cy, (w / 2) * 0.85, h / 2, 0, 0, Math.PI * 2);
    } else if (shape === 'wide_16_9') {
      const h169 = h * 0.76;
      const y169 = y + h * 0.12;
      ctx.roundRect(x, y169, w, h169, 20);
    } else if (shape === 'hexagon') {
      const sideR = r;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + sideR * Math.cos(angle);
        const py = cy + sideR * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  };

  // Render Virtual Backdrop
  const drawVirtualBackdrop = (
    ctx: CanvasRenderingContext2D,
    backdrop: VirtualBackdropTheme,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    ctx.save();
    if (backdrop === 'studio_bokeh') {
      const bgGrad = ctx.createLinearGradient(x, y, x + w, y + h);
      bgGrad.addColorStop(0, '#1e1b4b');
      bgGrad.addColorStop(0.5, '#4c1d95');
      bgGrad.addColorStop(1, '#831843');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(x, y, w, h);

      const bokehs = [
        { x: 0.22, y: 0.28, r: 0.22, c: 'rgba(244, 63, 94, 0.35)' },
        { x: 0.78, y: 0.24, r: 0.26, c: 'rgba(168, 85, 247, 0.3)' },
        { x: 0.18, y: 0.78, r: 0.18, c: 'rgba(56, 189, 248, 0.25)' },
        { x: 0.82, y: 0.82, r: 0.28, c: 'rgba(251, 146, 60, 0.25)' },
      ];
      bokehs.forEach((b) => {
        const bx = x + w * b.x;
        const by = y + h * b.y;
        const br = Math.min(w, h) * b.r;
        const radGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        radGrad.addColorStop(0, b.c);
        radGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (backdrop === 'cozy_bookshelf') {
      const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
      bgGrad.addColorStop(0, '#291e14');
      bgGrad.addColorStop(0.6, '#18120b');
      bgGrad.addColorStop(1, '#0e0b07');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
      const shelfY = y + h * 0.48;
      ctx.fillRect(x, shelfY, w, 8);
      for (let bx = x + 15; bx < x + w - 20; bx += 22) {
        ctx.fillStyle = 'rgba(217, 119, 6, 0.12)';
        ctx.fillRect(bx, shelfY - 45, 14, 45);
      }
    } else if (backdrop === 'modern_classroom') {
      const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
      bgGrad.addColorStop(0, '#064e3b');
      bgGrad.addColorStop(0.7, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = 'rgba(52, 211, 153, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 15, y + 15, w - 30, h - 30);
    } else if (backdrop === 'dark_slate') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const bgGrad = ctx.createRadialGradient(
        cx,
        cy,
        Math.min(w, h) * 0.1,
        cx,
        cy,
        Math.min(w, h) * 0.8,
      );
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(x, y, w, h);
    } else if (backdrop === 'cyber_neon') {
      const bgGrad = ctx.createLinearGradient(x, y, x + w, y + h);
      bgGrad.addColorStop(0, '#082f49');
      bgGrad.addColorStop(0.5, '#3b0764');
      bgGrad.addColorStop(1, '#030712');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = 'rgba(244, 63, 94, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.2);
      ctx.lineTo(x + w, y + h * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  };

  // AI segmentation compositor. The matte is cleaned once at inference time and
  // then reused by the render loop. Canvases are reused between frames to avoid
  // allocating several 1080p canvases on every animation tick.
  const renderAiBackgroundVideo = (
    targetCtx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    srcX: number,
    srcY: number,
    srcW: number,
    srcH: number,
    destX: number,
    destY: number,
    destW: number,
    destH: number,
    filterStr: string,
    mirrored: boolean,
  ) => {
    const mask = aiProcessedMaskCanvasRef.current;
    if (!mask || !aiReadyRef.current) {
      targetCtx.save();
      targetCtx.filter = filterStr;
      if (mirrored) {
        targetCtx.translate(destX + destW / 2, 0);
        targetCtx.scale(-1, 1);
        targetCtx.translate(-(destX + destW / 2), 0);
      }
      targetCtx.drawImage(video, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
      targetCtx.restore();
      return;
    }

    const w = Math.max(1, Math.round(destW));
    const h = Math.max(1, Math.round(destH));
    const fg = aiForegroundCanvasRef.current || document.createElement('canvas');
    const maskView = aiMaskViewCanvasRef.current || document.createElement('canvas');
    const subject = aiSubjectCanvasRef.current || document.createElement('canvas');
    aiForegroundCanvasRef.current = fg;
    aiMaskViewCanvasRef.current = maskView;
    aiSubjectCanvasRef.current = subject;
    if (fg.width !== w || fg.height !== h) {
      fg.width = w;
      fg.height = h;
    }
    if (maskView.width !== w || maskView.height !== h) {
      maskView.width = w;
      maskView.height = h;
    }
    if (subject.width !== w || subject.height !== h) {
      subject.width = w;
      subject.height = h;
    }

    const fctx = fg.getContext('2d');
    const mctx = maskView.getContext('2d');
    const sctx = subject.getContext('2d');
    if (!fctx || !mctx || !sctx) return;

    fctx.clearRect(0, 0, w, h);
    fctx.save();
    fctx.imageSmoothingEnabled = true;
    fctx.imageSmoothingQuality = 'high';
    fctx.filter = filterStr;
    if (mirrored) {
      fctx.translate(w / 2, 0);
      fctx.scale(-1, 1);
      fctx.translate(-w / 2, 0);
    }
    fctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, w, h);
    fctx.restore();

    mctx.clearRect(0, 0, w, h);
    mctx.save();
    // Map the camera's native crop coordinates into the mask's actual coordinate
    // space. MediaPipe commonly produces a 256/640-ish mask while the webcam may
    // be 1280x720 or 1920x1080. Passing video coordinates directly to drawImage()
    // was the root cause of the 'one quadrant' artifact.
    const maskSource = aiMaskSourceSizeRef.current;
    const sx = Math.max(
      0,
      Math.min(
        mask.width,
        (srcX * maskSource.width) / Math.max(1, video.videoWidth || maskSource.width),
      ),
    );
    const sy = Math.max(
      0,
      Math.min(
        mask.height,
        (srcY * maskSource.height) / Math.max(1, video.videoHeight || maskSource.height),
      ),
    );
    const sw = Math.max(
      1,
      Math.min(
        mask.width - sx,
        (srcW * maskSource.width) / Math.max(1, video.videoWidth || maskSource.width),
      ),
    );
    const sh = Math.max(
      1,
      Math.min(
        mask.height - sy,
        (srcH * maskSource.height) / Math.max(1, video.videoHeight || maskSource.height),
      ),
    );
    if (mirrored) {
      mctx.translate(w / 2, 0);
      mctx.scale(-1, 1);
      mctx.translate(-w / 2, 0);
    }
    const feather = Math.max(0, Math.min(4, (visuals.aiEdgeFeather || 16) / 10));
    if (feather > 0) mctx.filter = `blur(${feather}px)`;
    mctx.imageSmoothingEnabled = true;
    mctx.imageSmoothingQuality = 'high';
    mctx.drawImage(mask, sx, sy, sw, sh, 0, 0, w, h);
    mctx.restore();

    sctx.clearRect(0, 0, w, h);
    sctx.globalCompositeOperation = 'source-over';
    sctx.drawImage(fg, 0, 0);
    sctx.globalCompositeOperation = 'destination-in';
    sctx.drawImage(maskView, 0, 0);
    sctx.globalCompositeOperation = 'source-over';

    if (visuals.aiBackgroundMode === 'blur') {
      targetCtx.save();
      targetCtx.filter = `blur(${visuals.aiBackgroundBlur || 16}px) ${filterStr}`;
      const scale = 1.06;
      if (mirrored) {
        targetCtx.translate(destX + destW / 2, 0);
        targetCtx.scale(-1, 1);
        targetCtx.translate(-(destX + destW / 2), 0);
      }
      targetCtx.drawImage(
        video,
        srcX,
        srcY,
        srcW,
        srcH,
        destX - (destW * (scale - 1)) / 2,
        destY - (destH * (scale - 1)) / 2,
        destW * scale,
        destH * scale,
      );
      targetCtx.restore();
    } else if (visuals.aiBackgroundMode === 'studio') {
      drawVirtualBackdrop(
        targetCtx,
        visuals.virtualBackdrop === 'none' ? 'modern_classroom' : visuals.virtualBackdrop,
        destX,
        destY,
        destW,
        destH,
      );
    }

    // In transparent mode no background is drawn, allowing the screen/board below
    // to show through. In blur/studio modes the background is already rendered.
    targetCtx.drawImage(subject, destX, destY, destW, destH);
  };

  // Chroma-key compositor. This is intentionally done on the recording canvas so the
  // keyed result is also present in the recorded video, not just the preview.
  const renderChromaKeyVideo = (
    targetCtx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    srcX: number,
    srcY: number,
    srcW: number,
    srcH: number,
    destX: number,
    destY: number,
    destW: number,
    destH: number,
    filterStr: string,
    mirrored: boolean,
  ) => {
    const w = Math.max(1, Math.round(destW));
    const h = Math.max(1, Math.round(destH));
    const keyCanvas = offscreenCanvasRef.current || document.createElement('canvas');
    offscreenCanvasRef.current = keyCanvas;
    if (keyCanvas.width !== w || keyCanvas.height !== h) {
      keyCanvas.width = w;
      keyCanvas.height = h;
    }
    const kctx = keyCanvas.getContext('2d', { willReadFrequently: true });
    if (!kctx) return;

    kctx.clearRect(0, 0, w, h);
    kctx.save();
    kctx.imageSmoothingEnabled = true;
    kctx.imageSmoothingQuality = 'high';
    kctx.filter = filterStr;
    if (mirrored) {
      kctx.translate(w / 2, 0);
      kctx.scale(-1, 1);
      kctx.translate(-w / 2, 0);
    }
    kctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, w, h);
    kctx.restore();

    const image = kctx.getImageData(0, 0, w, h);
    const data = image.data;
    const key =
      visuals.chromaKeyColor === 'blue' ? { r: 30, g: 100, b: 210 } : { r: 30, g: 170, b: 70 };
    const tolerance = Math.max(5, visuals.chromaKeyTolerance || 38) / 100;
    const softness = Math.max(1, visuals.chromaKeySoftness || 18) / 100;
    const spill = Math.max(0, visuals.chromaKeySpill || 12) / 100;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      const chroma = max - min;
      // Distance in normalized RGB space, plus a saturation gate so skin/neutral
      // colours are much less likely to disappear accidentally.
      const dr = (r - key.r) / 255;
      const dg = (g - key.g) / 255;
      const db = (b - key.b) / 255;
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      const saturation = max === 0 ? 0 : chroma / max;
      const hueMatch =
        visuals.chromaKeyColor === 'blue'
          ? b > r * 1.05 && b > g * 0.95
          : g > r * 1.05 && g > b * 0.85;
      if (!hueMatch || saturation < 0.18) continue;

      const threshold = tolerance * 0.85;
      const feather = Math.max(0.02, softness * 0.55);
      let alpha = (distance - threshold) / feather;
      alpha = Math.max(0, Math.min(1, alpha));
      if (alpha < 1) {
        data[i + 3] = Math.round(data[i + 3] * alpha);
        // Suppress green/blue spill on the surviving edge pixels.
        if (spill > 0 && alpha > 0) {
          if (visuals.chromaKeyColor === 'green')
            data[i + 1] = Math.round(g * (1 - spill * (1 - alpha)));
          else data[i + 2] = Math.round(b * (1 - spill * (1 - alpha)));
        }
      }
    }
    kctx.putImageData(image, 0, 0);
    targetCtx.drawImage(keyCanvas, destX, destY, destW, destH);
  };

  // Comprehensive Front Camera Stream Renderer (with Blur, Backdrops, Zoom, Color Tones & Filters)
  const renderFrontCameraFeed = (
    ctx: CanvasRenderingContext2D,
    camVid: HTMLVideoElement,
    targetX: number,
    targetY: number,
    targetW: number,
    targetH: number,
    isMirrored: boolean,
  ) => {
    // 1. Build Filter String
    let filterStr = `brightness(${visuals.brightness}%) contrast(${visuals.contrast}%) saturate(${visuals.saturation}%)`;
    if (visuals.clarityMode === 'crisp_hd') filterStr += ' contrast(112%) saturate(108%)';
    else if (visuals.clarityMode === 'brighten') filterStr += ' brightness(115%) contrast(106%)';
    else if (visuals.clarityMode === 'vivid') filterStr += ' saturate(125%) contrast(110%)';

    if (visuals.colorTone === 'warm') filterStr += ' sepia(25%) saturate(110%)';
    else if (visuals.colorTone === 'cool') filterStr += ' hue-rotate(185deg) contrast(105%)';
    else if (visuals.colorTone === 'monochrome') filterStr += ' grayscale(100%) contrast(115%)';
    else if (visuals.colorTone === 'sepia') filterStr += ' sepia(80%) contrast(105%)';

    // 2. Digital Zoom & Pan Calculations
    const vW = camVid.videoWidth || 1280;
    const vH = camVid.videoHeight || 720;
    const zoom = Math.max(1.0, visuals.zoom || 1.0);
    const panY = visuals.panY || 0;

    const croppedW = vW / zoom;
    const croppedH = vH / zoom;
    const srcX = (vW - croppedW) / 2;
    const maxPanY = (vH - croppedH) / 2;
    const panOffsetY = (panY / 100) * maxPanY;
    const srcY = Math.max(0, Math.min(vH - croppedH, (vH - croppedH) / 2 + panOffsetY));

    // 3. Aspect Ratio Coordinates
    const vRatio = croppedW / croppedH;
    const tRatio = targetW / targetH;
    let dw = targetW;
    let dh = targetH;
    let dx = targetX;
    let dy = targetY;

    if (vRatio > tRatio) {
      dw = targetH * vRatio;
      dx = targetX - (dw - targetW) / 2;
    } else {
      dh = targetW / vRatio;
      dy = targetY - (dh - targetH) / 2;
    }

    const hasBlur = visuals.backgroundBlur && visuals.backgroundBlur !== 'none';
    const hasBackdrop = visuals.virtualBackdrop && visuals.virtualBackdrop !== 'none';
    const hasChromaKey = visuals.chromaKeyEnabled === true;
    const hasAiBackground = visuals.aiBackgroundRemoval === true;

    // AI background removal takes priority when enabled; chroma key remains the offline fallback.: the keyed background becomes transparent,
    // allowing the underlying screen/whiteboard to show through.
    if (hasAiBackground) {
      ctx.save();
      renderAiBackgroundVideo(
        ctx,
        camVid,
        srcX,
        srcY,
        croppedW,
        croppedH,
        dx,
        dy,
        dw,
        dh,
        filterStr,
        isMirrored,
      );
      ctx.restore();
    } else if (hasChromaKey) {
      ctx.save();
      renderChromaKeyVideo(
        ctx,
        camVid,
        srcX,
        srcY,
        croppedW,
        croppedH,
        dx,
        dy,
        dw,
        dh,
        filterStr,
        isMirrored,
      );
      ctx.restore();
    } else if (hasBlur || hasBackdrop) {
      // Step A: Draw Virtual Backdrop if selected
      if (hasBackdrop) {
        drawVirtualBackdrop(ctx, visuals.virtualBackdrop, targetX, targetY, targetW, targetH);
      }

      // Step B: Draw Blurred Camera Video Background
      if (hasBlur) {
        let blurPx = visuals.blurRadius || 16;
        if (visuals.backgroundBlur === 'soft') blurPx = 8;
        else if (visuals.backgroundBlur === 'medium') blurPx = 16;
        else if (visuals.backgroundBlur === 'heavy') blurPx = 24;

        ctx.save();
        ctx.filter = `blur(${blurPx}px) ` + filterStr;
        if (isMirrored) {
          ctx.translate(targetX + targetW / 2, 0);
          ctx.scale(-1, 1);
          ctx.translate(-(targetX + targetW / 2), 0);
        }
        // Slightly upscale (1.08x) to prevent boundary transparency artifact from CSS blur
        const scale = 1.08;
        const sdw = dw * scale;
        const sdh = dh * scale;
        const sdx = dx - (sdw - dw) / 2;
        const sdy = dy - (sdh - dh) / 2;
        ctx.drawImage(camVid, srcX, srcY, croppedW, croppedH, sdx, sdy, sdw, sdh);
        ctx.restore();
      }

      // Step C: Draw Crisp In-Focus Subject with Radial Feather Mask
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
      }
      const off = offscreenCanvasRef.current;
      const offW = Math.max(1, Math.round(targetW));
      const offH = Math.max(1, Math.round(targetH));
      if (off.width !== offW || off.height !== offH) {
        off.width = offW;
        off.height = offH;
      }
      const offCtx = off.getContext('2d');
      if (offCtx) {
        offCtx.clearRect(0, 0, offW, offH);
        offCtx.save();
        offCtx.imageSmoothingEnabled = true;
        offCtx.imageSmoothingQuality = 'high';
        offCtx.filter = filterStr;

        if (isMirrored) {
          offCtx.translate(offW / 2, 0);
          offCtx.scale(-1, 1);
          offCtx.translate(-offW / 2, 0);
        }

        const relDx = dx - targetX;
        const relDy = dy - targetY;
        offCtx.drawImage(camVid, srcX, srcY, croppedW, croppedH, relDx, relDy, dw, dh);
        offCtx.restore();

        // Radial feather mask centered on the teacher's face & upper body
        offCtx.save();
        offCtx.globalCompositeOperation = 'destination-in';
        const focusPercent = (visuals.focusRadius || 65) / 100;
        const focusR = (Math.min(offW, offH) / 2) * focusPercent;
        const fCenterX = offW / 2;
        const fCenterY = offH / 2 + (panY / 100) * (offH * 0.25);

        const grad = offCtx.createRadialGradient(
          fCenterX,
          fCenterY,
          focusR * 0.45,
          fCenterX,
          fCenterY,
          focusR,
        );
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.96)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, offW, offH);
        offCtx.restore();

        ctx.drawImage(off, targetX, targetY);
      }
    } else {
      // Raw direct video stream
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = filterStr;

      if (isMirrored) {
        ctx.translate(targetX + targetW / 2, 0);
        ctx.scale(-1, 1);
        ctx.translate(-(targetX + targetW / 2), 0);
      }
      ctx.drawImage(camVid, srcX, srcY, croppedW, croppedH, dx, dy, dw, dh);
      ctx.filter = 'none';
      ctx.restore();
    }
  };

  // Render Background
  const renderBackground = (ctx: CanvasRenderingContext2D) => {
    if (mode === 'camera_only') {
      const camVid = cameraVideoRef.current;
      const hasValidVideo = Boolean(
        cameraStream && camVid && (camVid.readyState >= 2 || camVid.videoWidth > 0),
      );

      if (hasValidVideo && camVid) {
        renderFrontCameraFeed(ctx, camVid, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, isCameraMirrored);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 28px Segoe UI, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Initializing Front Camera Feed...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 15);
        ctx.font = '16px Segoe UI, Arial, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(
          'Please check your camera permissions if stream does not appear.',
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 25,
        );
      }
      return;
    }

    if (mode === 'whiteboard_cam') {
      // Draw whiteboard theme
      if (whiteboardTheme === 'blackboard') {
        ctx.fillStyle = '#112119';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Subtle chalkboard grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < CANVAS_WIDTH; x += 60) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_HEIGHT);
          ctx.stroke();
        }
        for (let y = 0; y < CANVAS_HEIGHT; y += 60) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_WIDTH, y);
          ctx.stroke();
        }
      } else if (whiteboardTheme === 'clean_white') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_WIDTH, y);
          ctx.stroke();
        }
      } else if (whiteboardTheme === 'math_grid') {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = 1;
        for (let x = 0; x < CANVAS_WIDTH; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_HEIGHT);
          ctx.stroke();
        }
        for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_WIDTH, y);
          ctx.stroke();
        }
      } else if (whiteboardTheme === 'blueprint') {
        ctx.fillStyle = '#0a2540';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        for (let x = 0; x < CANVAS_WIDTH; x += 80) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_HEIGHT);
          ctx.stroke();
        }
        for (let y = 0; y < CANVAS_HEIGHT; y += 80) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_WIDTH, y);
          ctx.stroke();
        }
      } else {
        // dot grid
        ctx.fillStyle = '#121218';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for (let x = 40; x < CANVAS_WIDTH; x += 40) {
          for (let y = 40; y < CANVAS_HEIGHT; y += 40) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw custom slide image if present
      if (slideImageRef.current) {
        const img = slideImageRef.current;
        const iRatio = img.width / img.height;
        const cRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
        let dw = CANVAS_WIDTH;
        let dh = CANVAS_HEIGHT;
        let dx = 0;
        let dy = 0;
        if (iRatio > cRatio) {
          dw = CANVAS_WIDTH;
          dh = dw / iRatio;
          dy = (CANVAS_HEIGHT - dh) / 2;
        } else {
          dh = CANVAS_HEIGHT;
          dw = dh * iRatio;
          dx = (CANVAS_WIDTH - dw) / 2;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
      }
      return;
    }

    // Default screen recording background
    const screenVid = screenVideoRef.current;
    if (screenStream && screenVid.readyState >= 2) {
      // Fit screen into 1920x1080 keeping aspect ratio
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const sRatio = screenVid.videoWidth / screenVid.videoHeight;
      const cRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
      let dw = CANVAS_WIDTH;
      let dh = CANVAS_HEIGHT;
      let dx = 0;
      let dy = 0;

      if (sRatio > cRatio) {
        dw = CANVAS_WIDTH;
        dh = dw / sRatio;
        dy = (CANVAS_HEIGHT - dh) / 2;
      } else {
        dh = CANVAS_HEIGHT;
        dw = dh * sRatio;
        dx = (CANVAS_WIDTH - dw) / 2;
      }
      ctx.drawImage(screenVid, dx, dy, dw, dh);
    } else {
      // Screen not shared yet: teacher staging area
      ctx.fillStyle = '#0b1329';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 36px Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Screen Capture Standby', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

      ctx.font = '20px Segoe UI, Arial, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(
        'Click "Share Screen" in the top bar to select an app, tab, or window',
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 15,
      );

      ctx.font = '16px Segoe UI, Arial, sans-serif';
      ctx.fillStyle = '#fb7185';
      ctx.fillText(
        'Your camera is live in the corner bubble • Click "Cam Only" if you want full screen',
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 55,
      );
    }
  };

  // Render Front Camera Picture-in-Picture
  const renderPip = (ctx: CanvasRenderingContext2D) => {
    if (mode !== 'screen_cam' && mode !== 'whiteboard_cam') return;
    const camVid = cameraVideoRef.current;
    const { x, y, width, height } = getPipDimensions();
    const cx = x + width / 2;
    const cy = y + height / 2;

    const borderColorHex = getBorderColorHex(visuals.borderColor);

    ctx.save();

    // 1. Dynamic Speaking Ring / Audio Halo (pulses with microphone volume)
    if (!visuals.aiBackgroundRemoval && visuals.speakingRing && micVolume > 6) {
      ctx.save();
      const haloAlpha = Math.min(0.85, micVolume / 65);
      const haloExpand = Math.min(22, 6 + (micVolume / 100) * 18);
      ctx.globalAlpha = haloAlpha;
      ctx.strokeStyle = borderColorHex === 'transparent' ? '#f43f5e' : borderColorHex;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = borderColorHex === 'transparent' ? '#f43f5e' : borderColorHex;
      ctx.shadowBlur = 18;
      createPipShapePath(
        ctx,
        cameraShape,
        x - haloExpand / 2,
        y - haloExpand / 2,
        width + haloExpand,
        height + haloExpand,
      );
      ctx.stroke();
      ctx.restore();
    }

    // 2. Drop shadow around normal PiP. AI cutout is free-form and should not
    // inherit a circular/box-shaped shadow.
    const freeformAi = visuals.aiBackgroundRemoval === true;
    if (!freeformAi) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 26;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // 3. Define clipping path for PiP. AI cutout must remain a free-form alpha
    // matte (like ScreenPal) instead of being clipped to the old circle/oval.
    if (!freeformAi) createPipShapePath(ctx, cameraShape, x, y, width, height);

    // 4. Clip to camera shape only for normal camera modes.
    ctx.save();
    if (!freeformAi) ctx.clip();
    ctx.shadowColor = 'transparent';

    const hasValidVideo = Boolean(
      cameraStream && camVid && (camVid.readyState >= 2 || camVid.videoWidth > 0),
    );

    if (hasValidVideo && camVid) {
      renderFrontCameraFeed(ctx, camVid, x, y, width, height, isCameraMirrored);
    } else {
      // Camera loading/inactive state
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 15px Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Camera Off / Standby', cx, cy - 8);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Segoe UI, Arial, sans-serif';
      ctx.fillText('Click to enable feed', cx, cy + 12);
    }

    ctx.restore(); // restore from clip

    // 5. Draw Styled Accent Border Ring (with optional neon glow)
    if (visuals.borderColor !== 'none' && visuals.borderWidth > 0) {
      ctx.save();
      if (visuals.glowEffect) {
        ctx.shadowColor = borderColorHex;
        ctx.shadowBlur = 20;
      } else {
        ctx.shadowColor = 'transparent';
      }
      ctx.strokeStyle = borderColorHex;
      ctx.lineWidth = visuals.borderWidth;
      createPipShapePath(ctx, cameraShape, x, y, width, height);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Teacher Badge Overlay (if enabled)
    if (teacherBadge.enabled && (teacherBadge.teacherName || teacherBadge.subjectTitle)) {
      const badgeW = Math.max(180, width * 0.9);
      const badgeH = 42;
      const badgeX = cx - badgeW / 2;
      const badgeY = y + height - 20;

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle =
        borderColorHex === 'transparent' ? 'rgba(244, 63, 94, 0.6)' : borderColorHex;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.textAlign = 'center';
      if (teacherBadge.teacherName && teacherBadge.subjectTitle) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Segoe UI, Arial, sans-serif';
        ctx.fillText(teacherBadge.teacherName, cx, badgeY + 16);

        ctx.fillStyle = borderColorHex === 'transparent' ? '#f43f5e' : borderColorHex;
        ctx.font = '11px Segoe UI, Arial, sans-serif';
        ctx.fillText(teacherBadge.subjectTitle, cx, badgeY + 32);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Segoe UI, Arial, sans-serif';
        ctx.fillText(teacherBadge.teacherName || teacherBadge.subjectTitle, cx, badgeY + 26);
      }
      ctx.restore();
    }

    ctx.restore();
  };

  // Render Annotations (Pen, Highlighter, Arrows, Boxes, Circles)
  const renderStrokes = (ctx: CanvasRenderingContext2D) => {
    const allStrokes = [...strokes];
    if (activeStrokeRef.current) {
      allStrokes.push(activeStrokeRef.current);
    }

    allStrokes.forEach((stroke) => {
      ctx.save();

      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width * 2.2;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
      } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }

      if (stroke.tool === 'pen' || stroke.tool === 'highlighter') {
        if (stroke.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
        } else if (stroke.points.length === 1) {
          ctx.fillStyle = stroke.color;
          ctx.beginPath();
          ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (stroke.tool === 'arrow' && stroke.start && stroke.end) {
        // Draw directional arrow
        const fromX = stroke.start.x;
        const fromY = stroke.start.y;
        const toX = stroke.end.x;
        const toY = stroke.end.y;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const headLength = Math.max(16, stroke.width * 3.5);
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
          toX - headLength * Math.cos(angle - Math.PI / 6),
          toY - headLength * Math.sin(angle - Math.PI / 6),
        );
        ctx.lineTo(
          toX - headLength * Math.cos(angle + Math.PI / 6),
          toY - headLength * Math.sin(angle + Math.PI / 6),
        );
        ctx.closePath();
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else if (stroke.tool === 'rect' && stroke.start && stroke.end) {
        const x = Math.min(stroke.start.x, stroke.end.x);
        const y = Math.min(stroke.start.y, stroke.end.y);
        const w = Math.abs(stroke.end.x - stroke.start.x);
        const h = Math.abs(stroke.end.y - stroke.start.y);

        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.stroke();
      } else if (stroke.tool === 'circle' && stroke.start && stroke.end) {
        const cx = (stroke.start.x + stroke.end.x) / 2;
        const cy = (stroke.start.y + stroke.end.y) / 2;
        const rx = Math.abs(stroke.end.x - stroke.start.x) / 2;
        const ry = Math.abs(stroke.end.y - stroke.start.y) / 2;

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    });
  };

  // Render Spotlight (production spotlight feature)
  const renderSpotlight = (ctx: CanvasRenderingContext2D) => {
    if (currentTool !== 'spotlight' || !mousePosRef.current) return;
    const { x, y } = mousePosRef.current;
    const radius = 130;

    ctx.save();
    // Dark overlay with radial cutout
    const gradient = ctx.createRadialGradient(x, y, radius * 0.7, x, y, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.globalCompositeOperation = 'destination-out';
    const clearGradient = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius);
    clearGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    clearGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = clearGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle glowing ring around the spotlight circle
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  // Render Laser Pointer with fading trail
  const renderLaser = (ctx: CanvasRenderingContext2D, now: number) => {
    // Filter old laser points (> 800ms)
    laserTrailRef.current = laserTrailRef.current.filter((pt) => now - pt.timestamp < 800);
    const trail = laserTrailRef.current;

    if (trail.length === 0) return;

    ctx.save();
    for (let i = 0; i < trail.length; i++) {
      const pt = trail[i];
      const age = now - pt.timestamp;
      const alpha = Math.max(0, 1 - age / 800);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, (1 - age / 800) * 12 + 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.6})`;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 15;
      ctx.fill();
    }

    // Bright core dot at latest laser position
    const latest = trail[trail.length - 1];
    ctx.beginPath();
    ctx.arc(latest.x, latest.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 20;
    ctx.fill();

    ctx.restore();
  };

  // Main Canvas Render Loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLoop = (time: number) => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      renderBackground(ctx);
      renderPip(ctx);
      renderStrokes(ctx);
      renderSpotlight(ctx);
      renderLaser(ctx, time);

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
    // renderBackground/renderPip/renderSpotlight/renderStrokes are intentionally
    // omitted: they are plain (non-memoized) functions redefined every render,
    // but every piece of state/props they read is already listed below, so this
    // effect already restarts the render loop whenever their actual inputs
    // change. Adding the functions themselves would tear down and restart the
    // requestAnimationFrame loop on every render instead, which would hurt
    // recording performance without fixing anything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canvasRef,
    mode,
    screenStream,
    cameraStream,
    cameraShape,
    cameraSize,
    isCameraMirrored,
    pipPosition,
    teacherBadge,
    whiteboardTheme,
    customSlideUrl,
    currentTool,
    currentColor,
    strokeWidth,
    strokes,
    cameraVisuals,
  ]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    mousePosRef.current = coords;

    // Check if clicked inside camera bubble
    if (isInsidePip(coords.x, coords.y)) {
      setIsDraggingPip(true);
      const { x, y } = getPipDimensions();
      dragOffsetRef.current = {
        x: coords.x - x,
        y: coords.y - y,
      };
      return;
    }

    if (currentTool === 'cursor') return;

    if (currentTool === 'laser') {
      laserTrailRef.current.push({
        x: coords.x,
        y: coords.y,
        timestamp: performance.now(),
      });
      return;
    }

    if (currentTool === 'spotlight') {
      return;
    }

    if (currentTool === 'eraser') {
      // Find strokes near this click to remove
      isInteractingRef.current = true;
      return;
    }

    // Begin new stroke
    isInteractingRef.current = true;
    const newStroke: AnnotationStroke = {
      id: Math.random().toString(36).substring(2, 9),
      tool: currentTool,
      color: currentColor,
      width: strokeWidth,
      points: [coords],
      start: coords,
      end: coords,
    };
    activeStrokeRef.current = newStroke;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    mousePosRef.current = coords;

    // Handle PiP dragging
    if (isDraggingPip) {
      const { width, height } = getPipDimensions();
      const newX = coords.x - dragOffsetRef.current.x;
      const newY = coords.y - dragOffsetRef.current.y;

      const clampedX = Math.max(0, Math.min(CANVAS_WIDTH - width, newX));
      const clampedY = Math.max(0, Math.min(CANVAS_HEIGHT - height, newY));

      onChangePipPosition({
        x: Math.round((clampedX / CANVAS_WIDTH) * 100),
        y: Math.round((clampedY / CANVAS_HEIGHT) * 100),
      });
      return;
    }

    // Handle laser trail
    if (currentTool === 'laser') {
      laserTrailRef.current.push({
        x: coords.x,
        y: coords.y,
        timestamp: performance.now(),
      });
      return;
    }

    if (!isInteractingRef.current || !activeStrokeRef.current) return;

    if (currentTool === 'pen' || currentTool === 'highlighter') {
      activeStrokeRef.current.points.push(coords);
    } else if (['arrow', 'rect', 'circle'].includes(currentTool)) {
      activeStrokeRef.current.end = coords;
    }
  };

  const handlePointerUp = () => {
    if (isDraggingPip) {
      setIsDraggingPip(false);
      return;
    }

    if (isInteractingRef.current && activeStrokeRef.current) {
      onAddStroke(activeStrokeRef.current);
      activeStrokeRef.current = null;
      isInteractingRef.current = false;
    }
  };

  return (
    <div
      ref={containerRef}
      id="teaching-stage-container"
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 select-none"
    >
      {/* Hidden DOM video elements to ensure reliable hardware decoding across browsers */}
      <video
        ref={cameraVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
      <video
        ref={screenVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {/* Screen Standby Helper Action Pill */}
      {mode === 'screen_cam' && !screenStream && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-2xl shadow-xl text-xs text-slate-300 pointer-events-auto">
          <span className="text-slate-400">Want full camera view instead?</span>
          {onSwitchMode && (
            <button
              onClick={() => onSwitchMode('camera_only')}
              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Camera size={13} />
              <span>Full Screen Cam</span>
            </button>
          )}
          {onStartScreenShare && (
            <button
              onClick={onStartScreenShare}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Monitor size={13} />
              <span>Share Screen</span>
            </button>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        id="recording-canvas-element"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`w-full max-w-full aspect-[16/9] shadow-2xl object-contain rounded-xl border border-slate-800 ${
          isDraggingPip
            ? 'cursor-grabbing'
            : currentTool === 'cursor'
              ? 'cursor-default'
              : currentTool === 'laser'
                ? 'cursor-crosshair'
                : currentTool === 'spotlight'
                  ? 'cursor-none'
                  : 'cursor-crosshair'
        }`}
      />
    </div>
  );
};
