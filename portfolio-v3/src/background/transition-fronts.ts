import { COLOR_PALETTE_STR } from "../theme/colors";
import {
  ASCII_GRAPH_TRANSITION,
  buildAsciiTransitionField,
  drawAsciiTransitionGraph,
  type AsciiTransitionFace,
  type AsciiTransitionField,
} from "./ascii-graph-transition";
import type { BackgroundMode, SeedPoint } from "./background-mode-core";
import {
  advanceCellCursor,
  createCellFront,
  type CellFront,
} from "./cell-front";
import {
  buildDiamondField,
  DIAMOND_TRANSITION,
  type DiamondTile,
} from "./diamond-lattice";

/* The three render-mode transitions.

   Every transition has the same three beats and never shows a blank screen:

   1. Cover. The outgoing scene keeps running and glides to rest while the
      front spreads across it. The front only dims what it passes.
   2. Hold. The resting, dimmed scene is kept as a still while the incoming
      scene starts underneath.
   3. Clear. The same front crosses again and erases the still, uncovering
      the incoming scene, which is already moving.

   Each destination keeps its own visual language: a glyph graph and a
   character-cell dissolve for ASCII, popping diamonds for 2D, and a blocky
   aperture ringed with stars for 3D. */

export const TRANSITION_SHADE = {
  /* How dark the front leaves the outgoing scene, as the opacity of the
     background colour laid over it. Enough to tell covered from uncovered
     at a glance; low enough that the resting scene stays readable. */
  alpha: 0.5,
} as const;

export const IRIS_TRANSITION = {
  // How long the aperture's shadow takes to sweep over the outgoing scene.
  coverDurationMs: 560,
  // How long the aperture takes to open onto the 3D scene.
  clearDurationMs: 860,
  /* The aperture is drawn in square blocks this many CSS pixels wide, so its
     edge is stepped like the scene's pixel art instead of a smooth curve. */
  blockSizePx: 8,
  /* How ragged the edge is, as a share of the aperture's full radius. 0 is a
     clean stepped circle. */
  edgeJitter: 0.045,
  /* Stars sparkle in a band just ahead of the edge. This is the band's
     depth, as a share of the full radius. */
  starBandProgress: 0.075,
  // Share of blocks in that band that light up as a star.
  starDensity: 0.14,
  starColors: [
    COLOR_PALETTE_STR.white,
    COLOR_PALETTE_STR.campfireAsh,
    COLOR_PALETTE_STR.mutedWhite,
    COLOR_PALETTE_STR.campfire,
    "#76cce6",
  ],
} as const;

const DIAMOND_EDGE = {
  // Outline that flashes on a diamond while it pops.
  color: COLOR_PALETTE_STR.campfireAshDark,
  alpha: 0.55,
  lineWidthPx: 1,
} as const;

export interface TransitionFront {
  width: number;
  height: number;
  coverDurationMs: number;
  clearDurationMs: number;
  /* Draws the cover beat at `progress` (0 to 1) onto a cleared canvas that
     sits over the live outgoing scene. At 1 the whole screen is dimmed by
     exactly `TRANSITION_SHADE.alpha`, matching the still that replaces it. */
  renderCover: (
    ctx: CanvasRenderingContext2D,
    progress: number,
    elapsedMs: number,
  ) => void;
  // True when the hold needs redrawing every frame (it has moving parts).
  animatesHold: boolean;
  // Draws whatever sits on top of the still during the hold.
  renderHold: (ctx: CanvasRenderingContext2D, elapsedMs: number) => void;
  /* Erases from the still everything the front has uncovered at `progress`.
     Only ever removes more, so the still is erased in place. */
  erase: (still: CanvasRenderingContext2D, progress: number) => void;
  // Draws whatever sits on top of the still during the clear beat.
  renderClear: (
    ctx: CanvasRenderingContext2D,
    progress: number,
    elapsedMs: number,
  ) => void;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

function easeInCubic(value: number) {
  return value ** 3;
}

/* Erases the cells the front reached since `cursor`. Each cell is erased
   half a pixel oversized: neighbouring cells otherwise leave a faint line of
   the old picture between them on displays with a fractional pixel ratio. */
function eraseArrivedCells(
  still: CanvasRenderingContext2D,
  cells: CellFront,
  cursor: number,
  progress: number,
) {
  const next = advanceCellCursor(cells, cursor, progress);

  if (next > cursor) {
    still.save();
    still.globalCompositeOperation = "destination-out";
    still.fillStyle = "#000000";

    for (let index = cursor; index < next; index += 1) {
      still.fillRect(
        cells.x[index] - 0.5,
        cells.y[index] - 0.5,
        cells.cellWidth + 1,
        cells.cellHeight + 1,
      );
    }

    still.restore();
  }

  return next;
}

/* ASCII: the glyph graph grows over the outgoing scene, then the scene
   dissolves into characters along the same wave. */

/* Adds one face, scaled about its centre, to the current path. Faces are
   always wound the same way, so overlapping faces fill as one shape instead
   of cancelling where they overlap. */
function traceFace(
  ctx: CanvasRenderingContext2D,
  field: AsciiTransitionField,
  face: AsciiTransitionFace,
  scale: number,
) {
  const a = field.nodes[face.a];
  let b = field.nodes[face.b];
  let c = field.nodes[face.c];

  if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0) {
    [b, c] = [c, b];
  }

