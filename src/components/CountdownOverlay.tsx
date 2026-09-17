import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playCountdownTone } from '../utils/audioMixer';

interface CountdownOverlayProps {
  onComplete: () => void;
  countFrom?: number;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  onComplete,
  countFrom = 3,
}) => {
  const [count, setCount] = useState<number>(countFrom);

  useEffect(() => {
    // Play initial tone
    playCountdownTone('low');

    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          playCountdownTone('high');
          setTimeout(() => {
            onComplete();
          }, 400);
          return 0;
        }
        playCountdownTone('low');
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countFrom, onComplete]);

  return (
    <div
      id="countdown-modal-overlay"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md select-none pointer-events-auto"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex flex-col items-center justify-center"
        >
          {count > 0 ? (
            <div className="flex flex-col items-center">
              <span className="text-9xl font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-rose-400 via-rose-500 to-amber-400 drop-shadow-[0_10px_35px_rgba(244,63,94,0.4)]">
                {count}
              </span>
              <span className="text-sm font-medium text-slate-300 mt-4 tracking-widest uppercase bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-700">
                Get ready to teach...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-7xl font-black tracking-tight text-emerald-400 drop-shadow-[0_10px_35px_rgba(16,185,129,0.5)] uppercase">
                RECORDING!
              </span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
