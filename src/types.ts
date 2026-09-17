export type RecordingMode = 'screen_cam' | 'screen_only' | 'camera_only' | 'whiteboard_cam';

export type CameraShape = 'circle' | 'rounded' | 'square' | 'oval' | 'wide_16_9' | 'hexagon';

export type CameraSize = 'sm' | 'md' | 'lg' | 'xl';

export type CameraClarityMode = 'standard' | 'crisp_hd' | 'brighten' | 'vivid';

export type BackgroundBlurLevel = 'none' | 'soft' | 'medium' | 'heavy' | 'custom';

export type ChromaKeyColor = 'green' | 'blue' | 'custom';

export type VirtualBackdropTheme =
  'none' | 'studio_bokeh' | 'cozy_bookshelf' | 'modern_classroom' | 'dark_slate' | 'cyber_neon';

export type CameraBorderColor = 'rose' | 'amber' | 'sky' | 'emerald' | 'white' | 'none';

export type CameraColorTone = 'natural' | 'warm' | 'cool' | 'monochrome' | 'sepia';

export interface CameraVisualConfig {
  brightness: number; // 60 to 140
  contrast: number; // 60 to 140
  saturation: number; // 60 to 140
  clarityMode: CameraClarityMode;
  resolution: '1080p' | '720p' | '480p';
  // Background Blur & Studio Backdrop
  backgroundBlur: BackgroundBlurLevel;
  blurRadius: number; // 0 to 30 px
  focusRadius: number; // 40 to 85 (%)
  virtualBackdrop: VirtualBackdropTheme;
  // Chroma key / green-screen background removal
  chromaKeyEnabled: boolean;
  chromaKeyColor: ChromaKeyColor;
  chromaKeyTolerance: number; // 0 to 100
  chromaKeySoftness: number; // 0 to 100
  chromaKeySpill: number; // 0 to 100
  // AI person segmentation (no green screen required)
  aiBackgroundRemoval: boolean;
  aiEngine: 'auto' | 'pro_matte' | 'realtime';
  aiQuality: 'quality' | 'balanced' | 'speed';
  aiBackgroundMode: 'transparent' | 'blur' | 'studio';
  aiBackgroundBlur: number; // 4 to 30 px
  aiEdgeFeather: number; // 0 to 100
  // Border & Glow
  borderColor: CameraBorderColor;
  borderWidth: number; // 0 to 8 px
  glowEffect: boolean;
  speakingRing: boolean; // Dynamic audio-reactive voice pulse ring
  // Framing & Zoom
  zoom: number; // 1.0 to 2.0x digital crop/zoom
  panY: number; // -30 to +30 (%) vertical face framing
  colorTone: CameraColorTone;
}

export interface PipPosition {
  x: number; // percentage from left 0 to 100
  y: number; // percentage from top 0 to 100
}

export type AnnotationTool =
  'cursor' | 'pen' | 'highlighter' | 'arrow' | 'rect' | 'circle' | 'laser' | 'spotlight' | 'eraser';

export interface StrokePoint {
  x: number;
  y: number;
}

export interface AnnotationStroke {
  id: string;
  tool: AnnotationTool;
  color: string;
  width: number;
  points: StrokePoint[];
  start?: StrokePoint;
  end?: StrokePoint;
  text?: string;
}

export interface LaserPoint {
  x: number;
  y: number;
  timestamp: number;
}

export type WhiteboardTheme = 'blackboard' | 'clean_white' | 'math_grid' | 'dot_grid' | 'blueprint';

export interface RecordedLesson {
  id: string;
  title: string;
  createdAt: number;
  duration: number; // seconds
  sizeBytes: number;
  mimeType: string;
  blob?: Blob;
  blobUrl?: string;
  thumbnailUrl?: string;
  notes?: string;
}

export interface TeleprompterConfig {
  isOpen: boolean;
  text: string;
  fontSize: number; // in px, e.g. 18 to 36
  speed: number; // scroll speed multiplier 1 to 5
  isScrolling: boolean;
  opacity: number; // 0.3 to 1.0
}

export interface TeacherBadgeConfig {
  enabled: boolean;
  teacherName: string;
  subjectTitle: string;
}
