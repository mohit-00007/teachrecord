import React from 'react';
import {
  MousePointer,
  Pen,
  Highlighter,
  Flame,
  ArrowUpRight,
  Square,
  Circle as CircleIcon,
  SunMedium,
  Eraser,
  RotateCcw,
  Trash2,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { AnnotationTool } from '../types';

interface AnnotationToolbarProps {
  currentTool: AnnotationTool;
  onSelectTool: (tool: AnnotationTool) => void;
  currentColor: string;
  onSelectColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
  isCompact?: boolean;
  onToggleCompact?: () => void;
}

const PRESET_COLORS = [
  { label: 'Signal Red', value: '#ef4444' },
  { label: 'Electric Yellow', value: '#eab308' },
  { label: 'Emerald Green', value: '#10b981' },
  { label: 'Sky Blue', value: '#0ea5e9' },
  { label: 'Chalk White', value: '#ffffff' },
  { label: 'Dark Slate', value: '#1e293b' },
];

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  currentTool,
  onSelectTool,
  currentColor,
  onSelectColor,
  strokeWidth,
  onChangeStrokeWidth,
  onUndo,
  onClear,
  canUndo,
  isCompact = false,
  onToggleCompact,
}) => {
  const tools = [
    { id: 'cursor' as AnnotationTool, label: 'Mouse Cursor', icon: MousePointer, hotkey: 'V' },
    { id: 'pen' as AnnotationTool, label: 'Draw Pen', icon: Pen, hotkey: 'P' },
    { id: 'highlighter' as AnnotationTool, label: 'Highlighter', icon: Highlighter, hotkey: 'H' },
    { id: 'laser' as AnnotationTool, label: 'Laser Pointer', icon: Flame, hotkey: 'L' },
    { id: 'spotlight' as AnnotationTool, label: 'Screen Spotlight', icon: SunMedium, hotkey: 'S' },
    { id: 'arrow' as AnnotationTool, label: 'Arrow Pointer', icon: ArrowUpRight, hotkey: 'A' },
    { id: 'rect' as AnnotationTool, label: 'Highlight Box', icon: Square, hotkey: 'B' },
    { id: 'circle' as AnnotationTool, label: 'Circle Ring', icon: CircleIcon, hotkey: 'C' },
    { id: 'eraser' as AnnotationTool, label: 'Eraser', icon: Eraser, hotkey: 'E' },
  ];

  if (isCompact) {
    return (
      <div
        id="annotation-toolbar-compact"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-full shadow-2xl text-slate-200"
      >
        <div className="flex items-center gap-1">
          {tools.slice(0, 5).map((tool) => {
            const Icon = tool.icon;
            const isActive = currentTool === tool.id;
            return (
              <button
                key={tool.id}
                id={`tool-${tool.id}`}
                onClick={() => onSelectTool(tool.id)}
                title={`${tool.label} (${tool.hotkey})`}
                aria-label={tool.label}
                aria-pressed={isActive}
                className={`p-1.5 rounded-full transition-all ${
                  isActive
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
        <div className="w-px h-4 bg-slate-700 mx-1" />
        <button
          onClick={onToggleCompact}
          title="Expand Toolbar"
          aria-label="Expand annotation toolbar"
          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      id="annotation-toolbar"
      className="flex flex-wrap items-center gap-2 p-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl text-slate-200 select-none animate-in fade-in"
    >
      {/* Primary Tool selector */}
      <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.id;
          return (
            <button
              key={tool.id}
              id={`tool-${tool.id}`}
              onClick={() => onSelectTool(tool.id)}
              title={`${tool.label} [${tool.hotkey}]`}
              aria-label={tool.label}
              aria-pressed={isActive}
              className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all text-xs font-medium ${
                isActive
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50'
              }`}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      {/* Color Palette (disabled for eraser & spotlight & cursor) */}
      {currentTool !== 'eraser' && currentTool !== 'cursor' && currentTool !== 'spotlight' && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 rounded-xl border border-slate-700/50">
          {PRESET_COLORS.map((c) => {
            const isSelected = currentColor.toLowerCase() === c.value.toLowerCase();
            return (
              <button
                key={c.value}
                id={`color-${c.label.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => onSelectColor(c.value)}
                title={c.label}
                aria-label={`${c.label} color`}
                aria-pressed={isSelected}
                style={{ backgroundColor: c.value }}
                className={`w-5 h-5 rounded-full transition-transform border ${
                  isSelected
                    ? 'scale-125 ring-2 ring-rose-400 border-white'
                    : 'border-slate-600 hover:scale-110'
                }`}
              />
            );
          })}
          {/* Custom color input */}
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onSelectColor(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 opacity-80 hover:opacity-100"
            title="Custom Color"
            aria-label="Custom annotation color"
          />
        </div>
      )}

      {/* Stroke Width Slider */}
      {['pen', 'highlighter', 'arrow', 'rect', 'circle', 'eraser'].includes(currentTool) && (
        <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-800/80 rounded-xl border border-slate-700/50">
          <span className="text-[11px] font-medium text-slate-400">Size</span>
          <input
            type="range"
            min={2}
            max={28}
            value={strokeWidth}
            onChange={(e) => onChangeStrokeWidth(Number(e.target.value))}
            className="w-16 h-1.5 accent-rose-500 bg-slate-700 rounded-lg cursor-pointer"
            title={`Stroke width: ${strokeWidth}px`}
            aria-label={`Stroke width: ${strokeWidth} pixels`}
          />
          <span className="text-[10px] text-slate-400 font-mono w-4">{strokeWidth}</span>
        </div>
      )}

      {/* Undo & Clear */}
      <div className="flex items-center gap-1">
        <button
          id="btn-undo-drawing"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last stroke (Ctrl+Z)"
          aria-label="Undo last stroke"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <RotateCcw size={15} />
        </button>
        <button
          id="btn-clear-drawings"
          onClick={onClear}
          title="Clear all drawings"
          aria-label="Clear all drawings"
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {onToggleCompact && (
        <button
          onClick={onToggleCompact}
          title="Minimize dock"
          aria-label="Minimize annotation toolbar"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg ml-auto"
        >
          <Minimize2 size={14} />
        </button>
      )}
    </div>
  );
};
