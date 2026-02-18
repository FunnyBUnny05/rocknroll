import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  /** What area this boundary protects, shown in the fallback UI */
  label: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - Catches render errors so the rest of the app survives.
 * Wraps risky areas (3D canvas, transcription UI) with a visible fallback
 * instead of a white screen of death.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[GhostGuitar] ErrorBoundary (${this.props.label}) caught:`,
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-6 text-center">
          <div className="mb-2 text-sm font-medium text-red-400">
            {this.props.label} failed to load
          </div>
          <div className="mb-4 text-xs text-red-500/70">
            {this.state.error?.message ?? 'Unknown error'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-md bg-red-900/50 px-4 py-1.5 text-xs text-red-300 transition hover:bg-red-900/70"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