  const centerX = (a.x + b.x + c.x) / 3;
  const centerY = (a.y + b.y + c.y) / 3;

  ctx.moveTo(
    centerX + (a.x - centerX) * scale,
    centerY + (a.y - centerY) * scale,
  );
  ctx.lineTo(
    centerX + (b.x - centerX) * scale,
    centerY + (b.y - centerY) * scale,
  );
  ctx.lineTo(
    centerX + (c.x - centerX) * scale,
    centerY + (c.y - centerY) * scale,
  );
  ctx.closePath();
}

/* When the wave reaches each dissolve cell: the arrival of the face the cell
   lies in. Returns one value per cell, row by row. */
function getFaceArrivalByCell(
  field: AsciiTransitionField,
  columns: number,
  rows: number,
  cellWidth: number,
  cellHeight: number,
) {
  const arrival = new Float32Array(columns * rows).fill(-1);

  for (const face of field.faces) {
    const a = field.nodes[face.a];
    const b = field.nodes[face.b];
    const c = field.nodes[face.c];
    const firstColumn = Math.max(
      0,
      Math.floor(Math.min(a.x, b.x, c.x) / cellWidth),
    );
    const lastColumn = Math.min(
      columns - 1,
      Math.floor(Math.max(a.x, b.x, c.x) / cellWidth),
    );
    const firstRow = Math.max(
      0,
      Math.floor(Math.min(a.y, b.y, c.y) / cellHeight),
    );
    const lastRow = Math.min(
      rows - 1,
      Math.floor(Math.max(a.y, b.y, c.y) / cellHeight),
    );

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const x = (column + 0.5) * cellWidth;
        const y = (row + 0.5) * cellHeight;
        const sideAB = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
        const sideBC = (c.x - b.x) * (y - b.y) - (c.y - b.y) * (x - b.x);
        const sideCA = (a.x - c.x) * (y - c.y) - (a.y - c.y) * (x - c.x);
        const isInside =
          (sideAB >= 0 && sideBC >= 0 && sideCA >= 0) ||
          (sideAB <= 0 && sideBC <= 0 && sideCA <= 0);

        if (isInside) {
          arrival[row * columns + column] = face.coverProgress;
        }
      }
    }
  }

  return arrival;
}

