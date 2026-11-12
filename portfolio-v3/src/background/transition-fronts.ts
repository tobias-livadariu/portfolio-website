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
  buildDiamondField,
  DIAMOND_TRANSITION,
  type DiamondTile,
} from "./diamond-lattice";

/* The three render-mode transitions.

   Every transition has the same three beats and never shows a blank screen:

   1. Cover. The outgoing scene keeps running and glides to rest while the
      front spreads across it. Behind the front the scene is "stopped": it
      dims and most of its colour drains away.
   2. Hold. The resting, stopped scene is kept as a still while the incoming
      scene starts underneath.
   3. Clear. The same front crosses again and erases the still, uncovering
      the incoming scene in full colour, already moving.

   The three share one visual language, taken from the site itself: hard
   stair-stepped edges like the planets and the menu lettering, square dots
   like the stars and the menu's dotted rules, and monospace characters.
   Each has a single clean leading edge that shows exactly where the change
   is, and none scatters loose blocks along it. On top of that each
   destination has its own geometry: a glyph network whose triangles fill
   with characters and break away for ASCII, a diamond lattice that
   subdivides the plane for 2D, and a heavy cross-hatched ring with layers
   of counter-rotating pixel planets on both sides of it for 3D. */

/* How a stopped scene looks: a quieter version of itself, not a different
   picture.

   Two layers. The tint swaps part of every pixel's hue and saturation for a
   near-neutral grey while keeping its brightness, which drains colour
   without softening any shape. The veil then pulls the picture toward the
   background colour. Because the sky already is that colour, the sky does
   not change at all: only the planets, stars and menu recede into it. That
   keeps the change small and local, so nothing flashes at the viewer, and it
   suits all three scenes, including ASCII's already muted one. */
export const TRANSITION_GRADE = {
  /* The colour a stopped scene's hues are drained toward. Nearly neutral,
     with a trace of the background's navy so it sits inside the palette. */
  tintColor: "#868b98",
  /* How much colour is drained. 0 leaves the scene's colours alone; 1 makes
     it fully monochrome. */
  tintAlpha: 0.55,
  /* Colour and strength of the dimming laid over the drained scene. Using
     the background colour leaves empty sky untouched. */
  veilColor: COLOR_PALETTE_STR.background,
  veilAlpha: 0.5,
} as const;

/* True when the browser can blend the tint layer with the live scene
   beneath it. Where it cannot, a stopped scene is only dimmed. */
export const SUPPORTS_TRANSITION_TINT =
  typeof CSS !== "undefined" && CSS.supports("mix-blend-mode", "color");

const IRIS_COLORS = {
  ash: COLOR_PALETTE_STR.campfireAsh,
  ashDark: COLOR_PALETTE_STR.campfireAshDark,
  campfire: COLOR_PALETTE_STR.campfire,
  dark: COLOR_PALETTE_STR.campfireDark,
} as const;

