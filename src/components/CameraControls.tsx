/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Camera,
  Circle,
  Square,
  FlipHorizontal,
  User,
  Move,
  Sparkles,
  Sun,
  Contrast,
  Palette,
  Maximize2,
  X,
  RotateCcw,
  Sliders,
  ZoomIn,
  Hexagon,
  Image as ImageIcon,
  Check,
  Zap,
  Volume2,
} from 'lucide-react';
import {
  CameraShape,
  CameraSize,
  PipPosition,
  TeacherBadgeConfig,
  CameraVisualConfig,
  CameraClarityMode,
  RecordingMode,
  BackgroundBlurLevel,
  VirtualBackdropTheme,
  CameraBorderColor,
  CameraColorTone,
} from '../types';

interface CameraControlsProps {
  shape: CameraShape;
  onChangeShape: (shape: CameraShape) => void;
  size: CameraSize;
  onChangeSize: (size: CameraSize) => void;
  isMirrored: boolean;
  onToggleMirror: () => void;
  position: PipPosition;
  onChangePosition: (pos: PipPosition) => void;
  badge: TeacherBadgeConfig;
  onChangeBadge: (badge: TeacherBadgeConfig) => void;
  videoDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  visuals: CameraVisualConfig;
  onChangeVisuals: (visuals: CameraVisualConfig) => void;
  onChangeResolution: (res: '1080p' | '720p' | '480p') => void;
  currentMode?: RecordingMode;
  onSwitchMode?: (mode: RecordingMode) => void;
  onClose?: () => void;
}

const PRESET_POSITIONS: { label: string; pos: PipPosition }[] = [
  { label: 'Top-Left', pos: { x: 4, y: 6 } },
  { label: 'Top-Right', pos: { x: 80, y: 6 } },
  { label: 'Bottom-Left', pos: { x: 4, y: 70 } },
  { label: 'Bottom-Right', pos: { x: 80, y: 70 } },
];

const BORDER_COLORS: {
  id: CameraBorderColor;
  label: string;
  color: string;
  borderClass: string;
}[] = [
  { id: 'rose', label: 'Rose Red', color: '#f43f5e', borderClass: 'bg-rose-500 ring-rose-400' },
  {
    id: 'amber',
    label: 'Amber Gold',
    color: '#f59e0b',
    borderClass: 'bg-amber-500 ring-amber-400',
  },
  { id: 'sky', label: 'Sky Blue', color: '#38bdf8', borderClass: 'bg-sky-400 ring-sky-300' },
  {
    id: 'emerald',
    label: 'Emerald',
    color: '#10b981',
    borderClass: 'bg-emerald-500 ring-emerald-400',
  },
  { id: 'white', label: 'Clean White', color: '#ffffff', borderClass: 'bg-white ring-slate-300' },
  {
    id: 'none',
    label: 'None',
    color: 'transparent',
    borderClass: 'bg-slate-800 ring-slate-600 border border-dashed border-slate-600',
  },
];

const VIRTUAL_BACKDROPS: {
  id: VirtualBackdropTheme;
  name: string;
  desc: string;
  preview: string;
}[] = [
  { id: 'none', name: 'Original', desc: 'Real camera room view', preview: 'bg-slate-800' },
  {
    id: 'studio_bokeh',
    name: 'Studio Bokeh',
    desc: 'Soft purple & violet blur dots',
    preview: 'bg-gradient-to-tr from-indigo-950 via-purple-900 to-rose-950',
  },
  {
    id: 'cozy_bookshelf',
    name: 'Cozy Library',
    desc: 'Warm mahogany bookshelf tones',
    preview: 'bg-gradient-to-tr from-amber-950 via-stone-900 to-amber-900',
  },
  {
    id: 'modern_classroom',
    name: 'Modern Class',
    desc: 'Teal & chalkboard academic ambience',
    preview: 'bg-gradient-to-tr from-emerald-950 via-teal-900 to-slate-950',
  },
  {
    id: 'dark_slate',
    name: 'Minimal Slate',
    desc: 'Sleek executive dark studio',
    preview: 'bg-gradient-to-tr from-slate-950 via-slate-900 to-zinc-900',
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Glow',
    desc: 'Vibrant neon blue & magenta aura',
    preview: 'bg-gradient-to-tr from-cyan-950 via-blue-900 to-fuchsia-950',
  },
];

