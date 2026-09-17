import React, { useRef, useEffect } from 'react';
import { FileText, Play, Pause, RotateCcw, Type, Sliders, X, BookOpen } from 'lucide-react';
import { TeleprompterConfig } from '../types';

interface TeleprompterModalProps {
  config: TeleprompterConfig;
  onChangeConfig: (newConfig: Partial<TeleprompterConfig>) => void;
  onClose: () => void;
}

const LESSON_TEMPLATES = [
  {
    title: 'Lecture Intro',
    text: `Welcome to today's lesson! Today we'll cover:\n1. Core concepts and definitions\n2. Real-world walkthrough examples\n3. Common pitfalls & tips\n\nLet's get started on the first slide...`,
  },
  {
    title: 'Step-by-Step Tutorial',
    text: `In this step, pay close attention to the syntax.\nNotice how we define the parameters first.\nNext, run the execution and observe the output.\nRemember: test edge cases before proceeding!`,
  },
  {
    title: 'Review & Homework',
    text: `To recap what we learned:\n• Key takeaway #1\n• Key takeaway #2\nYour homework assignment is questions 1 through 5 on chapter 3. See you next class!`,
  },
];

export const TeleprompterModal: React.FC<TeleprompterModalProps> = ({
  config,
  onChangeConfig,
  onClose,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);

  // Auto-scroll loop
  useEffect(() => {
    if (!config.isScrolling) {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
      return;
    }

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    let lastTime = performance.now();

    const scrollStep = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      // scroll speed based on config.speed
      const pixelsToScroll = (config.speed * 20 * delta) / 1000;
      scrollEl.scrollTop += pixelsToScroll;

      // Loop or stop at bottom
      if (scrollEl.scrollTop + scrollEl.clientHeight < scrollEl.scrollHeight) {
        scrollAnimationRef.current = requestAnimationFrame(scrollStep);
      } else {
        onChangeConfig({ isScrolling: false });
      }
    };

    scrollAnimationRef.current = requestAnimationFrame(scrollStep);

    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, [config.isScrolling, config.speed, onChangeConfig]);

  const handleResetScroll = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    onChangeConfig({ isScrolling: false });
  };

  return (
    <div
      id="teleprompter-drawer"
      style={{ opacity: config.opacity }}
      className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl w-96 max-w-[calc(100vw-2rem)] text-slate-100 space-y-3 transition-opacity"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileText size={17} className="text-amber-400" />
          <span className="font-semibold text-sm">Teacher Teleprompter / Notes</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X size={16} />
        </button>
      </div>

      {/* Script Text Container */}
      <div
        ref={scrollRef}
        style={{ fontSize: `${config.fontSize}px` }}
        className="h-44 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 font-sans leading-relaxed text-slate-200 border border-slate-800 bg-slate-950/60 p-3 rounded-xl focus-within:ring-1 focus-within:ring-amber-500/50"
      >
        <textarea
          value={config.text}
          onChange={(e) => onChangeConfig({ text: e.target.value })}
          placeholder="Paste or write your lecture notes and teaching script here..."
          className="w-full h-full bg-transparent resize-none border-none outline-none text-inherit leading-relaxed"
          rows={5}
        />
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <button
            id="btn-teleprompter-play"
            onClick={() => onChangeConfig({ isScrolling: !config.isScrolling })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              config.isScrolling
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
            }`}
          >
            {config.isScrolling ? <Pause size={14} /> : <Play size={14} />}
            <span>{config.isScrolling ? 'Pause' : 'Auto-Scroll'}</span>
          </button>

          <button
            id="btn-teleprompter-reset"
            onClick={handleResetScroll}
            title="Reset to start"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Speed & Font Size */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1" title="Scroll Speed">
            <span className="text-[11px] text-slate-400">Speed</span>
            <input
              type="range"
              min={1}
              max={5}
              step={0.5}
              value={config.speed}
              onChange={(e) => onChangeConfig({ speed: parseFloat(e.target.value) })}
              className="w-14 h-1 accent-amber-400 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1" title="Font Size">
            <Type size={12} className="text-slate-400" />
            <input
              type="range"
              min={14}
              max={32}
              value={config.fontSize}
              onChange={(e) => onChangeConfig({ fontSize: parseInt(e.target.value, 10) })}
              className="w-12 h-1 accent-amber-400 bg-slate-800 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Opacity slider & Script Presets */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Sliders size={12} />
          <span>Opacity</span>
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.1}
            value={config.opacity}
            onChange={(e) => onChangeConfig({ opacity: parseFloat(e.target.value) })}
            className="w-12 h-1 accent-slate-400 bg-slate-800 rounded cursor-pointer"
          />
        </div>

        {/* Quick templates */}
        <div className="flex items-center gap-1">
          <BookOpen size={11} />
          <span>Templates:</span>
          {LESSON_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              onClick={() => onChangeConfig({ text: tmpl.text })}
              className="text-amber-400 hover:underline px-1 py-0.5 rounded"
            >
              #{idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
