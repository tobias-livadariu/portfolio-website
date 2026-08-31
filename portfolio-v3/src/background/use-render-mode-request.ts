import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import {
  BACKGROUND_TRANSITION,
  useBackgroundMode,
  type BackgroundMode,
  type SeedPoint,
} from "./background-mode-core";
import { useModalController } from "../modals/modal-context-core";
import {
  getModalScrollRoot,
  runWhenModalScrolledToTop,
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
 * back to the starfield, wait for that scroll to land, hold for the configured
 * visual pause, then start the render transition. Freezing first is what keeps
 * a moving cursor from skewing the scene while the page glides upward.
 */
export function useRenderModeRequest() {
  const { close } = useModalController();
  const {
    isRenderModeInputLocked,
    isTransitioning,
    requestMode,
    setRenderModeInputLocked,
    targetMode,
  } = useBackgroundMode();
  const isRunningRef = useRef(false);
  const sawTransitionRef = useRef(false);
  const fallbackTimerRef = useRef<number | null>(null);
  const modalReturnPauseFrameRef = useRef<number | null>(null);
  const modalReturnPauseTimerRef = useRef<number | null>(null);

  const releaseLock = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (modalReturnPauseTimerRef.current !== null) {
      window.clearTimeout(modalReturnPauseTimerRef.current);
      modalReturnPauseTimerRef.current = null;
    }
    if (modalReturnPauseFrameRef.current !== null) {
      window.cancelAnimationFrame(modalReturnPauseFrameRef.current);
      modalReturnPauseFrameRef.current = null;
    }

    isRunningRef.current = false;
    sawTransitionRef.current = false;
    setRenderModeInputLocked(false);
    setPointerShiftLocked(false);
  }, [setRenderModeInputLocked]);

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
      if (
        isRunningRef.current ||
        isRenderModeInputLocked ||
        isTransitioning ||
        mode === targetMode
      ) {
        return;
      }

      isRunningRef.current = true;
      setPointerShiftLocked(true);
      const isReturningFromModal = (getModalScrollRoot()?.scrollTop ?? 0) > 1;

      /* Only ask the modal layer to close when there is something to close.
         Requesting navigation while already at the starfield would mark the
         layer open without a following scroll event to correct it. */
      if (isReturningFromModal) {
        /* Lock the starfield rail before the close starts. A synchronous
           commit removes the click target before the upward scroll can expose
           it beneath the pointer. */
        flushSync(() => setRenderModeInputLocked(true));
        close();
      }

      runWhenModalScrolledToTop(() => {
        const startTransition = () => {
          modalReturnPauseTimerRef.current = null;

          /* Commit in the same task as the intentional pause ending. React's
             normal scheduling should not add an accidental extra frame. */
          flushSync(() => {
            requestMode(mode, getSeedPoint?.() ?? getFallbackSeedPoint());
          });

          fallbackTimerRef.current = window.setTimeout(() => {
            fallbackTimerRef.current = null;

            if (!sawTransitionRef.current) {
              releaseLock();
            }
          }, LOCK_RELEASE_FALLBACK_MS);
        };

        if (
          isReturningFromModal &&
          BACKGROUND_TRANSITION.modalReturnPauseMs > 0
        ) {
          /* The final snap to zero happens before paint. Begin the pause on the
             following frame so its full duration is visible against the
             restored starfield in every browser engine. */
          modalReturnPauseFrameRef.current = window.requestAnimationFrame(
            () => {
              modalReturnPauseFrameRef.current = null;
              modalReturnPauseTimerRef.current = window.setTimeout(
                startTransition,
                BACKGROUND_TRANSITION.modalReturnPauseMs,
              );
            },
          );
          return;
        }

        startTransition();
      });
    },
    [
      close,
      isRenderModeInputLocked,
      isTransitioning,
      releaseLock,
      requestMode,
      setRenderModeInputLocked,
      targetMode,
    ],
  );
}
