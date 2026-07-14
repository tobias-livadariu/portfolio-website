/**
 * Seeded generator for the "logo bounce" ASCII scenes in the portfolio modal.
 *
 * A company logo (pre-rasterized into rotated ASCII stamps) ricochets between
 * the terminal's side walls, spinning as it flies and shedding a faint wind
 * trail. Each wall impact detonates into an outward explosion of directional
 * rays and debris, with the story blurb boxed in an ASCII border at the
 * blast's heart. All randomness flows from a string seed through a mulberry32
 * PRNG, so a given (seed, columns) pair always renders the same art.
 */

import type { AsciiFrame } from "./ascii-image-rows";

export interface SceneSegment {
  className: string | null;
  color?: string;
  text: string;
}

export type SceneRow = SceneSegment[];

/* ------------------------------------------------------------------ */
/* Seeded randomness                                                    */
/* ------------------------------------------------------------------ */

function hashSeed(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  let state = a;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function pick<T>(rng: Rng, values: readonly T[]): T {
  return values[Math.min(values.length - 1, Math.floor(rng() * values.length))];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/* ------------------------------------------------------------------ */
/* Character grid                                                       */
/* ------------------------------------------------------------------ */

/** Cell metadata: a palette class token, or `c:<css-color>` for logo cells. */
interface Grid {
  chars: string[][];
  meta: (string | null)[][];
  height: number;
  width: number;
}

function createGrid(width: number, height: number): Grid {
  return {
    chars: Array.from({ length: height }, () => Array(width).fill(" ")),
    meta: Array.from({ length: height }, () => Array(width).fill(null)),
    height,
    width,
  };
}

function setCell(
  grid: Grid,
  x: number,
  y: number,
  char: string,
  meta: string | null,
  overwrite = true,
) {
  const col = Math.round(x);
  const row = Math.round(y);

  if (col < 0 || col >= grid.width || row < 0 || row >= grid.height) {
    return;
  }

  if (!overwrite && grid.chars[row][col] !== " ") {
    return;
  }

  grid.chars[row][col] = char;
  grid.meta[row][col] = meta;
}

/** Merge same-meta runs so each rendered line is a handful of spans. */
export function gridToRows(grid: Grid): SceneRow[] {
  return grid.chars.map((rowChars, row) => {
    const segments: SceneRow = [];

    for (let col = 0; col < rowChars.length; col += 1) {
      const meta = rowChars[col] === " " ? null : grid.meta[row][col];
      const previous = segments[segments.length - 1];
      const isColor = meta?.startsWith("c:") ?? false;

      if (previous && previous.className === (isColor ? null : meta) &&
          previous.color === (isColor ? meta!.slice(2) : undefined)) {
        previous.text += rowChars[col];
      } else {
        segments.push({
          className: isColor ? null : meta,
          color: isColor ? meta!.slice(2) : undefined,
          text: rowChars[col],
        });
      }
    }

    const last = segments[segments.length - 1];
    if (last && last.className === null && !last.color && !last.text.trim()) {
      segments.pop();
    }

    return segments.length > 0
      ? segments
      : [{ className: null, text: " " }];
  });
}

/* ------------------------------------------------------------------ */
/* Text wrapping                                                        */
/* ------------------------------------------------------------------ */

function wrapBlurb(text: string, maxCharacters: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= maxCharacters) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

/* ------------------------------------------------------------------ */
/* Logo stamps and wind trail                                           */
/* ------------------------------------------------------------------ */

interface DimmableColor {
  color: string;
  factor: number;
}

const DIM_COLOR_CACHE = new Map<string, string>();

/** Scale an rgb(...) string toward black for motion-ghost dimming. */
function dimColor({ color, factor }: DimmableColor) {
  if (factor >= 0.999) {
    return color;
  }

  const key = `${color}|${factor}`;
  const cached = DIM_COLOR_CACHE.get(key);

  if (cached) {
    return cached;
  }

  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  const dimmed = match
    ? `rgb(${Math.round(Number(match[1]) * factor)}, ${Math.round(
        Number(match[2]) * factor,
      )}, ${Math.round(Number(match[3]) * factor)})`
    : color;

  DIM_COLOR_CACHE.set(key, dimmed);
  return dimmed;
}

function stampFrame(
  grid: Grid,
  frame: AsciiFrame,
  centerX: number,
  centerY: number,
  dimFactor: number,
) {
  const height = frame.length;
  const width = frame[0]?.length ?? 0;
  const left = Math.round(centerX - width / 2);
  const top = Math.round(centerY - height / 2);

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const cell = frame[row][col];

      if (cell.char === " ") {
        continue;
      }

      setCell(
        grid,
        left + col,
        top + row,
        cell.char,
        `c:${dimColor({ color: cell.color, factor: dimFactor })}`,
      );
    }
  }
}