export const IRIS_TRANSITION = {
  /* How long the aperture takes to sweep over the outgoing scene. Close to
     the 2D cover, so the three transitions keep the same tempo. */
  coverDurationMs: 560,
  // How long the aperture takes to open onto the 3D scene.
  clearDurationMs: 780,
  /* Everything here is drawn on a grid of squares this many CSS px wide,
     the size of a pixel in the planet sprites. The aperture's edge is a
     staircase of them instead of a smooth curve. */
  stepPx: 4,
  /* The ring that marks the aperture's edge. It is centred on the edge and
     built from rows of squares one step thick, listed from the inside
     outward. It runs dark, orange, ash at its middle, then back out to
     dark, the way a sprite is shaded, so it reads as one heavy lit band.
     A row with a `dither` colour alternates the two colours square by
     square: the checkered rows are what give the band its cross-hatched,
     woven texture. More rows make a heavier ring without larger pixels. */
  ring: {
    alpha: 0.96,
    rows: [
      { color: IRIS_COLORS.dark },
      { color: IRIS_COLORS.dark, dither: IRIS_COLORS.campfire },
      { color: IRIS_COLORS.campfire },
      { color: IRIS_COLORS.campfire, dither: IRIS_COLORS.ashDark },
      { color: IRIS_COLORS.ashDark },
      { color: IRIS_COLORS.ash },
      { color: IRIS_COLORS.ash },
      { color: IRIS_COLORS.ashDark },
      { color: IRIS_COLORS.campfire, dither: IRIS_COLORS.ashDark },
      { color: IRIS_COLORS.campfire },
      { color: IRIS_COLORS.dark, dither: IRIS_COLORS.campfire },
      { color: IRIS_COLORS.dark },
    ],
  },
  /* Thin rings one step thick that echo the main ring on both sides, like
     ripples. `offsetSteps` is measured from the aperture's edge: positive
     is outside it, negative inside. A `dither` ripple is checkered. */
  ripples: [
    { offsetSteps: 9, color: IRIS_COLORS.campfire, alpha: 0.85, dither: false },
    { offsetSteps: 12, color: IRIS_COLORS.dark, alpha: 0.8, dither: true },
    {
      offsetSteps: -10,
      color: IRIS_COLORS.campfire,
      alpha: 0.85,
      dither: false,
    },
    { offsetSteps: -13, color: IRIS_COLORS.dark, alpha: 0.8, dither: true },
  ],
  /* Layers of pixel planets circle the control on both sides of the ring
     and travel with it. From the outside in: small planets turning
     clockwise, larger ones turning counter-clockwise, the ring, larger ones
     turning counter-clockwise, small ones turning clockwise. Each layer
     rides a dotted orbit, like the menu's dotted rules bent round.

     `leadPx` is the layer's distance from the aperture's edge (positive is
     outside, negative inside) and `leadShare` adds a share of the current
     radius, so the layers spread apart as the aperture grows. `radiusSteps`
     is a planet's radius in squares, `count` is how many share the orbit,
     and `turnsPerSecond` is how fast and which way they circle (positive
     is clockwise on screen). */
  planetLayers: [
    {
      leadPx: 150,
      leadShare: 0.16,
      radiusSteps: 1,
      count: 14,
      turnsPerSecond: 0.2,
      orbitAlpha: 0.4,
      orbitColor: IRIS_COLORS.ashDark,
    },
    {
      leadPx: 92,
      leadShare: 0.07,
      radiusSteps: 3,
      count: 8,
      turnsPerSecond: -0.13,
      orbitAlpha: 0.7,
      orbitColor: IRIS_COLORS.ash,
    },
    {
      leadPx: -96,
      leadShare: -0.05,
      radiusSteps: 3,
      count: 7,
      turnsPerSecond: -0.13,
      orbitAlpha: 0.7,
      orbitColor: IRIS_COLORS.ash,
    },
    {
      leadPx: -154,
      leadShare: -0.11,
      radiusSteps: 1,
      count: 11,
      turnsPerSecond: 0.2,
      orbitAlpha: 0.4,
      orbitColor: IRIS_COLORS.ashDark,
    },
  ],
  /* Smallest gap between neighbouring dots on an orbit, in CSS px. Close to
     the pitch of the menu's dotted rules, so an orbit reads as a rule and
     not as loose stars. */
  dotSpacingPx: 10,
  /* A layer only appears once its orbit is long enough to give each planet
     this many planet-widths of room, and then fades in over this many CSS
     px of further growth. */
  planetSpacingInSizes: 2.5,
  layerFadeInPx: 48,
  // The one square nearest the light on every planet big enough to have one.
  planetHighlightColor: IRIS_COLORS.ash,
  // Lit-side and shadow-side colour of each kind of planet.
  planetColors: [
    ["#5fa9b8", "#2f6676"],
    [IRIS_COLORS.campfire, IRIS_COLORS.dark],
    [IRIS_COLORS.ash, IRIS_COLORS.ashDark],
    ["#79bd9a", "#3f7a5c"],
    ["#b05a54", "#6e2f2c"],
    ["#a8a8b3", "#5a6a85"],
  ],
} as const;

export const STARTUP_REVEAL = {
  /* The cover that opens when the site first loads: a plain round aperture,
     with no rings. */
  durationMs: 720,
} as const;

const DIAMOND_EDGE = {
  // Stair-stepped outline that flashes on a diamond while it pops.
  color: COLOR_PALETTE_STR.campfireAshDark,
  alpha: 0.6,
  // One stair wide, so the outline sits on the same grid as the stairs.
  lineWidthPx: 4,
  /* Square dots mark the lattice's corners around a popping diamond, so the
     front of the flood is drawn as a dotted grid. */
  dotColor: COLOR_PALETTE_STR.campfireAsh,
  dotAlpha: 0.75,
} as const;