function createAsciiFront(
  width: number,
  height: number,
  seed: SeedPoint,
): TransitionFront {
  const tuning = ASCII_GRAPH_TRANSITION;
  const field = buildAsciiTransitionField(width, height, seed.x, seed.y);
  const cellWidth = tuning.dissolveCellWidthPx * field.responsiveScale;
  const cellHeight = tuning.dissolveCellHeightPx * field.responsiveScale;
  const columns = Math.max(1, Math.ceil(width / cellWidth));
  const rows = Math.max(1, Math.ceil(height / cellHeight));
  const faceArrival = getFaceArrivalByCell(
    field,
    columns,
    rows,
    cellWidth,
    cellHeight,
  );
  const cells = createCellFront(
    width,
    height,
    cellWidth,
    cellHeight,
    (centerX, centerY, jitter, column, row) => {
      let waveArrival = faceArrival[row * columns + column];

      if (waveArrival < 0) {
        /* A cell outside every face (only possible at the very edge of the
           screen) follows its nearest graph node. */
        let nearestDistance = Number.POSITIVE_INFINITY;

        for (const node of field.nodes) {
          const distance = Math.hypot(node.x - centerX, node.y - centerY);

          if (distance < nearestDistance) {
            nearestDistance = distance;
            waveArrival = node.startProgress;
          }
        }
      }

      /* Cells of one face scatter over `dissolveProgressSpan` instead of
         leaving together, which turns each face's exit into a dissolve. */
      return (
        waveArrival * (1 - tuning.dissolveProgressSpan) +
        jitter * tuning.dissolveProgressSpan
      );
    },
  );
  const glyphs = tuning.glyphs;
  const dissolveFont = `700 ${cellHeight * 0.92}px "Iosevka Term Web", monospace`;
  let cursor = 0;

  return {
    width,
    height,
    coverDurationMs: tuning.coverDurationMs,
    clearDurationMs: tuning.clearDurationMs,
    renderCover(ctx, progress, elapsedMs) {
      /* Stretched slightly so the last faces finish closing exactly at 1. */
      const faceProgress = progress * (1 + tuning.facePopProgressSpan);

      ctx.beginPath();
      for (const face of field.faces) {
        const localProgress = clamp01(
          (faceProgress - face.coverProgress) / tuning.facePopProgressSpan,
        );

        if (localProgress > 0) {
          traceFace(
            ctx,
            field,
            face,
            easeOutCubic(localProgress) * tuning.faceOverdrawScale,
          );
        }
      }
      ctx.globalAlpha = TRANSITION_SHADE.alpha;
      ctx.fillStyle = COLOR_PALETTE_STR.background;
      ctx.fill();
      ctx.globalAlpha = 1;

      drawAsciiTransitionGraph(
        ctx,
        field,
        progress,
        elapsedMs,
        false,
        tuning.glyphBackingAlpha,
      );
    },
    animatesHold: true,
    renderHold(ctx, elapsedMs) {
      drawAsciiTransitionGraph(
        ctx,
        field,
        1,
        elapsedMs,
        false,
        tuning.glyphBackingAlpha,
      );
    },
    erase(still, progress) {
      cursor = eraseArrivedCells(still, cells, cursor, progress);
    },
    renderClear(ctx, progress, elapsedMs) {
      /* Each freshly dissolved cell leaves one glyph behind, which thins
         from the densest character to the sparsest as it fades. */
      const life = tuning.dissolveGlyphLifeProgress;

      ctx.font = dissolveFont;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let index = cursor - 1; index >= 0; index -= 1) {
        const age = (progress - cells.arrival[index]) / life;

        if (age >= 1) {
          break;
        }

        const variation = cells.variation[index];

        if (variation >= tuning.dissolveGlyphDensity) {
          continue;
        }

        const glyphIndex = Math.round((1 - age) * (glyphs.length - 1));
        const color =
          tuning.colors[
            Math.floor(
              (variation / tuning.dissolveGlyphDensity) * tuning.colors.length,
            ) % tuning.colors.length
          ].color;

        ctx.globalAlpha = (1 - age) * 0.9;
        ctx.fillStyle = color;
        ctx.fillText(
          glyphs[glyphIndex],
          cells.x[index] + cellWidth * 0.5,
          cells.y[index] + cellHeight * 0.5,
        );
      }

      ctx.globalAlpha = 1;
      drawAsciiTransitionGraph(ctx, field, progress, elapsedMs, true);
    },
  };
}

/* 2D: the randomized diamond flood. Diamonds pop in as shade, then each one
   shrinks away to uncover the 2D scene around it. */

/* Adds a diamond to the current path. `reverse` winds it the other way, so
   a reversed diamond inside a normal one leaves a hole. */
function traceDiamond(
  ctx: CanvasRenderingContext2D,
  tile: DiamondTile,
  halfDiagonal: number,
  reverse = false,
) {
  ctx.moveTo(tile.cx, tile.cy - halfDiagonal);

  if (reverse) {
    ctx.lineTo(tile.cx - halfDiagonal, tile.cy);
    ctx.lineTo(tile.cx, tile.cy + halfDiagonal);
    ctx.lineTo(tile.cx + halfDiagonal, tile.cy);
  } else {
    ctx.lineTo(tile.cx + halfDiagonal, tile.cy);
    ctx.lineTo(tile.cx, tile.cy + halfDiagonal);
    ctx.lineTo(tile.cx - halfDiagonal, tile.cy);
  }

  ctx.closePath();
}

