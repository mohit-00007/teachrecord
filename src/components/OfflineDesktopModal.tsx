/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Download,
  Monitor,
  CheckCircle2,
  WifiOff,
  Laptop,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface OfflineDesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineDesktopModal: React.FC<OfflineDesktopModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pwa' | 'exe'>('pwa');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Laptop className="text-white" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Offline & Desktop Installation
                </h3>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  100% Offline Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Run TeachRecord locally on Windows without internet connection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 pb-1 border-b border-slate-800/80 bg-slate-950/30 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'pwa'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Download size={14} />
            <span>1-Click Desktop App (Recommended)</span>
          </button>
          <button
            onClick={() => setActiveTab('exe')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'exe'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Terminal size={14} />
            <span>Standalone .exe Build</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm">
          {activeTab === 'pwa' ? (
            <div className="space-y-5">
              {/* Highlight Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-900 border border-rose-500/30 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                      <Sparkles size={16} className="text-amber-400" />
                      Direct Windows Desktop App (Instant)
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Install TeachRecord directly as a native Windows desktop app using Google
                      Chrome or Microsoft Edge. It appears on your Windows Desktop, Start Menu, and
                      Taskbar, running in its own window without browser toolbars.
                    </p>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2">
                  {isInstalled ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold bg-emerald-950/40 border border-emerald-500/40 px-3.5 py-2.5 rounded-xl">
                      <CheckCircle2 size={16} />
                      <span>TeachRecord is already installed as a desktop application!</span>
                    </div>
                  ) : isInstallable ? (
                    <button
                      onClick={async () => {
                        const success = await install();
                        if (success) onClose();
                      }}
                      className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white px-5 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
                    >
                      <Download size={16} />
                      <span>Install TeachRecord on Windows Now</span>
                    </button>
                  ) : isIOS ? (
                    <div className="text-xs text-slate-300 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                      On iOS Safari: Tap the <strong>Share button</strong> at bottom, then tap{' '}
                      <strong>Add to Home Screen</strong>.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/40 p-3 rounded-xl">
                        To install right now: Click the{' '}
                        <strong>Install App icon (computer with down arrow)</strong> in your
                        browser's address bar (Chrome or Edge on Windows), or click{' '}
                        <strong>
                          Settings (three dots) → Save and Share → Install TeachRecord
                        </strong>
                        .
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Offline Capabilities Matrix */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Offline Protection & Local Features
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-white font-medium text-xs">
                      <WifiOff size={14} className="text-emerald-400" />
                      <span>Works Without Internet</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      The service worker caches all recording scripts, audio mixer, and canvas
                      pipelines locally.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-white font-medium text-xs">
                      <HardDrive size={14} className="text-emerald-400" />
                      <span>100% Local Storage</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Recorded lecture videos are saved directly to your device's IndexedDB and can
                      be downloaded as MP4/WebM anytime.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-white font-medium text-xs">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      <span>Private & Secure</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      No video or audio feeds are sent to external servers. Your screen and
                      microphone stay strictly on your computer.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-white font-medium text-xs">
                      <Monitor size={14} className="text-emerald-400" />
                      <span>Dedicated Window</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Launches from your Windows Start Menu without address bars, tabs, or browser
                      distractions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-semibold text-white text-xs flex items-center gap-2">
                  <Terminal size={14} className="text-rose-400" />
                  Standalone Windows .exe Executable Builder
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  We have included the official Electron desktop runner (
                  <code className="text-rose-300 bg-rose-950/40 px-1 py-0.5 rounded">
                    electron/main.cjs
                  </code>
                  ) in this project. You can export this project as a ZIP to compile an independent{' '}
                  <code className="text-amber-300">TeachRecord-Setup.exe</code> on your Windows PC!
                </p>
              </div>

              {/* Step by step */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-rose-400 flex-shrink-0">
                    1
                  </div>
                  <div className="space-y-1 text-xs">
                    <span className="font-semibold text-white">Export Project Code</span>
                    <p className="text-slate-400">
                      In the top-right menu of Google AI Studio, click <strong>Settings</strong> →{' '}
                      <strong>Export to ZIP</strong> (or sync to your GitHub).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-rose-400 flex-shrink-0">
                    2
                  </div>
                  <div className="space-y-2 text-xs w-full">
                    <span className="font-semibold text-white">
                      Unzip and Build on your Windows PC
                    </span>
                    <p className="text-slate-400">
                      Open Command Prompt or PowerShell in the unzipped folder and run:
                    </p>

                    <div className="relative bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                      <div className="flex items-center justify-between">
                        <span>npm install</span>
                        <button
                          onClick={() =>
                            copyToClipboard('npm install\nnpm run build:exe', 'build-cmd')
                          }
                          className="text-slate-400 hover:text-white p-1"
                          title="Copy commands"
                        >
                          {copiedCmd === 'build-cmd' ? (
                            <Check size={14} className="text-emerald-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                      <div className="text-slate-500"># Compiles native Windows .exe installer</div>
                      <div>npm run build:exe</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-rose-400 flex-shrink-0">
                    3
                  </div>
                  <div className="space-y-1 text-xs">
                    <span className="font-semibold text-white">Run Standalone .exe</span>
                    <p className="text-slate-400">
                      Your setup file will be generated at{' '}
                      <code className="text-rose-300 bg-slate-900 px-1 py-0.5 rounded">
                        dist/TeachRecord-Setup.exe
                      </code>
                      . Double click it to install and launch without any dependencies or internet
                      connection!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Zero server upload • Data stays on your PC</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
