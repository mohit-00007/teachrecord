/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WifiOff, HardDrive } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-status-banner"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900/95 border border-amber-500/60 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2"
      role="status"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
      </span>
      <div className="flex items-center gap-1.5">
        <WifiOff size={13} className="text-amber-400" />
        <span>Offline Studio Mode Active</span>
      </div>
      <span className="text-slate-400 text-[11px] border-l border-slate-700 pl-2 flex items-center gap-1">
        <HardDrive size={11} />
        Recordings saved locally to device
      </span>
    </div>
  );
};
