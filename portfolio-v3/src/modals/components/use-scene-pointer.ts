import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { isModalScenePosterCapture } from "../portfolio/modal-scene-poster-capture";

export interface ScenePointerState {
  isActive: boolean;
  isInsideCanvas: boolean;
  x: number;
  y: number;
}

interface ScenePointerOptions {
  clampX: number;
  clampY: number;
}

const RESTING_POINTER: ScenePointerState = {
  isActive: false,
  isInsideCanvas: false,
  x: 0,
  y: 0,
};

/**
 * Tracks a mouse continuously, but treats touch and pen input as active only
 * between pointerdown and pointerup/pointercancel. Releasing a pressed pointer
 * restores the neutral coordinates so scene motion can damp back to rest.
 *
 * The hook listens on window rather than the canvas because story canvases are
 * deliberately pointer-transparent, allowing the terminal to remain
 * selectable and scrollable on top of them.
 */
export function useScenePointer(
  targetRef: RefObject<HTMLElement | null>,
  { clampX, clampY }: ScenePointerOptions,
) {
  const pointer = useRef<ScenePointerState>({ ...RESTING_POINTER });
  const activePressedPointerId = useRef<number | null>(null);

  useEffect(() => {
    /* Poster captures must depict the pose a scene holds on its own first
       frame, which is the resting one. Leaving the pointer live would bake
       whatever the capture browser's cursor happened to be doing into the
       thumbnail every scene hands over from. */
    if (isModalScenePosterCapture()) {
      return;
    }

    const resetPointer = () => {
      pointer.current = { ...RESTING_POINTER };
    };

    const coordinatesFor = (event: PointerEvent): ScenePointerState | null => {
      const target = targetRef.current;

      if (!target) {
        return null;
      }

      const rect = target.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }

      const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (event.clientY - rect.top - rect.height / 2) / rect.height;

      return {
        isActive: true,
        isInsideCanvas: x >= -0.5 && x <= 0.5 && y >= -0.5 && y <= 0.5,
        x: Math.max(-clampX, Math.min(clampX, x)),
        y: Math.max(-clampY, Math.min(clampY, y)),
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        if (activePressedPointerId.current !== event.pointerId) {
          return;
        }
      }

      const next = coordinatesFor(event);

      if (next) {
        pointer.current = next;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") {
        handlePointerMove(event);
        return;
      }

      if (!event.isPrimary) {
        return;
      }

      const next = coordinatesFor(event);

      if (!next?.isInsideCanvas) {
        return;
      }

      activePressedPointerId.current = event.pointerId;
      pointer.current = next;
    };

    const handlePressedPointerEnd = (event: PointerEvent) => {
      if (
        event.pointerType === "mouse" ||
        activePressedPointerId.current !== event.pointerId
      ) {
        return;
      }

      activePressedPointerId.current = null;
      resetPointer();
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.relatedTarget === null) {
        resetPointer();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        activePressedPointerId.current = null;
        resetPointer();
      }
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    window.addEventListener("pointerup", handlePressedPointerEnd, {
      passive: true,
    });
    window.addEventListener("pointercancel", handlePressedPointerEnd, {
      passive: true,
    });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("blur", resetPointer);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePressedPointerEnd);
      window.removeEventListener("pointercancel", handlePressedPointerEnd);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("blur", resetPointer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clampX, clampY, targetRef]);

  return pointer;
}
