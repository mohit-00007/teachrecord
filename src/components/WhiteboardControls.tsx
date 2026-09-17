import React, { useRef } from 'react';
import { Palette, Upload, Image as ImageIcon, Grid, FileCheck, X } from 'lucide-react';
import { WhiteboardTheme } from '../types';

interface WhiteboardControlsProps {
  theme: WhiteboardTheme;
  onChangeTheme: (theme: WhiteboardTheme) => void;
  hasCustomBackground: boolean;
  onUploadBackground: (dataUrl: string) => void;
  onRemoveCustomBackground: () => void;
  onClose?: () => void;
}

const THEMES: { id: WhiteboardTheme; name: string; previewClass: string }[] = [
  { id: 'blackboard', name: 'Dark Blackboard', previewClass: 'bg-[#15231c] border-emerald-800' },
  { id: 'math_grid', name: 'Math Grid', previewClass: 'bg-[#0f172a] border-sky-800' },
  { id: 'clean_white', name: 'Clean White', previewClass: 'bg-[#f8fafc] border-slate-300' },
  { id: 'dot_grid', name: 'Dot Grid', previewClass: 'bg-[#1e1e2e] border-indigo-800' },
  { id: 'blueprint', name: 'Blueprint', previewClass: 'bg-[#0f3460] border-blue-500' },
];

export const WhiteboardControls: React.FC<WhiteboardControlsProps> = ({
  theme,
  onChangeTheme,
  hasCustomBackground,
  onUploadBackground,
  onRemoveCustomBackground,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadBackground(reader.result);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input so user can pick same file again if desired
    e.target.value = '';
  };

  return (
    <div
      id="whiteboard-controls-panel"
      className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl w-80 text-slate-200 text-sm space-y-3.5 animate-in fade-in zoom-in-95"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 font-semibold text-slate-100">
          <Palette size={17} className="text-emerald-400" />
          <span>Teaching Board Theme</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Board Theme grid */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
          <Grid size={13} />
          <span>Background Canvas</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => {
            const isSelected = theme === t.id && !hasCustomBackground;
            return (
              <button
                key={t.id}
                id={`theme-${t.id}`}
                onClick={() => {
                  if (hasCustomBackground) onRemoveCustomBackground();
                  onChangeTheme(t.id);
                }}
                className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 ring-1 ring-emerald-500'
                    : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700/60'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border ${t.previewClass}`} />
                <span className="truncate">{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Slide / Diagram */}
      <div className="pt-2 border-t border-slate-800 space-y-2">
        <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
          <ImageIcon size={13} />
          <span>Slide / Diagram Backdrop</span>
        </label>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {hasCustomBackground ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-900/30 border border-emerald-600/40 text-xs text-emerald-300">
            <span className="flex items-center gap-1.5">
              <FileCheck size={14} /> Custom Slide Loaded
            </span>
            <button
              id="btn-remove-slide"
              onClick={onRemoveCustomBackground}
              className="text-slate-400 hover:text-rose-400 p-1 hover:bg-slate-800 rounded"
              title="Remove slide image"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            id="btn-upload-slide"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-xs text-slate-300 font-medium transition-all"
          >
            <Upload size={14} className="text-slate-400" />
            <span>Upload Slide / Problem Image</span>
          </button>
        )}
      </div>
    </div>
  );
};
