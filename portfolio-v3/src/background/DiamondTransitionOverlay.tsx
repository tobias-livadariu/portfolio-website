import { useEffect, useRef } from "react";
import { COLOR_PALETTE_STR } from "../theme/colors";
import { getResponsiveAsciiGlyphSize } from "../utility/ascii-glyph-size";
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

/* Full-screen canvas that hides the background swap. "covering" grows a
   randomized diamond flood out of the toggle switch, "covered" holds a solid
   fill while the target scene loads, and "clearing" runs a fresh flood from
   the same seed in reverse to reveal the new background. */
export default function DiamondTransitionOverlay() {
  const { notifyCleared, notifyCovered, phase, seedPoint, targetMode } =
    useBackgroundMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    ctx.fillStyle = COLOR_PALETTE_STR.background;

    const fillFullScreen = () => {
      ctx.fillStyle = COLOR_PALETTE_STR.background;
      ctx.fillRect(0, 0, width, height);
    };

    const handleResize = () => {
      ({ height, width } = fitCanvas(canvas, ctx));

      if (phase === "covered") {
        fillFullScreen();
      }
    };

    window.addEventListener("resize", handleResize);

    if (phase === "covered") {
      fillFullScreen();

      return () => {
        window.removeEventListener("resize", handleResize);
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

    const startTime = performance.now();

    if (prefersReducedMotion()) {
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
    } else if (targetMode !== "2d") {
      const seed = seedPoint ?? { x: width, y: height };
      const durationMs = 720;
      const glyphs = ["#", "@", "%", "+", "=", ":"];

      const renderDestinationTransition = (now: number) => {
        const progress = Math.min(
          1,
          Math.max(0, (now - startTime) / durationMs),
        );
        const revealProgress = easeOutCubic(progress);

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = COLOR_PALETTE_STR.background;

        if (targetMode === "3d") {
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
        } else {
          const glyphSize = getResponsiveAsciiGlyphSize(width, {
            baseHeight: 22,
            baseWidth: 18,
          });
          const cellWidth = glyphSize.width;
          const cellHeight = glyphSize.height;
          const columns = Math.ceil(width / cellWidth);
          const rows = Math.ceil(height / cellHeight);
          const maxDistance = Math.hypot(width, height);
          ctx.font = `700 ${Math.max(1, 13 * glyphSize.scale)}px "Iosevka Term Web", monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
              const x = column * cellWidth;
              const y = row * cellHeight;
              const distance = Math.hypot(
                x + cellWidth / 2 - seed.x,
                y + cellHeight / 2 - seed.y,
              );
              const jitter = ((column * 17 + row * 29) % 11) / 55;
              const threshold = Math.min(1, distance / maxDistance + jitter);
              const isFilled = isCovering
                ? threshold <= revealProgress
                : threshold > revealProgress;

              if (isFilled) {
                ctx.fillStyle = COLOR_PALETTE_STR.background;
                ctx.fillRect(x, y, cellWidth + 1, cellHeight + 1);
              }

              if (Math.abs(threshold - revealProgress) < 0.035) {
                ctx.fillStyle = COLOR_PALETTE_STR.campfire;
                ctx.fillText(
                  glyphs[(column + row) % glyphs.length],
                  x + cellWidth / 2,
                  y + cellHeight / 2,
                );
              }
            }
          }
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
      ref={canvasRef}
    />
  );
}
