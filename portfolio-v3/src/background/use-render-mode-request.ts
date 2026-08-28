import { useCallback, useEffect, useRef } from "react";
import {
  useBackgroundMode,
  type BackgroundMode,
  type SeedPoint,
} from "./background-mode-core";
import { useModalController } from "../modals/modal-context-core";
import {
  getModalScrollRoot,
  whenModalScrolledToTop,
} from "../modals/modal-scroll-controller";
import { setPointerShiftLocked } from "../scene/camera/pointer-shift-lock";

/* If requestMode is refused (another transition claimed the slot first) no
   phase change ever arrives, so the tilt lock is released on this timer
   instead of being held for the rest of the session. */
const LOCK_RELEASE_FALLBACK_MS = 900;

/**
 * Falls back to the lower-right corner, which is where the starfield's render
 * rail sits, so a transition seeded from a modal still blooms from the same
 * place a home-screen selection would.
 */
function getFallbackSeedPoint(): SeedPoint {
  return { x: window.innerWidth, y: window.innerHeight };
}

/**
 * Shared entry point for every render-mode control.
 *
 * From inside a modal the sequence is: freeze the pointer camera tilt, close
 * back to the starfield, wait for that scroll to land, then start the render
 * transition. Freezing first is what keeps a moving cursor from skewing the
 * scene while the page glides upward.
 */
export function useRenderModeRequest() {
  const { close } = useModalController();
  const { isTransitioning, requestMode, targetMode } = useBackgroundMode();
  const isRunningRef = useRef(false);
  const sawTransitionRef = useRef(false);
  const fallbackTimerRef = useRef<number | null>(null);

  const releaseLock = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    isRunningRef.current = false;
    sawTransitionRef.current = false;
    setPointerShiftLocked(false);
  }, []);

  /* Hold the tilt for the whole transition, then release on the way out. */
  useEffect(() => {
    if (isTransitioning) {
      sawTransitionRef.current = true;
      return;
    }

    if (sawTransitionRef.current) {
      releaseLock();
    }
  }, [isTransitioning, releaseLock]);

  /* A remount must never strand the camera in a frozen pose. */
  useEffect(() => () => releaseLock(), [releaseLock]);

  return useCallback(
    (mode: BackgroundMode, getSeedPoint?: () => SeedPoint) => {
      if (isRunningRef.current || isTransitioning || mode === targetMode) {
        return;
      }

      isRunningRef.current = true;
      setPointerShiftLocked(true);

      /* Only ask the modal layer to close when there is something to close.
         Requesting navigation while already at the starfield would mark the
         layer open without a following scroll event to correct it. */
      if ((getModalScrollRoot()?.scrollTop ?? 0) > 1) {
        close();
      }

      void whenModalScrolledToTop().then(() => {
        requestMode(mode, getSeedPoint?.() ?? getFallbackSeedPoint());

        fallbackTimerRef.current = window.setTimeout(() => {
          fallbackTimerRef.current = null;

          if (!sawTransitionRef.current) {
            releaseLock();
          }
        }, LOCK_RELEASE_FALLBACK_MS);
      });
    },
    [close, isTransitioning, releaseLock, requestMode, targetMode],
  );
}
