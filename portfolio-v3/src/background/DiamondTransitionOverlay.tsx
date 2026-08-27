import { useEffect, useRef } from "react";
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

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function fitCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
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
  const { notifyCleared, notifyCovered, phase, seedPoint, targetMode } =
    useBackgroundMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const asciiFieldRef = useRef<AsciiTransitionField | null>(null);

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
    const reducedMotion = prefersReducedMotion();
    const startTime = performance.now();

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
        if (targetMode === "ascii" && asciiField && !reducedMotion) {
          renderAsciiTransitionFrame(
            ctx,
            asciiField,
            "covered",
            1,
            performance.now() - startTime,
          );
        } else {
          fillFullScreen();
        }
      }
    };

    window.addEventListener("resize", handleResize);

    if (phase === "covered") {
      if (targetMode === "ascii" && asciiField && !reducedMotion) {
        const renderCoveredField = (now: number) => {
          if (!asciiField) {
            return;
          }
          renderAsciiTransitionFrame(
            ctx,
            asciiField,
            "covered",
            1,
            now - startTime,
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
        /* Absolute coverage guarantee regardless of easing or resizes. */
        fillFullScreen();
        notifyCovered();
      } else {
        ctx.clearRect(0, 0, width, height);
        notifyCleared();
      }
    };

    if (reducedMotion) {
      const fadeMs = DIAMOND_TRANSITION.reducedMotionFadeMs;

      const renderFade = (now: number) => {
        const progress = Math.min(1, (now - startTime) / fadeMs);

        ctx.clearRect(0, 0, width, height);
        ctx.globalAlpha = isCovering ? progress : 1 - progress;
        fillFullScreen();
        ctx.globalAlpha = 1;

        if (progress >= 1) {
          finish();
          return;
        }

        animationFrame = requestAnimationFrame(renderFade);
      };

      animationFrame = requestAnimationFrame(renderFade);
    } else if (targetMode === "ascii" && asciiField) {
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
          now - startTime,
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
      data-target-mode={targetMode}
      ref={canvasRef}
    />
  );
}
