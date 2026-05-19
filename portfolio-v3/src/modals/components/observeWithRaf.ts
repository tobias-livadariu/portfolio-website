/**
 * Observe `target` for size changes and invoke `callback` at most once per
 * animation frame even when the underlying ResizeObserver fires on every
 * paint (i.e. during a sustained user resize). Returns a cleanup function.
 *
 * Falls back to a no-op cleanup when ResizeObserver is unavailable.
 */
export function observeWithRaf(
  target: Element,
  callback: () => void,
): () => void {
  if (typeof ResizeObserver === "undefined") {
    return () => {};
  }

  let frameHandle: number | null = null;

  const observer = new ResizeObserver(() => {
    if (frameHandle !== null) {
      return;
    }
    frameHandle = window.requestAnimationFrame(() => {
      frameHandle = null;
      callback();
    });
  });

  observer.observe(target);

  return () => {
    observer.disconnect();
    if (frameHandle !== null) {
      window.cancelAnimationFrame(frameHandle);
    }
  };
}
