/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level crash guard.
 *
 * TeachRecord captures live camera/screen/audio streams into memory while a
 * lesson is being recorded. If a rendering error occurs anywhere in the tree,
 * the default behavior of React is to unmount everything, which would silently
 * destroy an in-progress or unsaved recording with no explanation to the user.
 *
 * This boundary catches that error, keeps the message on screen, and gives the
 * user a way to reload without losing recordings already flushed to
 * IndexedDB (recovery chunks / saved lessons survive a full page reload).
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep this local-only: no network calls, no telemetry. Logged to the
    // console so a developer (or a user filing a bug report) can retrieve it.
    console.error('[TeachRecord] Unhandled error:', error, errorInfo.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 p-6 text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-6 text-center shadow-2xl">
            <h1 className="text-lg font-semibold text-rose-300">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-400">
              TeachRecord hit an unexpected error and needs to reload. Any lesson already saved to
              your library is safe. If you were mid-recording, check the recovery prompt after
              reloading — recent footage is periodically saved automatically.
            </p>
            {this.state.error && (
              <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-slate-950/80 p-3 text-left text-xs text-slate-500">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500"
            >
              Reload TeachRecord
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
