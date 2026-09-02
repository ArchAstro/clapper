import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ onError?: (m: string) => void; resetKey?: string; children: ReactNode }, { failed: boolean; key?: string }> {
  state = { failed: false, key: undefined as string | undefined };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  static getDerivedStateFromProps(props: { resetKey?: string }, state: { failed: boolean; key?: string }) {
    if (props.resetKey !== state.key) return { failed: false, key: props.resetKey };
    return null;
  }
  componentDidCatch(e: Error) {
    this.props.onError?.(String(e.stack ?? e));
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
