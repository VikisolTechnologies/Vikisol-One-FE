import { Component } from 'react';
import { logError } from '../utils/logger';

// Without this, ANY uncaught render error anywhere in the tree (a bad prop, a lazy chunk that
// 404s because the user has an old tab open from before the latest deploy, etc.) unmounts the
// whole app and leaves a blank white screen with no way to recover except knowing to hit F5 -
// this is the most likely explanation for "blank page after clicking around" reports, since a
// stale chunk reference is exactly the kind of error that only shows up "sometimes, after a
// deploy" rather than being consistently reproducible.
function isChunkLoadError(error) {
  const msg = String(error?.message || '');
  return /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i.test(msg);
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logError('app.render_crash', error, { componentStack: info?.componentStack });

    // A stale chunk means the deployed build has moved on since this tab loaded - reloading
    // fetches the current index.html/asset manifest and fixes itself with no user action needed.
    // Guarded by a one-shot sessionStorage flag so a genuinely broken chunk can't reload-loop
    // forever; if it happens again this session, fall through to the manual fallback UI instead.
    if (isChunkLoadError(error)) {
      const key = 'vikisol_chunk_reload_attempted';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-1 p-6">
          <div className="max-w-sm w-full text-center space-y-4">
            <h1 className="text-lg font-semibold text-text">Something went wrong</h1>
            <p className="text-sm text-text-secondary">
              This page ran into an unexpected error. Reloading usually fixes it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
