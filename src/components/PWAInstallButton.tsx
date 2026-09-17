/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Laptop, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { OfflineDesktopModal } from './OfflineDesktopModal';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <button
        id="btn-pwa-install-desktop"
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
          isInstalled
            ? 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300'
            : isInstallable
              ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-rose-500/20'
              : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white'
        }`}
        title="Install TeachRecord as a Windows desktop offline app or build .exe"
      >
        {isInstalled ? (
          <>
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">Installed (Offline)</span>
            <span className="sm:hidden">Installed</span>
          </>
        ) : (
          <>
            <Laptop size={14} className="text-rose-300" />
            <span className="hidden sm:inline">Desktop App (.exe)</span>
            <span className="sm:hidden">Install</span>
            <span className="text-[10px] bg-slate-950/60 px-1.5 py-0.5 rounded text-rose-300 border border-rose-400/30">
              Offline
            </span>
          </>
        )}
      </button>

      <OfflineDesktopModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
