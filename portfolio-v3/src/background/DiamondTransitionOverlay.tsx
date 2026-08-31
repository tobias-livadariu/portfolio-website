import { useEffect, useLayoutEffect, useRef } from "react";
import { COLOR_PALETTE_STR } from "../theme/colors";
import {
  ASCII_GRAPH_TRANSITION,
  buildAsciiTransitionField,
  renderAsciiTransitionFrame,
  type AsciiTransitionField,
} from "./ascii-graph-transition";
import { useBackgroundMode } from "./background-mode-core";
import {
  buildDiamondField,
  DIAMOND_TRANSITION,
  type DiamondTile,
} from "./diamond-lattice";
import "./background-mode.css";

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function easeInCubic(t: number) {
  return t ** 3;
}

function fitCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));

  /* Assigning either canvas dimension clears its bitmap, even when the value
     is unchanged. Preserve the generated field across React phase handoffs. */
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { height, width };
}

function traceDiamond(
  ctx: CanvasRenderingContext2D,
  tile: DiamondTile,
  halfDiagonal: number,
) {
  ctx.moveTo(tile.cx, tile.cy - halfDiagonal);
  ctx.lineTo(tile.cx + halfDiagonal, tile.cy);
  ctx.lineTo(tile.cx, tile.cy + halfDiagonal);
  ctx.lineTo(tile.cx - halfDiagonal, tile.cy);
  ctx.closePath();
}