export interface TransitionFront {
  width: number;
  height: number;
  coverDurationMs: number;
  clearDurationMs: number;
  /* Fills everything the front has covered at `progress` (0 to 1), using the
     context's current fill style and opacity. The context must be clear. It
     is called once per layer of the grade, and at 1 it fills the screen. */
  fillCovered: (ctx: CanvasRenderingContext2D, progress: number) => void;
  // Draws the front's own marks for the cover beat, over the live scene.
  renderCoverDetail: (
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

function easeInQuad(value: number) {
  return value * value;
}

/* A CSS-style cubic-bezier easing curve as a function of time (0 to 1). */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const sample = (a: number, b: number, t: number) =>
    3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;

  return (time: number) => {
    const target = clamp01(time);
    let low = 0;
    let high = 1;

    for (let step = 0; step < 24; step += 1) {
      const middle = (low + high) / 2;

      if (sample(x1, x2, middle) < target) {
        low = middle;
      } else {
        high = middle;
      }
    }

    return sample(y1, y2, (low + high) / 2);
  };
}

/* A gentle ease: a prompt start and a soft landing, with a peak speed under
   twice the average. A sharper curve sends the aperture's edge across the
   screen faster than the eye can follow, so the change looks like a flash
   instead of a front leaving the control, and the orbits ahead of the edge
   have no time to announce it. */
const easeStandard = cubicBezier(0.35, 0.2, 0.45, 1);

/* ASCII: the glyph graph grows over the outgoing scene. Each triangle of
   the graph fills with characters once its three corners are joined, and
   the filled triangles then break away like shards of glass. */

/* Adds one face, scaled about its centre, to the current path. Faces are
   always wound the same way, so overlapping faces fill as one shape instead
   of cancelling where they overlap. `reverse` winds a face the other way,
   so a reversed face inside a normal one leaves a hole. */
function traceFace(
  ctx: CanvasRenderingContext2D,
  field: AsciiTransitionField,
  face: AsciiTransitionFace,
  scale: number,
  reverse = false,
) {
  const a = field.nodes[face.a];
  let b = field.nodes[face.b];
  let c = field.nodes[face.c];
  const isClockwise = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0;

  if (isClockwise !== reverse) {
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

// One character of a triangle's fill.
interface FaceFillCell {
  // Strength of the whole triangle this character belongs to, 0 to 1.
  brightness: number;
  color: string;
  face: number;
  // Glyph currently drawn, as an index into the glyph ramp; -1 is none.
  shown: number;
  // When this character starts climbing, in ms from the transition's start.
  startMs: number;
  // The glyph it climbs to.
  target: number;
  x: number;
  y: number;
}

/* Lays a character grid over the screen and keeps the characters that sit
   inside a triangle, clear of its edges. */
function createFaceFillCells(field: AsciiTransitionField) {
  const tuning = ASCII_GRAPH_TRANSITION;
  const fill = tuning.faceFill;
  const fontPx = fill.fontPx * field.responsiveScale;
  const cellWidth = fontPx * fill.cellWidthEm;
  const cellHeight = fontPx * fill.cellHeightEm;
  const inset = fill.insetPx * field.responsiveScale;
  const lastGlyph = tuning.glyphs.length - 1;
  /* A triangle's fill begins the moment the triangle has finished closing. */
  const closeScale = tuning.coverDurationMs / (1 + tuning.facePopProgressSpan);
  const cells: FaceFillCell[] = [];

  field.faces.forEach((face, faceIndex) => {
    const a = field.nodes[face.a];
    const b = field.nodes[face.b];
    const c = field.nodes[face.c];
    const edges = [
      [a, b],
      [b, c],
      [c, a],
    ] as const;
    const winding =
      (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0 ? -1 : 1;
    const closedMs =
      (face.coverProgress + tuning.facePopProgressSpan) * closeScale;
    const brightness =
      fill.minShardBrightness + Math.random() * (1 - fill.minShardBrightness);
    const color = fill.colors[Math.floor(Math.random() * fill.colors.length)];
    const firstColumn = Math.floor(Math.min(a.x, b.x, c.x) / cellWidth);
    const lastColumn = Math.floor(Math.max(a.x, b.x, c.x) / cellWidth);
    const firstRow = Math.floor(Math.min(a.y, b.y, c.y) / cellHeight);
    const lastRow = Math.floor(Math.max(a.y, b.y, c.y) / cellHeight);

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const x = (column + 0.5) * cellWidth;
        const y = (row + 0.5) * cellHeight;

        if (x < 0 || y < 0 || x > field.width || y > field.height) {
          continue;
        }

        /* Distance from each edge, positive on the inside. */
        const isClearOfEdges = edges.every(([from, to]) => {
          const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
          const distance =
            (winding *
              ((to.x - from.x) * (y - from.y) -
                (to.y - from.y) * (x - from.x))) /
            length;

          return distance >= inset;
        });

        if (!isClearOfEdges) {
          continue;
        }

        const density = Math.random();

        cells.push({
          brightness,
          color,
          face: faceIndex,
          shown: -1,
          startMs: closedMs + Math.random() * fill.staggerMs,
          // Mostly dense glyphs, with a few lighter ones for texture.
          target: lastGlyph - Math.floor(density * density * 5),
          x,
          y,
        });
      }
    }
  });

  return { cellHeight, cellWidth, cells, fontPx };
}

function createAsciiFront(
  width: number,
  height: number,
  seed: SeedPoint,
): TransitionFront {
  const tuning = ASCII_GRAPH_TRANSITION;
  const fill = tuning.faceFill;
  const field = buildAsciiTransitionField(width, height, seed.x, seed.y);
  const glyphs = tuning.glyphs;
  const { cellHeight, cellWidth, cells, fontPx } = createFaceFillCells(field);
  /* Stretches progress slightly so the last faces finish exactly at 1. */
  const getFaceProgress = (progress: number) =>
    progress * (1 + tuning.facePopProgressSpan);
  /* How far a face is through closing (cover) or breaking away (clear). */
  const getFacePop = (face: AsciiTransitionFace, progress: number) =>
    clamp01(
      (getFaceProgress(progress) - face.coverProgress) /
        tuning.facePopProgressSpan,
    );
  /* The clear runs the same wave on its own clock. Nearly every triangle is
     reached well before the wave's nominal end, so the clear is stretched
     to finish exactly when the last triangle has broken away, with no
     empty tail, and each triangle takes longer to break than it took to
     close, so the eye can follow a shard leaving. */
  const lastFaceArrival = field.faces.reduce(
    (latest, face) => Math.max(latest, face.coverProgress),
    0,
  );
  /* It also starts at the first triangle's arrival, so the first shard
     begins to break on the clear's first frame. */
  const firstFaceArrival = field.faces.reduce(
    (earliest, face) => Math.min(earliest, face.coverProgress),
    lastFaceArrival,
  );
  const clearPopSpan =
    tuning.clearFacePopProgressSpan *
    Math.min(
      1,
      field.responsiveScale ** tuning.clearFacePopNarrowScreenExponent,
    );
  const getClearWave = (progress: number) =>
    firstFaceArrival +
    progress * (lastFaceArrival + clearPopSpan - firstFaceArrival);
  const getBreakPop = (face: AsciiTransitionFace, progress: number) =>
    progress >= 1
      ? 1
      : clamp01((getClearWave(progress) - face.coverProgress) / clearPopSpan);
  /* How much of a breaking triangle is still there, as a scale about its
     centre. It holds near full size while cracks open around it, then
     shrinks away. A piece too small to read as a shard is dropped. */
  const getShardScale = (pop: number) => {
    const scale = 1 - easeInCubic(pop);

    return scale > tuning.smallestShardScale ? scale : 0;
  };
  /* Adds to the current path everything a breaking triangle has lost: the
     whole triangle with the surviving shard left as a hole. */
  const traceBroken = (
    ctx: CanvasRenderingContext2D,
    face: AsciiTransitionFace,
    pop: number,
  ) => {
    const shardScale = pop >= 1 ? 0 : getShardScale(pop);

    traceFace(ctx, field, face, tuning.faceOverdrawScale);

    if (shardScale > 0) {
      traceFace(ctx, field, face, shardScale, true);
    }
  };
  const isBreaking = new Uint8Array(field.faces.length);
  const isBroken = new Uint8Array(field.faces.length);
  /* The characters live on their own canvas. Only a character whose glyph
     has just changed is redrawn, so a screen full of them stays cheap. */
  let fillLayer: CanvasRenderingContext2D | null = null;
  let pendingCells = cells.length;

  const drawFill = (ctx: CanvasRenderingContext2D, elapsedMs: number) => {
    if (!fillLayer) {
      const canvas = document.createElement("canvas");

      canvas.width = ctx.canvas.width;
      canvas.height = ctx.canvas.height;
      fillLayer = canvas.getContext("2d");

      if (fillLayer) {
        fillLayer.setTransform(ctx.getTransform());
        fillLayer.font = `700 ${fontPx}px "Iosevka Term Web", monospace`;
        fillLayer.textAlign = "center";
        fillLayer.textBaseline = "middle";
      }
    }

    if (!fillLayer) {
      return;
    }

    if (pendingCells > 0) {
      for (const cell of cells) {
        if (cell.shown >= cell.target || isBreaking[cell.face]) {
          continue;
        }

        const ramp = (elapsedMs - cell.startMs) / fill.rampMs;

        if (ramp <= 0) {
          continue;
        }

        const glyphIndex = Math.min(
          cell.target,
          Math.floor(ramp * (cell.target + 1)),
        );

        if (glyphIndex === cell.shown) {
          continue;
        }

        cell.shown = glyphIndex;
        if (glyphIndex >= cell.target) {
          pendingCells -= 1;
        }

        fillLayer.clearRect(
          cell.x - cellWidth * 0.5,
          cell.y - cellHeight * 0.5,
          cellWidth,
          cellHeight,
        );
        fillLayer.globalAlpha =
          cell.brightness *
          (fill.minAlpha +
            (fill.maxAlpha - fill.minAlpha) *
              (glyphIndex / (glyphs.length - 1)));
        fillLayer.fillStyle = cell.color;
        fillLayer.fillText(glyphs[glyphIndex], cell.x, cell.y);
      }
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fillLayer.canvas, 0, 0);
    ctx.restore();
  };

  return {
    width,
    height,
    coverDurationMs: tuning.coverDurationMs,
    clearDurationMs: tuning.clearDurationMs,
    fillCovered(ctx, progress) {
      ctx.beginPath();
      for (const face of field.faces) {
        const pop = getFacePop(face, progress);

        if (pop > 0) {
          /* A closing triangle starts slowly and lands fast. Easing the
             other way leaves it almost full-size for most of its pop, with
             hairline gaps of bright live scene around it. */
          traceFace(
            ctx,
            field,
            face,
            easeInQuad(pop) * tuning.faceOverdrawScale,
          );
        }
      }
      ctx.fill();
    },
    renderCoverDetail(ctx, progress, elapsedMs) {
      drawFill(ctx, elapsedMs);

      /* Sparks on the nodes the search has just reached: they mark the
         front of the spreading graph, starting at the control. */
      const spark = tuning.nodeSpark;
      const sparkSize = spark.sizePx * field.responsiveScale;

      ctx.fillStyle = spark.color;
      for (const node of field.nodes) {
        const age = (progress - node.startProgress) / spark.lifeProgress;

        if (age < 0 || age >= 1) {
          continue;
        }

        const size = sparkSize * (1 - 0.4 * age);

        ctx.globalAlpha = 1 - age;
        ctx.fillRect(
          Math.round(node.x - size * 0.5),
          Math.round(node.y - size * 0.5),
          Math.round(size),
          Math.round(size),
        );
      }
      ctx.globalAlpha = 1;

      /* The graph is at full strength while it grows, then settles. */
      const settle = clamp01(
        (progress - (1 - tuning.graphSettleProgressSpan)) /
          tuning.graphSettleProgressSpan,
      );

      drawAsciiTransitionGraph(
        ctx,
        field,
        progress,
        elapsedMs,
        false,
        1 - (1 - tuning.settledGraphStrength) * settle,
      );
    },
    animatesHold: true,
    renderHold(ctx, elapsedMs) {
      drawFill(ctx, elapsedMs);
      drawAsciiTransitionGraph(
        ctx,
        field,
        1,
        elapsedMs,
        false,
        tuning.settledGraphStrength,
      );
    },
    erase(still, progress) {
      /* Each triangle breaks away as a shard: cracks open along its edges
         and the piece of old picture, with its characters, shrinks into its
         centre and is gone. The same shape is cut from the still and from
         the fill. */
      const targets = fillLayer ? [still, fillLayer] : [still];

      for (const target of targets) {
        target.save();
        target.globalCompositeOperation = "destination-out";
        target.globalAlpha = 1;
        target.fillStyle = "#000000";
        target.beginPath();
      }

      field.faces.forEach((face, index) => {
        if (isBroken[index]) {
          return;
        }

        const pop = getBreakPop(face, progress);

        if (pop <= 0) {
          return;
        }

        isBreaking[index] = 1;
        if (pop >= 1) {
          isBroken[index] = 1;
        }

        for (const target of targets) {
          traceBroken(target, face, pop);
        }
      });

      for (const target of targets) {
        target.fill();
        target.restore();
      }
    },
    renderClear(ctx, progress, elapsedMs) {
      drawFill(ctx, elapsedMs);
      drawAsciiTransitionGraph(
        ctx,
        field,
        getClearWave(progress),
        elapsedMs,
        true,
        tuning.settledGraphStrength,
      );

      /* The graph's rails and glyphs leave with their shard: whatever was
         just drawn over a broken triangle is cut away, so nothing is left
         lying on the uncovered scene. */
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      field.faces.forEach((face, index) => {
        if (isBreaking[index]) {
          traceBroken(ctx, face, getBreakPop(face, progress));
        }
      });
      ctx.fill();
      ctx.restore();

      /* What is left of each breaking shard sinks toward the colour of the
         sky behind it, so shard and crack meet in tone as the shard goes. */
      ctx.fillStyle = tuning.shardFadeColor;
      field.faces.forEach((face, index) => {
        if (!isBreaking[index] || isBroken[index]) {
          return;
        }

        const pop = getBreakPop(face, progress);
        const shardScale = getShardScale(pop);

        if (shardScale <= 0) {
          return;
        }

        ctx.globalAlpha = tuning.shardFadeAlpha * easeInQuad(pop);
        ctx.beginPath();
        traceFace(ctx, field, face, shardScale);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    },
  };
}

/* 2D: the plane subdivides into a lattice of diamonds along two diagonal
   axes. The lattice floods outward from the control in a branching order;
   each diamond pops in as the scene stops, and the old picture later
   shrinks away inside each diamond until nothing is left. A diamond in
   motion has stair-stepped edges and square dots on its corners. */

/* Adds a full-size diamond with straight edges to the current path. */
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

/* Adds a diamond with stair-stepped edges to the current path. It is
   `steps` stairs from its centre to each point, each `stepPx` wide.
   `reverse` winds it the other way, so a reversed diamond inside another
   shape leaves a hole. */
function traceSteppedDiamond(
  ctx: CanvasRenderingContext2D,
  tile: DiamondTile,
  steps: number,
  stepPx: number,
  reverse = false,
) {
  if (steps <= 0) {
    return;
  }

  const points: number[] = [];
  const add = (stepsX: number, stepsY: number) => {
    points.push(tile.cx + stepsX * stepPx, tile.cy + stepsY * stepPx);
  };

  /* Clockwise from the top: down the right side, then back up the left. */
  add(-1, -steps);
  add(1, -steps);
  for (let stair = 1; stair < steps; stair += 1) {
    add(stair, stair - steps);
    add(stair + 1, stair - steps);
  }
  add(steps, 0);
  for (let stair = steps; stair > 1; stair -= 1) {
    add(stair, steps - stair + 1);
    add(stair - 1, steps - stair + 1);
  }
  add(1, steps);
  add(-1, steps);
  for (let stair = 1; stair < steps; stair += 1) {
    add(-stair, steps - stair);
    add(-stair - 1, steps - stair);
  }
  add(-steps, 0);
  for (let stair = steps; stair > 1; stair -= 1) {
    add(-stair, stair - steps - 1);
    add(1 - stair, stair - steps - 1);
  }

  const count = points.length / 2;

  for (let index = 0; index < count; index += 1) {
    const point = reverse ? count - 1 - index : index;

    if (index === 0) {
      ctx.moveTo(points[point * 2], points[point * 2 + 1]);
    } else {
      ctx.lineTo(points[point * 2], points[point * 2 + 1]);
    }
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
  const halfDiagonal = tuning.tileHalfDiagonalPx;
  const fullHalfDiagonal = halfDiagonal * tuning.overdraw;
  const fullSteps = Math.round(halfDiagonal / tuning.stepPx);
  const coverDurationMs = tuning.growMs * tuning.coverGrowScale + tuning.popMs;
  const clearDurationMs = tuning.growMs + tuning.popMs;
  const isErased = new Uint8Array(tiles.length);

  /* How far a diamond is through its pop (0 to 1) during each beat. At a
     progress of 1 every diamond has finished, whatever the rounding. */
  const getCoverPop = (tile: DiamondTile, progress: number) =>
    progress >= 1
      ? 1
      : clamp01(
          (progress * coverDurationMs - tile.startMs * tuning.coverGrowScale) /
            tuning.popMs,
        );
  const getClearPop = (tile: DiamondTile, progress: number) =>
    progress >= 1
      ? 1
      : clamp01((progress * clearDurationMs - tile.startMs) / tuning.popMs);
  // Size, in stairs, of a diamond growing in or of the picture shrinking out.
  const getCoverSteps = (pop: number) =>
    Math.round(fullSteps * easeOutCubic(pop));
  /* A remnant of the old picture is dropped once it would be a single
     stair: a speck that small reads as a dead pixel, not as a tile. */
  const getClearSteps = (pop: number) => {
    const steps = Math.round(fullSteps * (1 - easeInCubic(pop)));

    return steps > 1 ? steps : 0;
  };

  /* Draws what marks a diamond in motion: its stair-stepped outline, and a
     square dot on each corner of its lattice cell. Both fade as it lands. */
  const drawPoppingMarks = (
    ctx: CanvasRenderingContext2D,
    getPop: (tile: DiamondTile) => number,
    getSteps: (pop: number) => number,
    // True keeps the outline at full strength for as long as it is drawn.
    holdOutline: boolean,
  ) => {
    const dot = tuning.stepPx;

    ctx.strokeStyle = DIAMOND_EDGE.color;
    ctx.fillStyle = DIAMOND_EDGE.dotColor;
    ctx.lineWidth = DIAMOND_EDGE.lineWidthPx;
    ctx.lineJoin = "miter";

    for (const tile of tiles) {
      const pop = getPop(tile);

      if (pop <= 0 || pop >= 1) {
        continue;
      }

      ctx.globalAlpha = DIAMOND_EDGE.alpha * (holdOutline ? 1 : 1 - pop);
      ctx.beginPath();
      traceSteppedDiamond(ctx, tile, getSteps(pop), tuning.stepPx);
      ctx.stroke();

      ctx.globalAlpha = DIAMOND_EDGE.dotAlpha * (1 - pop);
      for (const [cornerX, cornerY] of [
        [0, -halfDiagonal],
        [halfDiagonal, 0],
        [0, halfDiagonal],
        [-halfDiagonal, 0],
      ]) {
        ctx.fillRect(
          tile.cx + cornerX - dot * 0.5,
          tile.cy + cornerY - dot * 0.5,
          dot,
          dot,
        );
      }
    }

    ctx.globalAlpha = 1;
  };

  return {
    width,
    height,
    coverDurationMs,
    clearDurationMs,
    fillCovered(ctx, progress) {
      ctx.beginPath();
      for (const tile of tiles) {
        const pop = getCoverPop(tile, progress);

        if (pop >= 1) {
          /* A landed diamond is drawn straight-edged and slightly oversized
             so neighbours join without a seam. */
          traceDiamond(ctx, tile, fullHalfDiagonal);
        } else if (pop > 0) {
          traceSteppedDiamond(ctx, tile, getCoverSteps(pop), tuning.stepPx);
        }
      }
      ctx.fill();
    },
    renderCoverDetail(ctx, progress) {
      drawPoppingMarks(
        ctx,
        (tile) => getCoverPop(tile, progress),
        getCoverSteps,
        false,
      );
    },
    animatesHold: false,
    renderHold() {},
    erase(still, progress) {
      still.save();
      still.globalCompositeOperation = "destination-out";
      still.fillStyle = "#000000";
      still.beginPath();

      tiles.forEach((tile, index) => {
        if (isErased[index]) {
          return;
        }

        const pop = getClearPop(tile, progress);

        if (pop <= 0) {
          return;
        }

        /* The old picture survives in a stepped diamond that shrinks to
           nothing, so everything between the tile's edge and that diamond
           is erased. */
        traceDiamond(still, tile, fullHalfDiagonal);

        if (pop >= 1) {
          isErased[index] = 1;
        } else {
          traceSteppedDiamond(
            still,
            tile,
            getClearSteps(pop),
            tuning.stepPx,
            true,
          );
        }
      });

      still.fill();
      still.restore();
    },
    renderClear(ctx, progress) {
      /* A shrinking remnant is dark, so over a bright new planet it would
         read as a hole. Its outline stays at full strength to the end, which
         keeps every remnant a deliberate outlined tile. */
      drawPoppingMarks(
        ctx,
        (tile) => getClearPop(tile, progress),
        getClearSteps,
        true,
      );
    },
  };
}

/* 3D: an aperture opening from the control like a gravity well. A heavy,
   cross-hatched pixel ring marks its edge, thin ripples echo it on both
   sides, and layers of pixel planets circle the control inside and outside
   the ring, neighbouring layers turning opposite ways. */

function getFarthestCornerDistance(
  width: number,
  height: number,
  seed: SeedPoint,
) {
  return Math.max(
    Math.hypot(seed.x, seed.y),
    Math.hypot(width - seed.x, seed.y),
    Math.hypot(seed.x, height - seed.y),
    Math.hypot(width - seed.x, height - seed.y),
    1,
  );
}

/* The squares that make up a planet of the given radius: a stepped disc,
   as offsets in steps from its centre. A radius of 1 is a plus shape. */
function getPlanetCells(radiusSteps: number) {
  const cells: Array<[number, number]> = [];
  const reach = radiusSteps * radiusSteps + (radiusSteps > 1 ? 1 : 0);

  for (let offsetY = -radiusSteps; offsetY <= radiusSteps; offsetY += 1) {
    for (let offsetX = -radiusSteps; offsetX <= radiusSteps; offsetX += 1) {
      if (offsetX * offsetX + offsetY * offsetY <= reach) {
        cells.push([offsetX, offsetY]);
      }
    }
  }

  return cells;
}

function createIrisFront(
  width: number,
  height: number,
  seed: SeedPoint,
): TransitionFront {
  const tuning = IRIS_TRANSITION;
  const step = tuning.stepPx;
  const rowCount = Math.ceil(height / step);
  const ringRows = tuning.ring.rows;
  // The ring is centred on the aperture's edge.
  const ringInnerSteps = -ringRows.length / 2;
  /* Beyond the farthest corner by more than half the ring, so the ring is
     off screen when the beat ends. */
  const maxRadius =
    getFarthestCornerDistance(width, height, seed) +
    step * (ringRows.length / 2 + 2);
  const getRadius = (progress: number) => maxRadius * easeStandard(progress);
  // Each layer's planets start from their own random angle.
  const layers = tuning.planetLayers.map((layer) => ({
    ...layer,
    cells: getPlanetCells(layer.radiusSteps),
    phase: Math.random() * Math.PI * 2,
  }));

  /* The left and right ends, snapped to the step grid, of a disc of the
     given radius on one row of steps. Null when the disc misses the row. */
  const getRowSpan = (row: number, radius: number) => {
    const offsetY = (row + 0.5) * step - seed.y;

    if (radius <= 0 || Math.abs(offsetY) >= radius) {
      return null;
    }

    const halfChord = Math.sqrt(radius * radius - offsetY * offsetY);
    const left = Math.max(0, Math.round((seed.x - halfChord) / step) * step);
    const right = Math.min(
      Math.ceil(width / step) * step,
      Math.round((seed.x + halfChord) / step) * step,
    );

    return right > left ? { left, right } : null;
  };

  /* Adds the stepped disc to the current path, one rectangle per row. */
  const traceAperture = (ctx: CanvasRenderingContext2D, radius: number) => {
    ctx.beginPath();
    for (let row = 0; row < rowCount; row += 1) {
      const span = getRowSpan(row, radius);

      if (span) {
        ctx.rect(span.left, row * step, span.right - span.left, step);
      }
    }
  };

  /* Draws one stepped ring, a single step thick, whose inner edge is at
     `innerRadius`: the part of a disc one step larger that the disc inside
     it does not cover. With a `dither` colour its squares alternate between
     the two colours like a checkerboard. */
  const drawRingRow = (
    ctx: CanvasRenderingContext2D,
    innerRadius: number,
    color: string,
    dither: string | null,
  ) => {
    const fillRun = (row: number, left: number, right: number) => {
      if (right <= left) {
        return;
      }

      if (!dither) {
        ctx.fillStyle = color;
        ctx.fillRect(left, row * step, right - left, step);
        return;
      }

      for (let x = left; x < right; x += step) {
        ctx.fillStyle = (Math.round(x / step) + row) % 2 === 0 ? color : dither;
        ctx.fillRect(x, row * step, step, step);
      }
    };

    for (let row = 0; row < rowCount; row += 1) {
      const outer = getRowSpan(row, innerRadius + step);

      if (!outer) {
        continue;
      }

      const inner = getRowSpan(row, innerRadius);

      if (!inner) {
        fillRun(row, outer.left, outer.right);
        continue;
      }

      fillRun(row, outer.left, inner.left);
      fillRun(row, inner.right, outer.right);
    }
  };

  const isOnScreen = (x: number, y: number, margin: number) =>
    x >= -margin && y >= -margin && x <= width + margin && y <= height + margin;

  const drawRingAndPlanets = (
    ctx: CanvasRenderingContext2D,
    progress: number,
    elapsedMs: number,
  ) => {
    const radius = getRadius(progress);
    /* Everything fades in as the aperture leaves the control and out as its
       edge leaves the screen, so nothing pops on or off. */
    const presence =
      Math.min(1, progress * 10) * Math.min(1, (1 - progress) * 6);

    if (presence <= 0) {
      return;
    }

    /* The planet layers and their dotted orbits go down first, so the ring
       and its ripples always sit on top of them. Dots sit at fixed angles:
       as an orbit grows, the gaps between its dots widen until a new dot
       fits halfway between each pair, so dots only ever fly straight
       outward or appear; none slides along. */
    const finestAngle = tuning.dotSpacingPx / maxRadius;
    const seconds = elapsedMs / 1000;

    layers.forEach((layer, layerIndex) => {
      const orbitRadius = radius * (1 + layer.leadShare) + layer.leadPx;
      const planetSize = step * (layer.radiusSteps + 1);

      /* A layer fades in once its orbit is large enough for its planets to
         sit well apart. An inner layer therefore never pops on as a tight
         cluster beside the control; it grows in as the aperture makes room. */
      const roomyRadius = Math.max(
        planetSize * 2,
        (layer.count * planetSize * tuning.planetSpacingInSizes) /
          (Math.PI * 2),
      );
      /* The layers inside the ring sit over the newly uncovered scene, so
         they bow out over the last third of the beat, before the ring
         reaches the menu. */
      const innerFade = layer.leadPx < 0 ? clamp01((1 - progress) * 3) : 1;
      const layerPresence =
        presence *
        innerFade *
        clamp01((orbitRadius - roomyRadius) / tuning.layerFadeInPx);

      if (layerPresence <= 0) {
        return;
      }

      const stride =
        2 **
        Math.max(
          0,
          Math.ceil(
            Math.log2(tuning.dotSpacingPx / (orbitRadius * finestAngle)),
          ),
        );
      const angleStep = finestAngle * stride;

      ctx.globalAlpha = layer.orbitAlpha * layerPresence;
      ctx.fillStyle = layer.orbitColor;

      for (let angle = 0; angle < Math.PI * 2; angle += angleStep) {
        const x = seed.x + Math.cos(angle) * orbitRadius;
        const y = seed.y + Math.sin(angle) * orbitRadius;

        if (isOnScreen(x, y, step)) {
          ctx.fillRect(
            Math.round(x / step) * step - step * 0.5,
            Math.round(y / step) * step - step * 0.5,
            step,
            step,
          );
        }
      }

      /* The planets are solid, like the scene's sprites, and lit from the
         upper left like them. */
      ctx.globalAlpha = layerPresence;

      for (let planet = 0; planet < layer.count; planet += 1) {
        const angle =
          layer.phase +
          (planet / layer.count + seconds * layer.turnsPerSecond) * Math.PI * 2;
        const centerX =
          Math.round((seed.x + Math.cos(angle) * orbitRadius) / step) * step;
        const centerY =
          Math.round((seed.y + Math.sin(angle) * orbitRadius) / step) * step;

        if (!isOnScreen(centerX, centerY, planetSize)) {
          continue;
        }

        const [litColor, shadowColor] =
          tuning.planetColors[
            (layerIndex * 3 + planet) % tuning.planetColors.length
          ];
        const highlightOffset = -Math.ceil(layer.radiusSteps / 2);

        for (const [offsetX, offsetY] of layer.cells) {
          ctx.fillStyle =
            layer.radiusSteps > 1 &&
            offsetX === highlightOffset &&
            offsetY === highlightOffset
              ? tuning.planetHighlightColor
              : offsetX + offsetY <= 0
                ? litColor
                : shadowColor;
          ctx.fillRect(
            centerX + offsetX * step - step * 0.5,
            centerY + offsetY * step - step * 0.5,
            step,
            step,
          );
        }
      }
    });

    // The ripples on both sides of the ring.
    for (const ripple of tuning.ripples) {
      ctx.globalAlpha = ripple.alpha * presence;
      drawRingRow(
        ctx,
        radius + ripple.offsetSteps * step,
        ripple.color,
        ripple.dither ? "rgba(0, 0, 0, 0)" : null,
      );
    }

    /* The ring itself. It turns solid twice as fast as everything else
       fades in, so nothing shows through it. */
    ctx.globalAlpha = tuning.ring.alpha * Math.min(1, presence * 2);
    ringRows.forEach((ringRow, rowIndex) => {
      drawRingRow(
        ctx,
        radius + (ringInnerSteps + rowIndex) * step,
        ringRow.color,
        "dither" in ringRow ? ringRow.dither : null,
      );
    });

    ctx.globalAlpha = 1;
  };

  return {
    width,
    height,
    coverDurationMs: tuning.coverDurationMs,
    clearDurationMs: tuning.clearDurationMs,
    fillCovered(ctx, progress) {
      traceAperture(ctx, getRadius(progress));
      ctx.fill();
    },
    renderCoverDetail: drawRingAndPlanets,
    animatesHold: false,
    renderHold() {},
    erase(still, progress) {
      still.save();
      still.globalCompositeOperation = "destination-out";
      still.fillStyle = "#000000";
      traceAperture(still, getRadius(progress));
      still.fill();
      still.restore();
    },
    renderClear: drawRingAndPlanets,
  };
}

/* The cover that opens when the site first loads. It is not a render-mode
   transition: there is no outgoing scene, only the solid startup cover, and
   it opens with a plain round aperture. */
export function createStartupFront(
  width: number,
  height: number,
  seed: SeedPoint,
): TransitionFront {
  const maxRadius = getFarthestCornerDistance(width, height, seed) + 2;

  return {
    width,
    height,
    coverDurationMs: 0,
    clearDurationMs: STARTUP_REVEAL.durationMs,
    fillCovered() {},
    renderCoverDetail() {},
    animatesHold: false,
    renderHold() {},
    erase(still, progress) {
      still.save();
      still.globalCompositeOperation = "destination-out";
      still.fillStyle = "#000000";
      still.beginPath();
      still.arc(
        seed.x,
        seed.y,
        maxRadius * easeOutCubic(progress),
        0,
        Math.PI * 2,
      );
      still.fill();
      still.restore();
    },
    renderClear() {},
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