const WIND_CHARS = ["~", "-", "`", "."] as const;

/** Faint streaks shed behind a moving stamp, opposite its velocity. */
function drawWindTrail(
  grid: Grid,
  centerX: number,
  centerY: number,
  directionX: number,
  logoWidth: number,
  logoHeight: number,
  rng: Rng,
) {
  const back = -Math.sign(directionX) || -1;
  const streaks = 3;

  for (let i = 0; i < streaks; i += 1) {
    const row = Math.round(
      centerY - logoHeight / 2 + 1 + (i * (logoHeight - 2)) / (streaks - 1),
    );
    const startX = centerX + back * (logoWidth / 2 + 1 + rng() * 2);
    const length = 2 + Math.floor(rng() * 3);

    for (let step = 0; step < length; step += 1) {
      setCell(
        grid,
        startX + back * step,
        row + (rng() < 0.2 ? 1 : 0),
        pick(rng, WIND_CHARS),
        "wind",
        false,
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Explosion                                                            */
/* ------------------------------------------------------------------ */

interface ExplosionBox {
  boxHeight: number;
  boxWidth: number;
  centerX: number;
  centerY: number;
  textLines: string[];
}

/* Vertical compression applied when drawing radial geometry, so blasts look
   round despite cells being roughly twice as tall as wide. */
const BLAST_VERTICAL_SCALE = 0.45;

function rayCharFor(dx: number, dy: number, tipness: number, rng: Rng) {
  if (tipness > 0.78) {
    return pick(rng, [":", ".", "'"] as const);
  }

  /* Match the character to the slope the ray is actually drawn at. */
  const visualSlope = Math.abs(
    (dy * BLAST_VERTICAL_SCALE * 2) / (dx || 0.0001),
  );

  if (visualSlope > 2.4) {
    return pick(rng, ["|", "|", "!"] as const);
  }

  if (visualSlope > 0.45) {
    return dx * dy > 0 ? "\\" : "/";
  }

  return pick(rng, ["-", "=", "-"] as const);
}

const CORONA_CORE_CHARS = ["@", "#", "%", "&", "8"] as const;
const CORONA_MID_CHARS = ["*", "+", "=", "o"] as const;
const CORONA_EDGE_CHARS = [":", ".", "'", "`"] as const;

/**
 * A violent outward burst centered on the blurb box: a dense white-hot
 * corona hugging the box rim that decays outward, short slope-matched rays
 * punching into the open field, debris specks flung further out. `away` is
 * the horizontal direction pointing off the wall into the terminal.
 */
function drawExplosion(grid: Grid, box: ExplosionBox, away: number, rng: Rng) {
  const { boxHeight, boxWidth, centerX, centerY } = box;
  const reachX = 8;
  const reachY = 4;

  /* Corona: fill probability and density decay with rounded-rect distance
     from the box rim. */
  for (
    let y = Math.floor(centerY - boxHeight / 2 - reachY);
    y <= centerY + boxHeight / 2 + reachY;
    y += 1
  ) {
    for (
      let x = Math.floor(centerX - boxWidth / 2 - reachX);
      x <= centerX + boxWidth / 2 + reachX;
      x += 1
    ) {
      const outsideX = Math.max(0, Math.abs(x - centerX) - boxWidth / 2);
      const outsideY = Math.max(0, Math.abs(y - centerY) - boxHeight / 2);
      const distance = Math.hypot(outsideX / reachX, outsideY / reachY);

      if (distance <= 0 || distance > 1) {
        continue;
      }

      const fill = (1 - distance) ** 1.4 * 0.95 + 0.08;

      if (rng() > fill) {
        continue;
      }

      const chars =
        distance < 0.4
          ? CORONA_CORE_CHARS
          : distance < 0.72
            ? CORONA_MID_CHARS
            : CORONA_EDGE_CHARS;
      const meta =
        distance < 0.4 && rng() < 0.4
          ? "flash"
          : distance < 0.72
            ? "ray"
            : "debris";

      setCell(grid, x, y, pick(rng, chars), meta);
    }
  }

  /* Rays punching out of the corona into the open field. */
  const rayCount = 13 + Math.floor(rng() * 4);

  for (let i = 0; i < rayCount; i += 1) {
    /* Fan across the field-facing half, denser near horizontal. */
    const fan = (i / (rayCount - 1)) * 2 - 1;
    const angle = fan * 1.2 + (rng() - 0.5) * 0.2;
    const dx = Math.cos(angle) * away;
    const dy = Math.sin(angle);
    const startX = centerX + away * (boxWidth / 2) + dx * (reachX - 2);
    const startY = centerY + dy * (boxHeight / 2 + reachY - 1);
    const length = 5 + rng() * 10;

    for (let step = 1; step <= length; step += 1) {
      const tipness = step / length;
      const x = startX + dx * step + (rng() - 0.5) * 0.6;
      const y = startY + dy * step * BLAST_VERTICAL_SCALE;

      setCell(
        grid,
        x,
        y,
        rayCharFor(dx, dy, tipness, rng),
        tipness > 0.7 ? "debris" : "ray",
        false,
      );
    }
  }

  /* Debris flung past everything, biased into the field. */
  const debrisCount = 16 + Math.floor(rng() * 8);

  for (let i = 0; i < debrisCount; i += 1) {
    const angle = (rng() - 0.5) * Math.PI * 1.5;
    const reach = 1 + rng() * 0.9;
    const x =
      centerX +
      Math.cos(angle) * away * (boxWidth / 2 + reachX * reach + rng() * 6);
    const y = centerY + Math.sin(angle) * (boxHeight / 2 + reachY * reach);

    setCell(
      grid,
      x,
      y,
      pick(rng, ["*", "o", ".", "`", ",", "'"] as const),
      "debris",
      false,
    );
  }
}

/** ASCII-bordered box with the blurb centered inside, drawn over the blast. */
function drawTextBox(grid: Grid, box: ExplosionBox) {
  const { boxHeight, boxWidth, centerX, centerY, textLines } = box;
  const left = Math.round(centerX - boxWidth / 2);
  const top = Math.round(centerY - boxHeight / 2);

  for (let row = 0; row < boxHeight; row += 1) {
    for (let col = 0; col < boxWidth; col += 1) {
      const x = left + col;
      const y = top + row;
      const isTopOrBottom = row === 0 || row === boxHeight - 1;
      const isSide = col === 0 || col === boxWidth - 1;

      if (isTopOrBottom) {
        setCell(grid, x, y, isSide ? "+" : "=", "border");
      } else if (isSide) {
        setCell(grid, x, y, "|", "border");
      } else {
        setCell(grid, x, y, " ", null);
      }
    }
  }

  textLines.forEach((line, index) => {
    const startCol = Math.round(centerX - line.length / 2);
    for (let offset = 0; offset < line.length; offset += 1) {
      setCell(grid, startCol + offset, top + 1 + index, line[offset], "text");
    }
  });
}

/* ------------------------------------------------------------------ */
/* Scene composition                                                    */
/* ------------------------------------------------------------------ */

export interface LogoBounceOptions {
  blurbs: readonly string[];
  columns: number;
  seed: string;
  /** Spin sequence of rotated logo stamps; consumed round-robin. */
  stamps: readonly AsciiFrame[];
}

interface FlightPlan {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

function drawFlight(
  grid: Grid,
  flight: FlightPlan,
  stamps: readonly AsciiFrame[],
  spinState: { index: number },
  rng: Rng,
  dims: readonly number[],
) {
  const logoHeight = stamps[0]?.length ?? 6;
  const logoWidth = stamps[0]?.[0]?.length ?? 12;
  const span = Math.abs(flight.toX - flight.fromX);
  const stampCount = span > logoWidth * 3.2 ? dims.length : dims.length - 1;
  const usableDims = dims.slice(dims.length - stampCount);

  for (let i = 0; i < stampCount; i += 1) {
    const t = (i + 1) / (stampCount + 1);
    const x = flight.fromX + (flight.toX - flight.fromX) * t;
    const y = flight.fromY + (flight.toY - flight.fromY) * t;
    const frame = stamps[spinState.index % stamps.length];

    spinState.index += 1;

    drawWindTrail(
      grid,
      x,
      y,
      flight.toX - flight.fromX,
      logoWidth,
      logoHeight,
      rng,
    );
    stampFrame(grid, frame, x, y, usableDims[i]);
  }
}

/**
 * Compose the full scene: the logo enters from the top-left, flies wall to
 * wall (spinning), and detonates on each wall with one blurb per impact.
 */
export function composeLogoBounceScene(options: LogoBounceOptions): SceneRow[] {
  const { blurbs, columns, seed, stamps } = options;
  const rng = mulberry32(hashSeed(`${seed}:${columns}`));

  const logoHeight = stamps[0]?.length ?? 6;
  const logoWidth = stamps[0]?.[0]?.length ?? 12;
  const wrapWidth = clamp(columns - 18, 14, 40);

  /* Lay out every explosion box first: walls alternate right, left, right… */
  const boxes: ExplosionBox[] = [];
  let cursorY = 1;

  blurbs.forEach((blurb, index) => {
    const textLines = wrapBlurb(blurb, wrapWidth);
    const innerWidth = Math.max(...textLines.map((line) => line.length)) + 2;
    const boxWidth = Math.min(innerWidth + 2, columns);
    const boxHeight = textLines.length + 2;
    const onRightWall = index % 2 === 0;
    const centerX = onRightWall ? columns - boxWidth / 2 : boxWidth / 2;
    /* Flight room above the box: enough rows for the spinning logo. */
    const flightDrop = Math.max(logoHeight + 4, 8);
    const centerY = Math.round(cursorY + flightDrop + boxHeight / 2);

    boxes.push({ boxHeight, boxWidth, centerX, centerY, textLines });
    cursorY = centerY + boxHeight / 2 + 3;
  });

  const lastBox = boxes[boxes.length - 1];
  const exitRows = logoHeight;
  const height = Math.ceil(lastBox.centerY + lastBox.boxHeight / 2 + exitRows);
  const grid = createGrid(columns, height);

  /* Flights: entry → box 1, box 1 → box 2, …, last box → bounce away. */
  const spinState = { index: 0 };

  boxes.forEach((box, index) => {
    const onRightWall = index % 2 === 0;
    const previous = boxes[index - 1];
    /* Take off from just below the previous box's outer half, and slam into
       the wall right above the new box — the full terminal width of travel. */
    const fromX = previous
      ? previous.centerX -
        (onRightWall ? -1 : 1) * (previous.boxWidth / 2 - logoWidth * 0.2)
      : 2 + logoWidth / 2;
    const fromY = previous
      ? previous.centerY + previous.boxHeight / 2 + logoHeight / 2
      : Math.max(1, logoHeight / 2);
    const toX = onRightWall
      ? columns - logoWidth / 2 - 1
      : logoWidth / 2 + 1;
    const toY = box.centerY - box.boxHeight / 2 - logoHeight / 2;

    drawFlight(
      grid,
      { fromX, fromY, toX, toY },
      stamps,
      spinState,
      rng,
      [0.4, 0.65, 1],
    );
  });

  /* Bounce away from the final blast, fading out. */
  const lastOnRight = (boxes.length - 1) % 2 === 0;
  const exitDirection = lastOnRight ? -1 : 1;
  const exitFromX =
    lastBox.centerX + exitDirection * (lastBox.boxWidth / 2 + logoWidth * 0.6);
  const exitFromY = lastBox.centerY + lastBox.boxHeight / 2;

  drawFlight(
    grid,
    {
      fromX: exitFromX,
      fromY: exitFromY,
      toX: exitFromX + exitDirection * Math.min(columns * 0.4, logoWidth * 3.5),
      toY: exitFromY + Math.max(2, exitRows - logoHeight),
    },
    stamps,
    spinState,
    rng,
    [0.65, 0.4],
  );

  /* Explosions last so blasts and text boxes sit above flight overlap. */
  boxes.forEach((box, index) => {
    drawExplosion(grid, box, index % 2 === 0 ? -1 : 1, rng);
    drawTextBox(grid, box);
  });

  return gridToRows(grid);
}
