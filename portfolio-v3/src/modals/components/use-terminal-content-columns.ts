import { useEffect, useRef, useState } from "react";
import { observeWithRaf } from "./observeWithRaf";

/**
 * Measure how many monospace characters fit in the parent
 * `.modal-terminal-body`'s content column. The consumer renders the returned
 * `measureRef` span (filled with 24 zeros) and `wrapperRef` div as siblings;
 * we infer `1ch` from that span and divide the content width by it.
 *
 * Updates are rAF-batched and snapped to `step` characters so a sustained
 * window resize (which fires ResizeObserver on every frame) triggers state
 * changes far less often than once per pixel.
 */
export function useTerminalContentColumns({
  fallback = 72,
  min = 22,
  step = 1,
}: { fallback?: number; min?: number; step?: number } = {}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [columns, setColumns] = useState(fallback);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const measure = measureRef.current;
    const terminalBody = wrapper?.closest(".modal-terminal-body");

    if (!wrapper || !measure || !(terminalBody instanceof HTMLElement)) {
      return;
    }

    const update = () => {
      const contentColumn = terminalBody.querySelector(
        ".modal-terminal-line-content",
      );
      const contentWidth =
        contentColumn instanceof HTMLElement
          ? contentColumn.getBoundingClientRect().width
          : terminalBody.clientWidth;
      const characterWidth = measure.getBoundingClientRect().width / 24;

      if (contentWidth <= 0 || characterWidth <= 0) {
        return;
      }

      const exact = Math.floor(contentWidth / characterWidth);
      const snapped =
        step > 1 ? Math.max(min, Math.floor(exact / step) * step) : exact;
      const next = Math.max(min, snapped);

      setColumns((current) => (current === next ? current : next));
    };

    update();
    void document.fonts?.ready.then(update);

    return observeWithRaf(terminalBody, update);
  }, [fallback, min, step]);

  return { columns, measureRef, wrapperRef };
}