/* Full-screen canvas that hides the background swap. Each destination keeps a
   distinct visual language: a graph/glyph propagation for ASCII, a circular
   aperture for 3D, and the original randomized diamond flood for 2D. */
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
  const asciiFieldRef = useRef<AsciiTransitionField | null>(null);
  const asciiAnimationStartRef = useRef<number | null>(null);

  /* Paint the startup cover before the browser can present the React tree.
     The CSS background is a pre-canvas fallback; this bitmap fill is what the
     normal DEEP clearing pass cuts its circular aperture through. Repeating it
     for the clearing commit prevents a transparent frame between phases. */
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

    if (!canvas || phase === "idle") {
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

    let { height, width } = fitCanvas(canvas, ctx);
    let animationFrame: number | null = null;
    let done = false;
    const startTime = performance.now();

    if (targetMode === "ascii" && phase === "covering") {
      asciiAnimationStartRef.current = startTime;
    }

    const getAsciiElapsed = (now: number) =>
      now - (asciiAnimationStartRef.current ?? startTime);

    ctx.fillStyle = COLOR_PALETTE_STR.background;

    const fillFullScreen = () => {
      ctx.fillStyle = COLOR_PALETTE_STR.background;
      ctx.fillRect(0, 0, width, height);
    };

    const getAsciiField = (force = false) => {
      const existing = asciiFieldRef.current;

      if (
        !force &&
        existing &&
        existing.width === width &&
        existing.height === height
      ) {
        return existing;
      }

      const seed = seedPoint ?? { x: width, y: height };
      const field = buildAsciiTransitionField(width, height, seed.x, seed.y);
      asciiFieldRef.current = field;
      return field;
    };

    let asciiField =
      targetMode === "ascii" ? getAsciiField(phase === "covering") : null;

    const handleResize = () => {
      ({ height, width } = fitCanvas(canvas, ctx));

      if (targetMode === "ascii") {
        asciiField = getAsciiField(true);
      }

      if (phase === "covered") {
        if (targetMode === "ascii" && asciiField) {
          renderAsciiTransitionFrame(
            ctx,
            asciiField,
            "covered",
            1,
            getAsciiElapsed(performance.now()),
          );
        } else {
          fillFullScreen();
        }
      }
    };

    window.addEventListener("resize", handleResize);

    if (phase === "covered") {
      if (targetMode === "ascii" && asciiField) {
        const renderCoveredField = (now: number) => {
          if (!asciiField) {
            return;
          }
          renderAsciiTransitionFrame(
            ctx,
            asciiField,
            "covered",
            1,
            getAsciiElapsed(now),
          );
          animationFrame = requestAnimationFrame(renderCoveredField);
        };
        animationFrame = requestAnimationFrame(renderCoveredField);
      } else {
        fillFullScreen();
      }

      return () => {
        window.removeEventListener("resize", handleResize);
        if (animationFrame !== null) {
          cancelAnimationFrame(animationFrame);
        }
      };
    }

    const isCovering = phase === "covering";
    const finish = () => {
      if (done) {
        return;
      }

      done = true;

      if (isCovering) {
        /* ASCII retains its generated glyph field across the React phase
           handoff. Other modes keep the solid coverage guarantee. */
        if (targetMode === "ascii" && asciiField) {
          renderAsciiTransitionFrame(
            ctx,
            asciiField,
            "covered",
            1,
            getAsciiElapsed(performance.now()),
          );
        } else {
          fillFullScreen();
        }
        notifyCovered();
      } else {
        ctx.clearRect(0, 0, width, height);
        notifyCleared();
      }
    };

    if (targetMode === "ascii" && asciiField) {
      const durationMs = isCovering
        ? ASCII_GRAPH_TRANSITION.coverDurationMs
        : ASCII_GRAPH_TRANSITION.clearDurationMs;

      const renderAsciiGraphTransition = (now: number) => {
        const progress = Math.min(
          1,
          Math.max(0, (now - startTime) / durationMs),
        );

        if (!asciiField) {
          finish();
          return;
        }

        renderAsciiTransitionFrame(
          ctx,
          asciiField,
          isCovering ? "covering" : "clearing",
          progress,
          getAsciiElapsed(now),
        );

        if (progress >= 1) {
          finish();
          return;
        }

        animationFrame = requestAnimationFrame(renderAsciiGraphTransition);
      };

      animationFrame = requestAnimationFrame(renderAsciiGraphTransition);
    } else if (targetMode === "3d") {
      const seed = seedPoint ?? { x: width, y: height };
      const durationMs = 720;

      const renderDestinationTransition = (now: number) => {
        const progress = Math.min(
          1,
          Math.max(0, (now - startTime) / durationMs),
        );
        const revealProgress = easeOutCubic(progress);

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = COLOR_PALETTE_STR.background;

        const maxRadius = Math.max(
          Math.hypot(seed.x, seed.y),
          Math.hypot(width - seed.x, seed.y),
          Math.hypot(seed.x, height - seed.y),
          Math.hypot(width - seed.x, height - seed.y),
        );
        const radius = maxRadius * revealProgress;

        if (isCovering) {
          ctx.beginPath();
          ctx.arc(seed.x, seed.y, radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          fillFullScreen();
          ctx.save();
          ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.arc(seed.x, seed.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (progress >= 1) {
          finish();
          return;
        }

        animationFrame = requestAnimationFrame(renderDestinationTransition);
      };

      animationFrame = requestAnimationFrame(renderDestinationTransition);
    } else {
      const seed = seedPoint ?? { x: width, y: height };
      const tiles = buildDiamondField(width, height, seed.x, seed.y);
      const { overdraw, popMs, tileHalfDiagonalPx } = DIAMOND_TRANSITION;
      const totalMs =
        DIAMOND_TRANSITION.growMs +
        popMs +
        (isCovering
          ? DIAMOND_TRANSITION.swapBufferMs
          : DIAMOND_TRANSITION.clearDoneBufferMs);

      const renderTiles = (now: number) => {
        const elapsed = now - startTime;

        if (elapsed >= totalMs) {
          finish();
          return;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = COLOR_PALETTE_STR.background;
        ctx.beginPath();

        for (const tile of tiles) {
          const popProgress = Math.min(
            1,
            Math.max(0, (elapsed - tile.startMs) / popMs),
          );
          /* Cover pops tiles in; clear starts from full cover and pops them
             back out, so untouched tiles still draw at full size. */
          const scale = isCovering
            ? easeOutCubic(popProgress)
            : 1 - easeInCubic(popProgress);

          if (scale <= 0) {
            continue;
          }

          traceDiamond(ctx, tile, tileHalfDiagonalPx * overdraw * scale);
        }

        ctx.fill();
        animationFrame = requestAnimationFrame(renderTiles);
      };

      animationFrame = requestAnimationFrame(renderTiles);
    }

    return () => {
      window.removeEventListener("resize", handleResize);

      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
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
