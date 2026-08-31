/* Lets the render-mode controls drive the modal scroller without threading a
   ref through every panel. ModalLayer owns the element; this module only
   exposes the one operation the render menu needs. */
let scrollRoot: HTMLElement | null = null;

/** Give up on a stalled smooth scroll rather than blocking the transition. */
const SCROLL_TO_TOP_TIMEOUT_MS = 1_400;

/* A smooth scroll eases out, so its final pixels crawl: measured in Chrome,
   the last ~28px of the return to the starfield take about 110ms during which
   nothing perceptibly moves. Waiting for a true zero therefore reads as a
   pause between the modal closing and the transition starting. Inside this
   distance the remainder is snapped instead — at well under a line of text the
   jump is invisible, and the transition begins a tenth of a second sooner. */
const LANDING_SNAP_PX = 16;

export function registerModalScrollRoot(element: HTMLElement | null) {
  scrollRoot = element;
}

export function getModalScrollRoot() {
  return scrollRoot;
}

/**
 * Runs `onSettled` as soon as the modal stack has returned to the starfield.
 *
 * The callback is invoked synchronously, inside the same animation frame that
 * observes the landing, rather than through a promise. A promise would hand
 * the continuation to a microtask and then to React's scheduler, which cost a
 * visible beat between the scroll finishing and the transition starting.
 *
 * The caller is expected to have already requested the close, so this only
 * observes; if the animation never lands (a competing user scroll, a
 * backgrounded tab) the position is forced so the transition still runs.
 */
export function runWhenModalScrolledToTop(onSettled: () => void) {
  const element = scrollRoot;

  if (!element) {
    onSettled();
    return;
  }

  /* Also cancels the in-flight smooth scroll in every engine, which is what
     stops it from easing back down over the snap. */
  const settle = () => {
    if (element.scrollTop !== 0) {
      element.scrollTo({ behavior: "auto", top: 0 });
    }

    onSettled();
  };

  if (element.scrollTop <= LANDING_SNAP_PX) {
    settle();
    return;
  }

  const startedAt = performance.now();

  const check = () => {
    if (
      element.scrollTop <= LANDING_SNAP_PX ||
      performance.now() - startedAt >= SCROLL_TO_TOP_TIMEOUT_MS
    ) {
      settle();
      return;
    }

    requestAnimationFrame(check);
  };

  requestAnimationFrame(check);
}