function createDiamondFront(
  width: number,
  height: number,
  seed: SeedPoint,
): TransitionFront {
  const tuning = DIAMOND_TRANSITION;
  const tiles = buildDiamondField(width, height, seed.x, seed.y);
  const fullHalfDiagonal = tuning.tileHalfDiagonalPx * tuning.overdraw;
  const coverGrowMs = tuning.growMs * tuning.coverGrowScale;
  const coverDurationMs = coverGrowMs + tuning.popMs + tuning.swapBufferMs;
  const clearDurationMs =
    tuning.growMs + tuning.popMs + tuning.clearDoneBufferMs;
  const isErased = new Uint8Array(tiles.length);

  const strokePoppingEdges = (
    ctx: CanvasRenderingContext2D,
    getEdge: (
      tile: DiamondTile,
    ) => { alpha: number; halfDiagonal: number } | null,
  ) => {
    ctx.strokeStyle = DIAMOND_EDGE.color;
    ctx.lineWidth = DIAMOND_EDGE.lineWidthPx;

    for (const tile of tiles) {
      const edge = getEdge(tile);

      if (!edge || edge.alpha <= 0 || edge.halfDiagonal <= 0) {
        continue;
      }

      ctx.globalAlpha = edge.alpha;
      ctx.beginPath();
      traceDiamond(ctx, tile, edge.halfDiagonal);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  };

  return {
    width,
    height,
    coverDurationMs,
    clearDurationMs,
    renderCover(ctx, progress) {
      const elapsed = progress * coverDurationMs;
      const getPop = (tile: DiamondTile) =>
        /* At 1 every diamond is fully grown, whatever the timing buffer. */
        progress >= 1
          ? 1
          : clamp01(
              (elapsed - tile.startMs * tuning.coverGrowScale) / tuning.popMs,
            );

      ctx.beginPath();
      for (const tile of tiles) {
        const pop = getPop(tile);

        if (pop > 0) {
          traceDiamond(ctx, tile, fullHalfDiagonal * easeOutCubic(pop));
        }
      }
      ctx.globalAlpha = TRANSITION_SHADE.alpha;
      ctx.fillStyle = COLOR_PALETTE_STR.background;
      ctx.fill();
      ctx.globalAlpha = 1;

      strokePoppingEdges(ctx, (tile) => {
        const pop = getPop(tile);

        return pop > 0 && pop < 1
          ? {
              alpha: DIAMOND_EDGE.alpha * (1 - pop),
              halfDiagonal: fullHalfDiagonal * easeOutCubic(pop),
            }
          : null;
      });
    },
    animatesHold: false,
    renderHold() {},
    erase(still, progress) {
      const elapsed = progress * clearDurationMs;

      still.save();
      still.globalCompositeOperation = "destination-out";
      still.fillStyle = "#000000";
      still.beginPath();

      tiles.forEach((tile, index) => {
        if (isErased[index]) {
          return;
        }

        const pop =
          progress >= 1 ? 1 : clamp01((elapsed - tile.startMs) / tuning.popMs);

        if (pop <= 0) {
          return;
        }

        /* The old picture survives in a diamond that shrinks to nothing, so
           everything between the tile's edge and that diamond is erased. */
        traceDiamond(still, tile, fullHalfDiagonal);

        if (pop >= 1) {
          isErased[index] = 1;
        } else {
          traceDiamond(
            still,
            tile,
            fullHalfDiagonal * (1 - easeInCubic(pop)),
            true,
          );
        }
      });

      still.fill();
      still.restore();
    },
    renderClear(ctx, progress) {
      const elapsed = progress * clearDurationMs;

      strokePoppingEdges(ctx, (tile) => {
        const pop = clamp01((elapsed - tile.startMs) / tuning.popMs);

        return pop > 0 && pop < 1
          ? {
              alpha: DIAMOND_EDGE.alpha * (1 - pop),
              halfDiagonal: fullHalfDiagonal * (1 - easeInCubic(pop)),
            }
          : null;
      });
    },
  };
}

/* 3D: a round aperture with a stepped, slightly ragged edge and a ring of
   stars sparkling just ahead of it. */

function createIrisFront(
  width: number,
  height: number,
  seed: SeedPoint,
): TransitionFront {
  const tuning = IRIS_TRANSITION;
  const maxRadius = Math.max(
    Math.hypot(seed.x, seed.y),
    Math.hypot(width - seed.x, seed.y),
    Math.hypot(seed.x, height - seed.y),
    Math.hypot(width - seed.x, height - seed.y),
    1,
  );
  const cells = createCellFront(
    width,
    height,
    tuning.blockSizePx,
    tuning.blockSizePx,
    (centerX, centerY, jitter) =>
      (Math.hypot(centerX - seed.x, centerY - seed.y) / maxRadius) *
        (1 - tuning.edgeJitter) +
      jitter * tuning.edgeJitter,
  );
  let shade: CanvasRenderingContext2D | null = null;
  let coverCursor = 0;
  let clearCursor = 0;

  /* Stars in the band the edge is about to cross. They brighten as the edge
     approaches and are gone the moment it passes. */
  const drawStarRing = (
    ctx: CanvasRenderingContext2D,
    cursor: number,
    edgeProgress: number,
  ) => {
    const bandEnd = edgeProgress + tuning.starBandProgress;

    for (
      let index = cursor;
      index < cells.count && cells.arrival[index] <= bandEnd;
      index += 1
    ) {
      const variation = cells.variation[index];

      if (variation >= tuning.starDensity) {
        continue;
      }

      const share = variation / tuning.starDensity;
      const size = tuning.blockSizePx * (0.3 + 0.45 * share);
      const inset = (tuning.blockSizePx - size) * 0.5;

      ctx.globalAlpha =
        1 - (cells.arrival[index] - edgeProgress) / tuning.starBandProgress;
      ctx.fillStyle =
        tuning.starColors[
          Math.floor(share * tuning.starColors.length) %
            tuning.starColors.length
        ];
      ctx.fillRect(cells.x[index] + inset, cells.y[index] + inset, size, size);
    }

    ctx.globalAlpha = 1;
  };

  return {
    width,
    height,
    coverDurationMs: tuning.coverDurationMs,
    clearDurationMs: tuning.clearDurationMs,
    renderCover(ctx, progress) {
      const edgeProgress = easeOutCubic(progress);

      /* The shadow is kept on its own canvas and only grows, so each frame
         adds just the blocks the edge has newly passed. */
      if (!shade) {
        const canvas = document.createElement("canvas");

        canvas.width = ctx.canvas.width;
        canvas.height = ctx.canvas.height;
        shade = canvas.getContext("2d");
        shade?.setTransform(ctx.getTransform());
      }

      if (!shade) {
        return;
      }

      const next = advanceCellCursor(cells, coverCursor, edgeProgress);

      shade.fillStyle = COLOR_PALETTE_STR.background;
      for (let index = coverCursor; index < next; index += 1) {
        shade.fillRect(
          cells.x[index] - 0.5,
          cells.y[index] - 0.5,
          cells.cellWidth + 1,
          cells.cellHeight + 1,
        );
      }
      coverCursor = next;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = TRANSITION_SHADE.alpha;
      ctx.drawImage(shade.canvas, 0, 0);
      ctx.restore();

      drawStarRing(ctx, coverCursor, edgeProgress);
    },
    animatesHold: false,
    renderHold() {},
    erase(still, progress) {
      clearCursor = eraseArrivedCells(
        still,
        cells,
        clearCursor,
        easeOutCubic(progress),
      );
    },
    renderClear(ctx, progress) {
      drawStarRing(ctx, clearCursor, easeOutCubic(progress));
    },
  };
}

export function createTransitionFront(
  targetMode: BackgroundMode,
  width: number,
  height: number,
  seed: SeedPoint,
): TransitionFront {
  if (targetMode === "ascii") {
    return createAsciiFront(width, height, seed);
  }

  if (targetMode === "3d") {
    return createIrisFront(width, height, seed);
  }

  return createDiamondFront(width, height, seed);
}
