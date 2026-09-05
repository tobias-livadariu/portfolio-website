import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Named in the console so a blank region can be traced to its cause. */
  label: string;
  /**
   * Called once when the subtree fails. Anything waiting on this region has to
   * be released here, or it waits for a signal that is never coming.
   */
  onFailure?: () => void;
}

interface State {
  hasFailed: boolean;
}

/**
 * Contains a failure to one part of the scene.
 *
 * React Three Fiber wraps everything inside a `<Canvas>` in a single error
 * boundary, so a throw anywhere under it takes the whole 3D scene with it —
 * one image or typeface that fails to fetch, and the starfield, the menu and
 * the post-processing all vanish together, leaving only the DOM around them.
 * Suspense makes this easy to hit: a rejected `useLoader` surfaces as a throw
 * during render, and a transient network failure is enough.
 *
 * Splitting the canvas into regions with their own boundaries turns that into
 * a missing menu or a missing starfield instead of a missing everything. The
 * failure is not retried here: a rejected loader result is cached, so a remount
 * would rethrow immediately and spin.
 */
export default class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasFailed: false };

  static getDerivedStateFromError(): State {
    return { hasFailed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `Scene region "${this.props.label}" failed and was dropped:`,
      error,
      info.componentStack,
    );
    this.props.onFailure?.();
  }

  render() {
    return this.state.hasFailed ? null : this.props.children;
  }
}
