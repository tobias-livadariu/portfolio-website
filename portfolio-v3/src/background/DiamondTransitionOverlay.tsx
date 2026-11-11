import { useEffect, useLayoutEffect, useRef } from "react";
import { COLOR_PALETTE_STR } from "../theme/colors";
import { useBackgroundMode } from "./background-mode-core";
import {
  captureSceneStill,
  getSceneCanvasPlacement,
  type SceneStill,
} from "./scene-snapshot";
import {
  createTransitionFront,
  TRANSITION_SHADE,
  type TransitionFront,
} from "./transition-fronts";
import type { BackgroundMode } from "./background-mode-core";
import "./background-mode.css";

interface CanvasFit {
  height: number;
  pixelRatio: number;
  width: number;
}

/* Sizes the overlay's bitmap. It uses the scene canvas's own pixel ratio, so
   a still of the scene is drawn pixel for pixel and does not shift or soften
   when it replaces the live scene. The ratio is chosen once per overlay and
   kept on the element: changing it would clear the bitmap mid-transition. */
function fitCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): CanvasFit {
  let pixelRatio = Number(canvas.dataset.pixelRatio);

  if (!(pixelRatio > 0)) {
    pixelRatio =
      getSceneCanvasPlacement()?.pixelRatio ??
      Math.min(window.devicePixelRatio || 1, 2);
    canvas.dataset.pixelRatio = String(pixelRatio);
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelWidth = Math.max(1, Math.round(width * pixelRatio));
  const pixelHeight = Math.max(1, Math.round(height * pixelRatio));

  /* Assigning either canvas dimension clears its bitmap, even when the value
     is unchanged. Preserve the drawn frame across React phase handoffs. */
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  return { height, pixelRatio, width };
}

/* Builds the picture the overlay holds while the scenes are swapped: the
   resting outgoing scene, dimmed exactly as the cover beat left it. Without
   a capture (startup, or a scene that could not be copied) it is the plain
   background colour, which is the old solid cover. The returned context
   draws in CSS pixels, so a front can erase from it directly. */
function createStill(
  canvas: HTMLCanvasElement,
  pixelRatio: number,
  capture: SceneStill | null,
) {
  const stillCanvas = document.createElement("canvas");

  stillCanvas.width = canvas.width;
  stillCanvas.height = canvas.height;

  const still = stillCanvas.getContext("2d");

  if (!still) {
    return null;
  }

  still.fillStyle = COLOR_PALETTE_STR.background;
  still.fillRect(0, 0, stillCanvas.width, stillCanvas.height);
  still.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  if (capture) {
    const { left, top, width, height } = capture.placement;

    still.drawImage(capture.image, left, top, width, height);
    still.globalAlpha = TRANSITION_SHADE.alpha;
    still.fillRect(
      0,
      0,
      stillCanvas.width / pixelRatio,
      stillCanvas.height / pixelRatio,
    );
    still.globalAlpha = 1;
  }

  return still;
}

/* What one transition carries from phase to phase. The effect below is torn
   down and rebuilt on every phase change, so this lives in a ref. */
interface TransitionRuntime {
  front: TransitionFront | null;
  frontMode: BackgroundMode | null;
  startedAt: number | null;
  still: CanvasRenderingContext2D | null;
}

/* Full-screen canvas that carries a render-mode change. See
   `transition-fronts.ts` for the three beats and each destination's look. */
export default function DiamondTransitionOverlay() {
  const {
    isInitialRevealComplete,
    notifyCleared,
    notifyCovered,
    phase,
    seedPoint,
    targetMode,
  } = useBackgroundMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<TransitionRuntime>({
    front: null,
    frontMode: null,
    startedAt: null,
    still: null,
  });

  /* Paint the startup cover before the browser can present the React tree.
     The CSS background is a pre-canvas fallback; this bitmap fill is what the
     opening aperture cuts through. Repeating it for the clearing commit
     prevents a transparent frame between phases. */
  useLayoutEffect(() => {
    if (isInitialRevealComplete || phase === "idle") {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) {
      return;
    }

    const { height, width } = fitCanvas(canvas, ctx);

    ctx.fillStyle = COLOR_PALETTE_STR.background;
    ctx.fillRect(0, 0, width, height);
  }, [isInitialRevealComplete, phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const runtime = runtimeRef.current;

    if (!canvas || phase === "idle") {
      runtime.front = null;
      runtime.frontMode = null;
      runtime.startedAt = null;
      runtime.still = null;
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      /* No 2D context: never strand the state machine. */
      if (phase === "covering") {
        notifyCovered();
      } else if (phase === "clearing") {
        notifyCleared();
      }
      return;
    }

    let fit = fitCanvas(canvas, ctx);
    let animationFrame: number | null = null;
    let cancelCapture: (() => void) | null = null;
    let done = false;
    const phaseStart = performance.now();

    if (phase === "covering" || runtime.startedAt === null) {
      runtime.startedAt = phaseStart;
    }

    /* Milliseconds since the transition began; keeps slow glyph pulses
       continuous across the three phases. */
    const getElapsed = (now: number) => now - (runtime.startedAt ?? phaseStart);

    const getFront = (rebuild = false) => {
      const existing = runtime.front;

      if (
        !rebuild &&
        existing &&
        runtime.frontMode === targetMode &&
        existing.width === fit.width &&
        existing.height === fit.height
      ) {
        return existing;
      }

      const seed = seedPoint ?? { x: fit.width, y: fit.height };
      const front = createTransitionFront(
        targetMode,
        fit.width,
        fit.height,
        seed,
      );

      runtime.front = front;
      runtime.frontMode = targetMode;
      return front;
    };

    const getStill = () => {
      const existing = runtime.still;

      if (
        existing &&
        existing.canvas.width === canvas.width &&
        existing.canvas.height === canvas.height
      ) {
        return existing;
      }

      runtime.still = createStill(canvas, fit.pixelRatio, null);
      return runtime.still;
    };

    const clearCanvas = () => {
      ctx.clearRect(0, 0, fit.width, fit.height);
    };

    const drawStill = () => {
      const still = getStill();

      if (!still) {
        ctx.fillStyle = COLOR_PALETTE_STR.background;
        ctx.fillRect(0, 0, fit.width, fit.height);
        return;
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(still.canvas, 0, 0);
      ctx.restore();
    };

    const renderHold = (front: TransitionFront, now: number) => {
      clearCanvas();
      drawStill();
      front.renderHold(ctx, getElapsed(now));
    };

    let front = getFront(phase === "covering");

    if (phase === "covering") {
      runtime.still = null;
    }

    const handleResize = () => {
      fit = fitCanvas(canvas, ctx);
      /* A resize invalidates both the front's geometry and the still. The
         rest of the transition runs over the plain background colour. */
      front = getFront(true);
      runtime.still = null;

      if (phase === "covered") {
        renderHold(front, performance.now());
      }
    };

    window.addEventListener("resize", handleResize);

    const stop = () => {
      window.removeEventListener("resize", handleResize);
      cancelCapture?.();

      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };

    if (phase === "covered") {
      const renderCovered = (now: number) => {
        renderHold(front, now);

        /* A still with nothing moving on it is drawn once. */
        if (front.animatesHold) {
          animationFrame = requestAnimationFrame(renderCovered);
        }
      };

      animationFrame = requestAnimationFrame(renderCovered);
      return stop;
    }

    if (phase === "covering") {
      const renderCovering = (now: number) => {
        const progress = Math.min(
          1,
          Math.max(0, (now - phaseStart) / front.coverDurationMs),
        );

        clearCanvas();
        front.renderCover(ctx, progress, getElapsed(now));

        if (progress >= 1 && !done) {
          done = true;
          /* The scene is at rest and fully dimmed. Copy it, show the copy,
             and only then let the scenes be swapped underneath. The loop
             keeps drawing the finished cover until the copy arrives. */
          cancelCapture = captureSceneStill((capture) => {
            cancelCapture = null;
            runtime.still = createStill(canvas, fit.pixelRatio, capture);
            renderHold(front, performance.now());
            notifyCovered();
          });
        }

        animationFrame = requestAnimationFrame(renderCovering);
      };

      animationFrame = requestAnimationFrame(renderCovering);
      return stop;
    }

    const renderClearing = (now: number) => {
      const progress = Math.min(
        1,
        Math.max(0, (now - phaseStart) / front.clearDurationMs),
      );
      const still = getStill();

      if (still) {
        front.erase(still, progress);
      }

      clearCanvas();
      drawStill();
      front.renderClear(ctx, progress, getElapsed(now));

      if (progress >= 1 || !still) {
        done = true;
        clearCanvas();
        notifyCleared();
        return;
      }

      animationFrame = requestAnimationFrame(renderClearing);
    };

    animationFrame = requestAnimationFrame(renderClearing);
    return stop;
  }, [notifyCleared, notifyCovered, phase, seedPoint, targetMode]);

  if (phase === "idle") {
    return null;
  }

  return (
    <canvas
      aria-hidden="true"
      className="bg-transition-overlay"
      data-phase={phase}
      data-startup={!isInitialRevealComplete ? "true" : undefined}
      data-target-mode={targetMode}
      ref={canvasRef}
    />
  );
}
