import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error) => void;
};

type State = { failed: boolean };

/** Evita que un fallo del WebView/mapa tumbe toda la app. */
export class MapSafeBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError?.(error);
    console.warn('[MapSafeBoundary]', error);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}