export const CameraControls: React.FC<CameraControlsProps> = ({
  shape,
  onChangeShape,
  size,
  onChangeSize,
  isMirrored,
  onToggleMirror,
  onChangePosition,
  badge,
  onChangeBadge,
  videoDevices,
  selectedDeviceId,
  onSelectDevice,
  visuals,
  onChangeVisuals,
  onChangeResolution,
  currentMode,
  onSwitchMode,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'blur' | 'frame' | 'clarity'>('blur');

  // Handle Background Blur Preset
  const handleSelectBlurLevel = (level: BackgroundBlurLevel) => {
    let radius = 0;
    if (level === 'soft') radius = 8;
    else if (level === 'medium') radius = 16;
    else if (level === 'heavy') radius = 24;
    else if (level === 'custom') radius = visuals.blurRadius || 16;

    onChangeVisuals({
      ...visuals,
      backgroundBlur: level,
      blurRadius: radius,
    });
  };

  const handleSelectClarityPreset = (mode: CameraClarityMode) => {
    let brightness = 100;
    let contrast = 100;
    let saturation = 100;

    if (mode === 'crisp_hd') {
      brightness = 102;
      contrast = 112;
      saturation = 108;
    } else if (mode === 'brighten') {
      brightness = 118;
      contrast = 108;
      saturation = 104;
    } else if (mode === 'vivid') {
      brightness = 104;
      contrast = 114;
      saturation = 125;
    }

    onChangeVisuals({
      ...visuals,
      clarityMode: mode,
      brightness,
      contrast,
      saturation,
    });
  };

  const handleResetVisuals = () => {
    onChangeVisuals({
      ...visuals,
      clarityMode: 'crisp_hd',
      brightness: 100,
      contrast: 108,
      saturation: 106,
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
      aiEdgeFeather: 35,
      borderColor: 'none',
      borderWidth: 0,
      glowEffect: false,
      speakingRing: false,
      zoom: 1.0,
      panY: 0,
      colorTone: 'natural',
    });
  };

  return (
    <div
      id="camera-controls-modal"
      className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl w-90 max-h-[85vh] overflow-hidden flex flex-col text-slate-200 text-sm animate-in fade-in zoom-in-95"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2 font-semibold text-slate-100">
          <Camera size={18} className="text-rose-400" />
          <span>Front Camera Studio</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 border-b border-slate-800 text-xs font-semibold bg-slate-950/60 p-1 gap-1">
        <button
          onClick={() => setActiveTab('blur')}
          className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'blur'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sparkles size={13} />
          <span>Blur & Backdrop</span>
        </button>
        <button
          onClick={() => setActiveTab('frame')}
          className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'frame'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sliders size={13} />
          <span>Frame & Style</span>
        </button>
        <button
          onClick={() => setActiveTab('clarity')}
          className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'clarity'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sun size={13} />
          <span>Image & Zoom</span>
        </button>
      </div>

      {/* Body Content */}
      <div className="p-5 overflow-y-auto space-y-4 flex-1">
        {/* ================= TAB 1: BLUR & BACKDROP ================= */}
        {activeTab === 'blur' && (
          <div className="space-y-4">
            {/* Background Blur Mode Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Background Blur</span>
                </label>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                  {visuals.backgroundBlur === 'none'
                    ? 'Disabled'
                    : `${visuals.backgroundBlur} (${visuals.blurRadius}px)`}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {(['none', 'soft', 'medium', 'heavy'] as BackgroundBlurLevel[]).map((level) => (
                  <button
                    key={level}
                    id={`btn-blur-${level}`}
                    onClick={() => handleSelectBlurLevel(level)}
                    className={`py-2 px-1 rounded-xl border text-xs font-semibold transition-all text-center capitalize cursor-pointer ${
                      visuals.backgroundBlur === level
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold shadow-sm shadow-rose-500/10'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-400'
                    }`}
                  >
                    {level === 'none' ? 'Off' : level}
                  </button>
                ))}
              </div>
            </div>

            {/* Fine-Tuning Blur Intensity & Focus Area */}
            {visuals.backgroundBlur !== 'none' && (
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 animate-in fade-in">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1 font-medium">
                    <span>Blur Strength</span>
                    <span className="text-rose-400">{visuals.blurRadius} px</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={30}
                    value={visuals.blurRadius}
                    onChange={(e) =>
                      onChangeVisuals({
                        ...visuals,
                        blurRadius: Number(e.target.value),
                        backgroundBlur: 'custom',
                      })
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>Subtle bokeh</span>
                    <span>Heavy blur</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1 font-medium">
                    <span>Subject Focus Radius</span>
                    <span className="text-rose-400">{visuals.focusRadius}%</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={85}
                    value={visuals.focusRadius}
                    onChange={(e) =>
                      onChangeVisuals({ ...visuals, focusRadius: Number(e.target.value) })
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>Tight (Face only)</span>
                    <span>Wide (Upper body)</span>
                  </div>
                </div>
              </div>
            )}

            {/* AI Background Removal */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-violet-400" />
                  <span>AI Remove Background</span>
                </label>
                <button
                  onClick={() =>
                    onChangeVisuals({
                      ...visuals,
                      aiBackgroundRemoval: !visuals.aiBackgroundRemoval,
                      chromaKeyEnabled: false,
                    })
                  }
                  className={`relative w-10 h-5 rounded-full transition-colors ${visuals.aiBackgroundRemoval ? 'bg-violet-500' : 'bg-slate-700'}`}
                  aria-label="Toggle AI background removal"
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${visuals.aiBackgroundRemoval ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                AI segmentation isolates you without a green screen. Processing runs locally after
                the model loads.
              </p>
              {visuals.aiBackgroundRemoval && (
                <div className="p-3 bg-slate-950/70 border border-violet-500/20 rounded-xl space-y-3 animate-in fade-in">
                  <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-300">AI Quality</span>
                      <span className="text-[10px] text-violet-300">Local processing</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {(
                        [
                          ['realtime', 'AI Stable'],
                          ['pro_matte', 'Pro Matte'],
                          ['auto', 'Auto'],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => onChangeVisuals({ ...visuals, aiEngine: id })}
                          className={`py-1.5 rounded-lg border text-[10px] font-semibold ${visuals.aiEngine === id ? 'border-violet-500 bg-violet-500/15 text-violet-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          ['quality', 'Quality'],
                          ['balanced', 'Balanced'],
                          ['speed', 'Speed'],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => onChangeVisuals({ ...visuals, aiQuality: id })}
                          className={`py-1.5 rounded-lg border text-[10px] font-semibold ${visuals.aiQuality === id ? 'border-violet-500 bg-violet-500/15 text-violet-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] leading-relaxed text-slate-500">
                      Pro Matte uses bundled MODNet portrait matting with WebGPU when available.
                      Realtime uses the lightweight MediaPipe engine. Auto prefers Pro Matte and
                      falls back safely.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['transparent', 'Remove'],
                        ['blur', 'Blur'],
                        ['studio', 'Studio'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => onChangeVisuals({ ...visuals, aiBackgroundMode: id })}
                        className={`py-2 rounded-lg border text-[11px] font-semibold ${visuals.aiBackgroundMode === id ? 'border-violet-500 bg-violet-500/15 text-violet-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {visuals.aiBackgroundMode === 'blur' && (
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                        <span>AI Background Blur</span>
                        <span className="text-violet-400">{visuals.aiBackgroundBlur}px</span>
                      </div>
                      <input
                        type="range"
                        min={4}
                        max={30}
                        value={visuals.aiBackgroundBlur}
                        onChange={(e) =>
                          onChangeVisuals({ ...visuals, aiBackgroundBlur: Number(e.target.value) })
                        }
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>Edge Feather</span>
                      <span className="text-violet-400">{visuals.aiEdgeFeather}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={visuals.aiEdgeFeather}
                      onChange={(e) =>
                        onChangeVisuals({ ...visuals, aiEdgeFeather: Number(e.target.value) })
                      }
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                  </div>
                  <div className="rounded-lg bg-violet-500/5 border border-violet-500/10 p-2 text-[10px] text-slate-400 leading-relaxed">
                    <strong className="text-violet-300">Pro tip:</strong> Use Remove over your
                    shared screen, Blur for webcam lessons, or Studio for a polished teaching setup.
                    If AI cannot load, Chroma Key remains available.
                  </div>
                </div>
              )}
            </div>

            {/* Chroma Key / Green Screen */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Hexagon size={14} className="text-emerald-400" />
                  <span>Chroma Key</span>
                </label>
                <button
                  onClick={() =>
                    onChangeVisuals({ ...visuals, chromaKeyEnabled: !visuals.chromaKeyEnabled })
                  }
                  className={`relative w-10 h-5 rounded-full transition-colors ${visuals.chromaKeyEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  aria-label="Toggle chroma key"
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${visuals.chromaKeyEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Remove a green/blue screen so only you remain visible over the lesson.
              </p>

              {visuals.chromaKeyEnabled && (
                <div className="p-3 bg-slate-950/70 border border-emerald-500/20 rounded-xl space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-2">
                    {(['green', 'blue'] as const).map((color) => (
                      <button
                        key={color}
                        onClick={() => onChangeVisuals({ ...visuals, chromaKeyColor: color })}
                        className={`py-2 rounded-lg border text-xs font-semibold capitalize ${visuals.chromaKeyColor === color ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}
                      >
                        {color} Screen
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>Key Tolerance</span>
                      <span className="text-emerald-400">{visuals.chromaKeyTolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={75}
                      value={visuals.chromaKeyTolerance}
                      onChange={(e) =>
                        onChangeVisuals({ ...visuals, chromaKeyTolerance: Number(e.target.value) })
                      }
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>Edge Softness</span>
                      <span className="text-emerald-400">{visuals.chromaKeySoftness}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={visuals.chromaKeySoftness}
                      onChange={(e) =>
                        onChangeVisuals({ ...visuals, chromaKeySoftness: Number(e.target.value) })
                      }
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>Spill Suppression</span>
                      <span className="text-emerald-400">{visuals.chromaKeySpill}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={visuals.chromaKeySpill}
                      onChange={(e) =>
                        onChangeVisuals({ ...visuals, chromaKeySpill: Number(e.target.value) })
                      }
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-2 text-[10px] text-slate-400 leading-relaxed">
                    <strong className="text-emerald-300">Tip:</strong> Stand in front of an evenly
                    lit green or blue screen. This removes the keyed colour from the recorded video
                    itself.
                  </div>
                </div>
              )}
            </div>

            {/* Virtual Backdrop Environments */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-rose-400" />
                  <span>Virtual Studio Backdrop</span>
                </label>
                {visuals.virtualBackdrop !== 'none' && (
                  <button
                    onClick={() => onChangeVisuals({ ...visuals, virtualBackdrop: 'none' })}
                    className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {VIRTUAL_BACKDROPS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onChangeVisuals({ ...visuals, virtualBackdrop: b.id })}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      visuals.virtualBackdrop === b.id
                        ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg ${b.preview} border border-white/10 flex-shrink-0 flex items-center justify-center`}
                    >
                      {visuals.virtualBackdrop === b.id && (
                        <Check size={13} className="text-white drop-shadow" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-xs font-semibold text-white block truncate">
                        {b.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">{b.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: FRAME & STYLE ================= */}
        {activeTab === 'frame' && (
          <div className="space-y-4">
            {/* Quick Display Mode: Full Screen Cam vs PiP Bubble */}
            {onSwitchMode && (
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  Camera Presentation
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onSwitchMode('camera_only')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      currentMode === 'camera_only'
                        ? 'bg-rose-500 text-white font-bold shadow-sm'
                        : 'bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Maximize2 size={13} />
                    <span>Full Cam Only</span>
                  </button>
                  <button
                    onClick={() => onSwitchMode('screen_cam')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      currentMode === 'screen_cam'
                        ? 'bg-rose-500 text-white font-bold shadow-sm'
                        : 'bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Circle size={13} />
                    <span>Screen + PiP</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bubble Shape (All 6 Shapes) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Camera Bubble Shape</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  id="btn-shape-circle"
                  onClick={() => onChangeShape('circle')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    shape === 'circle'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300'
                  }`}
                >
                  <Circle size={13} />
                  <span>Circle</span>
                </button>
                <button
                  id="btn-shape-rounded"
                  onClick={() => onChangeShape('rounded')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    shape === 'rounded'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300'
                  }`}
                >
                  <div className="w-3.5 h-3.5 border-2 border-current rounded-sm" />
                  <span>Rounded</span>
                </button>
                <button
                  id="btn-shape-square"
                  onClick={() => onChangeShape('square')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    shape === 'square'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300'
                  }`}
                >
                  <Square size={13} />
                  <span>Square</span>
                </button>
                <button
                  id="btn-shape-oval"
                  onClick={() => onChangeShape('oval')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    shape === 'oval'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300'
                  }`}
                >
                  <div className="w-2.5 h-3.5 border-2 border-current rounded-full" />
                  <span>Portrait Oval</span>
                </button>
                <button
                  id="btn-shape-wide"
                  onClick={() => onChangeShape('wide_16_9')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    shape === 'wide_16_9'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300'
                  }`}
                >
                  <div className="w-4 h-2.5 border-2 border-current rounded-xs" />
                  <span>16:9 Mini</span>
                </button>
                <button
                  id="btn-shape-hexagon"
                  onClick={() => onChangeShape('hexagon')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    shape === 'hexagon'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300'
                  }`}
                >
                  <Hexagon size={13} />
                  <span>Hexagon</span>
                </button>
              </div>
            </div>

            {/* Bubble Size selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Bubble Size</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['sm', 'md', 'lg', 'xl'] as CameraSize[]).map((s) => (
                  <button
                    key={s}
                    id={`btn-size-${s}`}
                    onClick={() => onChangeSize(s)}
                    className={`py-1.5 rounded-lg border text-xs font-medium uppercase transition-all cursor-pointer ${
                      size === s
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Border Color & Width */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Frame Border Color</label>
                <span className="text-[10px] text-slate-400 capitalize">{visuals.borderColor}</span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                {BORDER_COLORS.map((bc) => (
                  <button
                    key={bc.id}
                    onClick={() => onChangeVisuals({ ...visuals, borderColor: bc.id })}
                    title={bc.label}
                    className={`w-7 h-7 rounded-full ${bc.borderClass} flex items-center justify-center transition-all cursor-pointer ${
                      visuals.borderColor === bc.id
                        ? 'ring-2 ring-offset-2 ring-offset-slate-900 scale-110'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {visuals.borderColor === bc.id && bc.id !== 'none' && (
                      <Check
                        size={12}
                        className={bc.id === 'white' ? 'text-slate-900' : 'text-white'}
                      />
                    )}
                  </button>
                ))}
              </div>

              {visuals.borderColor !== 'none' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Border Thickness</span>
                    <span>{visuals.borderWidth} px</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={visuals.borderWidth}
                    onChange={(e) =>
                      onChangeVisuals({ ...visuals, borderWidth: Number(e.target.value) })
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>
              )}
            </div>

            {/* Dynamic Audio Speaking Ring Halo */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-emerald-400" />
                <div>
                  <span className="text-xs font-medium text-slate-300 block">
                    Speaking Voice Halo
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Border pulses when mic hears teacher
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={visuals.speakingRing}
                onChange={(e) => onChangeVisuals({ ...visuals, speakingRing: e.target.checked })}
                className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
              />
            </div>

            {/* Ambient Glow Aura */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                <span className="text-xs text-slate-300">Ambient Frame Glow</span>
              </div>
              <input
                type="checkbox"
                checked={visuals.glowEffect}
                onChange={(e) => onChangeVisuals({ ...visuals, glowEffect: e.target.checked })}
                className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
              />
            </div>

            {/* Mirror Camera */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlipHorizontal size={16} className="text-slate-400" />
                <span className="text-xs text-slate-300">Mirror Front Camera</span>
              </div>
              <input
                type="checkbox"
                id="toggle-mirror-cam"
                checked={isMirrored}
                onChange={onToggleMirror}
                className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
              />
            </div>

            {/* Position Presets */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400">Position Preset</label>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Move size={10} /> drag directly on canvas
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_POSITIONS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => onChangePosition(p.pos)}
                    className="py-1.5 px-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg text-xs text-slate-300 font-medium text-center transition-all cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Teacher Badge */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-rose-400" />
                  <span className="text-xs font-semibold text-slate-300">Teacher Tag Badge</span>
                </div>
                <input
                  type="checkbox"
                  checked={badge.enabled}
                  onChange={(e) => onChangeBadge({ ...badge, enabled: e.target.checked })}
                  className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                />
              </div>

              {badge.enabled && (
                <div className="space-y-2 pl-2 border-l-2 border-slate-800 text-xs animate-in fade-in">
                  <div>
                    <label className="text-[11px] text-slate-400">Teacher / Presenter Name</label>
                    <input
                      type="text"
                      value={badge.teacherName}
                      onChange={(e) => onChangeBadge({ ...badge, teacherName: e.target.value })}
                      placeholder="e.g., Prof. Davis"
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Subject or Topic Tag</label>
                    <input
                      type="text"
                      value={badge.subjectTitle}
                      onChange={(e) => onChangeBadge({ ...badge, subjectTitle: e.target.value })}
                      placeholder="e.g., Intro to Computer Science"
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: IMAGE & ZOOM ================= */}
        {activeTab === 'clarity' && (
          <div className="space-y-4">
            {/* Digital Zoom & Face Pan */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ZoomIn size={14} className="text-rose-400" />
                  <span>Digital Face Zoom & Pan</span>
                </span>
                <span className="text-[11px] text-rose-400 font-bold">
                  {visuals.zoom.toFixed(1)}x
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Zoom Multiplier</span>
                  <span>
                    {visuals.zoom === 1 ? '1.0x (Full room)' : `${visuals.zoom.toFixed(1)}x`}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={20}
                  value={Math.round(visuals.zoom * 10)}
                  onChange={(e) =>
                    onChangeVisuals({ ...visuals, zoom: Number(e.target.value) / 10 })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              {visuals.zoom > 1 && (
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>Vertical Head Framing (Pan Y)</span>
                    <span>{visuals.panY > 0 ? `+${visuals.panY}%` : `${visuals.panY}%`}</span>
                  </div>
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    value={visuals.panY}
                    onChange={(e) => onChangeVisuals({ ...visuals, panY: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>Higher</span>
                    <span>Lower</span>
                  </div>
                </div>
              )}
            </div>

            {/* Resolution */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Stream Resolution</label>
                <span className="text-[10px] text-rose-400 font-semibold uppercase">
                  {visuals.resolution} Crisp
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['1080p', '720p', '480p'] as const).map((res) => (
                  <button
                    key={res}
                    onClick={() => onChangeResolution(res)}
                    className={`py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      visuals.resolution === res
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-400'
                    }`}
                  >
                    {res === '1080p' ? '1080p FHD' : res === '720p' ? '720p HD' : '480p'}
                  </button>
                ))}
              </div>

              {videoDevices.length > 1 && (
                <div className="pt-1">
                  <label className="text-[11px] font-medium text-slate-400">Camera Source</label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => onSelectDevice(e.target.value)}
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    {videoDevices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Clarity & Lighting Presets */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Clarity & Anti-Blur Filters</span>
                </label>
                <button
                  onClick={handleResetVisuals}
                  className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Reset to default crisp HD"
                >
                  <RotateCcw size={10} /> Reset
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleSelectClarityPreset('crisp_hd')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium text-left transition-all cursor-pointer ${
                    visuals.clarityMode === 'crisp_hd'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-semibold'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <span className="block font-semibold">✨ HD Crisp</span>
                  <span className="text-[10px] text-slate-400">Sharp edges & contrast</span>
                </button>
                <button
                  onClick={() => handleSelectClarityPreset('brighten')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium text-left transition-all cursor-pointer ${
                    visuals.clarityMode === 'brighten'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-semibold'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <span className="block font-semibold">💡 Brighten Face</span>
                  <span className="text-[10px] text-slate-400">Low light correction</span>
                </button>
                <button
                  onClick={() => handleSelectClarityPreset('vivid')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium text-left transition-all cursor-pointer ${
                    visuals.clarityMode === 'vivid'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-semibold'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <span className="block font-semibold">🎨 Vivid Color</span>
                  <span className="text-[10px] text-slate-400">Vibrant skin tones</span>
                </button>
                <button
                  onClick={() => handleSelectClarityPreset('standard')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium text-left transition-all cursor-pointer ${
                    visuals.clarityMode === 'standard'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-semibold'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <span className="block font-semibold">📷 Natural</span>
                  <span className="text-[10px] text-slate-400">Raw unmodified stream</span>
                </button>
              </div>
            </div>

            {/* Color Tone / Temperature Filters */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">Color Temperature</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['natural', 'warm', 'cool', 'monochrome', 'sepia'] as CameraColorTone[]).map(
                  (tone) => (
                    <button
                      key={tone}
                      onClick={() => onChangeVisuals({ ...visuals, colorTone: tone })}
                      className={`py-1.5 px-1 rounded-lg border text-xs font-medium capitalize text-center transition-all cursor-pointer ${
                        visuals.colorTone === tone
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                          : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {tone}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Fine-Tuning Sliders */}
            <div className="space-y-2 pt-1 border-t border-slate-800 text-xs">
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Sun size={11} /> Brightness
                  </span>
                  <span>{visuals.brightness}%</span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={140}
                  value={visuals.brightness}
                  onChange={(e) =>
                    onChangeVisuals({ ...visuals, brightness: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Contrast size={11} /> Contrast
                  </span>
                  <span>{visuals.contrast}%</span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={140}
                  value={visuals.contrast}
                  onChange={(e) =>
                    onChangeVisuals({ ...visuals, contrast: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Palette size={11} /> Saturation
                  </span>
                  <span>{visuals.saturation}%</span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={150}
                  value={visuals.saturation}
                  onChange={(e) =>
                    onChangeVisuals({ ...visuals, saturation: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Quick Action */}
      <div className="px-5 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[11px]">Settings update live on recording</span>
        <button
          onClick={handleResetVisuals}
          className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          Reset All
        </button>
      </div>
    </div>
  );
};
