/* Lets the render-mode controls drive the modal scroller without threading a
   ref through every panel. ModalLayer owns the element; this module only
   exposes the one operation the render menu needs. */
let scrollRoot: HTMLElement | null = null;

/** Give up on a stalled smooth scroll rather than blocking the transition. */
const SCROLL_TO_TOP_TIMEOUT_MS = 1_400;

export function registerModalScrollRoot(element: HTMLElement | null) {
  scrollRoot = element;
}

export function getModalScrollRoot() {
  return scrollRoot;
}

/**
 * Resolves once the modal stack has returned to the starfield. The caller is
 * expected to have already requested the close, so this only observes; if the
 * animation never lands (a competing user scroll, a background tab) the
 * position is forced so the render transition still runs.
 */
export function whenModalScrolledToTop(): Promise<void> {
  const element = scrollRoot;

  if (!element || element.scrollTop <= 1) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const startedAt = performance.now();

    const check = () => {
      if (element.scrollTop <= 1) {
        resolve();
        return;
      }

      if (performance.now() - startedAt >= SCROLL_TO_TOP_TIMEOUT_MS) {
        element.scrollTo({ behavior: "auto", top: 0 });
        resolve();
        return;
      }

      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
  });
}
