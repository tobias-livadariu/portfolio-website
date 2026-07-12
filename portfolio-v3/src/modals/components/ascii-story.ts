/**
 * Seeded generators for the "ink story" ASCII scenes in the portfolio modal.
 *
 * Every scene is a character grid composed from reusable primitives — ink
 * splotches (an implicit radial field warped by low-frequency angular noise,
 * mapped onto a character density ramp), footprint trails, and bouncing-ball
 * trails. All randomness flows from a string seed through a mulberry32 PRNG,
 * so a given (seed, columns) pair always renders the same art: chaotic to the
 * eye, deterministic to the layout.
 */

export interface SceneSegment {
  className: string | null;
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

/* ------------------------------------------------------------------ */
/* Character grid                                                       */
/* ------------------------------------------------------------------ */

interface Grid {
  chars: string[][];
  classes: (string | null)[][];
  height: number;
  width: number;
}

function createGrid(width: number, height: number): Grid {
  return {
    chars: Array.from({ length: height }, () => Array(width).fill(" ")),
    classes: Array.from({ length: height }, () => Array(width).fill(null)),
    height,
    width,
  };
}

function setCell(
  grid: Grid,
  x: number,
  y: number,
  char: string,
  className: string | null,
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
  grid.classes[row][col] = className;
}

/** Merge same-class runs so each rendered line is a handful of spans. */
export function gridToRows(grid: Grid): SceneRow[] {
  return grid.chars.map((rowChars, row) => {
    const segments: SceneRow = [];

    for (let col = 0; col < rowChars.length; col += 1) {
      const className = rowChars[col] === " " ? null : grid.classes[row][col];
      const previous = segments[segments.length - 1];

      if (previous && previous.className === className) {
        previous.text += rowChars[col];
      } else {
        segments.push({ className, text: rowChars[col] });
      }
    }

    /* Drop the trailing run of blanks so lines don't overflow narrow view-
       ports with invisible content. */
    const last = segments[segments.length - 1];
    if (last && last.className === null && !last.text.trim()) {
      segments.pop();
    }

    return segments.length > 0 ? segments : [{ className: null, text: " " }];
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
/* Ink splotch                                                          */
/* ------------------------------------------------------------------ */

const INK_CORE_CHARS = ["@", "#", "%", "&", "8"] as const;
const INK_MID_CHARS = ["*", "+", "=", "o"] as const;
const INK_EDGE_CHARS = [":", ".", "'", "`"] as const;
const DROPLET_NEAR_CHARS = ["*", "o", ":"] as const;
const DROPLET_FAR_CHARS = [".", ".", "`", ","] as const;

interface Splotch {
  cx: number;
  cy: number;
  /** Interior semi-axes sized around the text block. */
  rx: number;
  ry: number;
  textLines: string[];
}

function measureSplotch(
  textLines: string[],
  columns: number,
): Pick<Splotch, "rx" | "ry"> {
  const textWidth = Math.max(...textLines.map((line) => line.length));
  const padX = columns < 52 ? 4 : 7;

  return {
    rx: textWidth / 2 + padX,
    ry: textLines.length / 2 + 3.4,
  };
}

/**
 * Boundary radius multiplier for a given angle: 1 plus a few random low-
 * frequency sine harmonics, so the blob bulges organically instead of
 * reading as an ellipse.
 */
function makeWobble(rng: Rng) {
  const harmonics = [2, 3, 5].map((frequency) => ({
    amplitude: 0.06 + rng() * 0.08,
    frequency,
    phase: rng() * Math.PI * 2,
  }));

  return (angle: number) =>
    harmonics.reduce(
      (sum, harmonic) =>
        sum +
        harmonic.amplitude *
          Math.sin(harmonic.frequency * angle + harmonic.phase),
      1,
    );
}

function drawSplotch(grid: Grid, splotch: Splotch, rng: Rng) {
  const { cx, cy, rx, ry, textLines } = splotch;
  const wobble = makeWobble(rng);
  const reachX = Math.ceil(rx * 1.6);
  const reachY = Math.ceil(ry * 1.6);

  for (let row = Math.floor(cy - reachY); row <= cy + reachY; row += 1) {
    for (let col = Math.floor(cx - reachX); col <= cx + reachX; col += 1) {
      const dx = (col - cx) / rx;
      const dy = (row - cy) / ry;
      const boundary = wobble(Math.atan2(dy, dx));
      /* Jitter roughens the rim so the iso-line never looks traced. */
      const depth = Math.hypot(dx, dy) / boundary + (rng() - 0.5) * 0.1;

      if (depth >= 1) {
        continue;
      }

      if (depth < 0.7) {
        if (rng() > 0.04) {
          setCell(grid, col, row, pick(rng, INK_CORE_CHARS), "ink");
        }
      } else if (depth < 0.9) {
        setCell(grid, col, row, pick(rng, INK_MID_CHARS), "ink");
      } else {
        setCell(grid, col, row, pick(rng, INK_EDGE_CHARS), "edge");
      }
    }
  }

  drawDroplets(grid, splotch, rng);
  drawDrips(grid, splotch, rng);

  /* Knock a clearing out of the ink and lay the blurb into it. */
  const textWidth = Math.max(...textLines.map((line) => line.length));
  const clearLeft = Math.round(cx - textWidth / 2) - 1;
  const clearTop = Math.round(cy - textLines.length / 2);

  for (let row = clearTop; row < clearTop + textLines.length; row += 1) {
    for (let col = clearLeft; col < clearLeft + textWidth + 2; col += 1) {
      setCell(grid, col, row, " ", null);
    }
  }

  textLines.forEach((line, index) => {
    const startCol = Math.round(cx - line.length / 2);
    for (let offset = 0; offset < line.length; offset += 1) {
      setCell(grid, startCol + offset, clearTop + index, line[offset], "text");
    }
  });
}

/** Short runs of ink bleeding down from the splotch's lower rim. */
function drawDrips(grid: Grid, splotch: Splotch, rng: Rng) {
  const { cx, cy, rx, ry } = splotch;
  const count = 2 + Math.floor(rng() * 3);

  for (let i = 0; i < count; i += 1) {
    const col = Math.round(cx + (rng() - 0.5) * rx * 1.1);
    const startRow = Math.round(cy + ry * (0.95 + rng() * 0.15));
    const length = 1 + Math.floor(rng() * 3);

    for (let step = 0; step < length; step += 1) {
      setCell(
        grid,
        col,
        startRow + step,
        step === length - 1 ? "." : ":",
        "drop",
        false,
      );
    }
  }
}

function drawDroplets(grid: Grid, splotch: Splotch, rng: Rng) {
  const { cx, cy, rx, ry } = splotch;
  const count = Math.round(10 + rng() * 8);

  for (let i = 0; i < count; i += 1) {
    const angle = rng() * Math.PI * 2;
    const reach = 1.08 + rng() * 0.45;
    const col = cx + Math.cos(angle) * rx * reach;
    const row = cy + Math.sin(angle) * ry * reach;
    const chars = reach < 1.22 ? DROPLET_NEAR_CHARS : DROPLET_FAR_CHARS;

    setCell(grid, col, row, pick(rng, chars), "drop", false);

    /* A few droplets get a tiny companion speck, like split spray. */
    if (rng() < 0.3) {
      setCell(
        grid,
        col + (rng() < 0.5 ? -2 : 2),
        row + (rng() < 0.5 ? 0 : 1),
        pick(rng, DROPLET_FAR_CHARS),
        "drop",
        false,
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Trails                                                               */
/* ------------------------------------------------------------------ */

/**
 * Alternating heel-and-toe footprint pairs straddling the walk line —
 * the classic "tracks in snow" reading.
 */
function drawFootprints(
  grid: Grid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rng: Rng,
) {
  const distance = Math.hypot(x1 - x0, (y1 - y0) * 2);
  const steps = Math.max(2, Math.round(distance / 3.4));

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const jitter = (rng() - 0.5) * 0.6;
    const x = x0 + (x1 - x0) * t + jitter;
    const y = y0 + (y1 - y0) * t;
    const isLeftFoot = i % 2 === 0;
    const sideOffset = isLeftFoot ? -1 : 1;
    const mark = isLeftFoot ? "'" : ",";

    setCell(grid, x + sideOffset, y, mark, "trail", false);
    setCell(grid, x + sideOffset + 1, y, mark, "trail", false);

    /* Occasional scuff behind a step. */
    if (rng() < 0.22 && i > 0) {
      setCell(grid, x - sideOffset, y + (isLeftFoot ? 1 : -1), ".", "drop", false);
    }
  }
}

/** Dotted flight line that tightens into bolder marks near the impact end. */
function drawBallPath(
  grid: Grid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rng: Rng,
) {
  const distance = Math.hypot(x1 - x0, (y1 - y0) * 2);
  const steps = Math.max(3, Math.round(distance / 2.6));

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + (rng() - 0.5) * 0.5;
    const nearImpact = t > 0.82;
    const char = nearImpact ? "o" : pick(rng, [".", ".", ".", "`"] as const);

    setCell(grid, x, y, char, nearImpact ? "ball" : "trail", false);
  }

  /* The ball itself, streaking in just before the burst. */
  setCell(grid, x0 + (x1 - x0) * 0.94, y0 + (y1 - y0) * 0.94, "O", "ball");
}

/* ------------------------------------------------------------------ */
/* Scenes                                                               */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function wrapWidthFor(columns: number) {
  return clamp(columns - 16, 14, 42);
}

/**
 * `./what-i-built` — footprints walk in from the top-left at ~45°, burst
 * into an ink splotch holding the first blurb, then walk down-LEFT and
 * burst against the left border with the second.
 */
export function composeInkWalkScene(
  columns: number,
  blurbs: readonly [string, string],
  seed: string,
): SceneRow[] {
  const rng = mulberry32(hashSeed(`${seed}:${columns}`));
  const wrapWidth = wrapWidthFor(columns);
  const lines1 = wrapBlurb(blurbs[0], wrapWidth);
  const lines2 = wrapBlurb(blurbs[1], wrapWidth);
  const size1 = measureSplotch(lines1, columns);
  const size2 = measureSplotch(lines2, columns);

  const cx1 = clamp(
    Math.round(columns * 0.64),
    Math.ceil(size1.rx) + 1,
    columns - Math.ceil(size1.rx) - 1,
  );
  /* Approach at the walk's 2:1 slope, but cap the drop on wide terminals so
     the stroll doesn't burn thirty near-empty rows before the first burst. */
  const cy1 = Math.round(
    clamp(1 + (cx1 - 2) / 2, Math.ceil(size1.ry) + 2, Math.ceil(size1.ry) + 11),
  );
  const splotch1: Splotch = { cx: cx1, cy: cy1, ...size1, textLines: lines1 };

  /* Second splotch presses into the left border — the wall it explodes on. */
  const maxLine2 = Math.max(...lines2.map((line) => line.length));
  const cx2 = Math.ceil(maxLine2 / 2) + 2;
  const cy2 = Math.round(cy1 + size1.ry + size2.ry + 4);
  const splotch2: Splotch = { cx: cx2, cy: cy2, ...size2, textLines: lines2 };

  const height = Math.ceil(cy2 + size2.ry * 1.35 + 1);
  const grid = createGrid(columns, height);

  drawFootprints(
    grid,
    2,
    1,
    cx1 - size1.rx * 0.7,
    cy1 - size1.ry * 0.7,
    rng,
  );
  drawFootprints(
    grid,
    cx1 - size1.rx * 0.45,
    cy1 + size1.ry * 0.95,
    cx2 + size2.rx * 0.55,
    cy2 - size2.ry * 0.85,
    rng,
  );

  drawSplotch(grid, splotch1, rng);
  drawSplotch(grid, splotch2, rng);

  return gridToRows(grid);
}

/**
 * `./what-i-learnt` — a ball ricochets wall to wall, bursting into an ink
 * splotch at each impact: right wall, left wall, right wall, then it
 * bounces away off the bottom of the scene.
 */
export function composeInkBounceScene(
  columns: number,
  blurbs: readonly [string, string, string],
  seed: string,
): SceneRow[] {
  const rng = mulberry32(hashSeed(`${seed}:${columns}`));
  const wrapWidth = wrapWidthFor(columns);
  const wrapped = blurbs.map((blurb) => wrapBlurb(blurb, wrapWidth));
  const sizes = wrapped.map((lines) => measureSplotch(lines, columns));

  /* Impacts alternate right, left, right; centers sit close enough to the
     wall that each burst clips it. */
  const centers: Splotch[] = [];
  let previousBottom = 1;

  wrapped.forEach((lines, index) => {
    const size = sizes[index];
    const maxLine = Math.max(...lines.map((line) => line.length));
    const onRightWall = index % 2 === 0;
    const cx = onRightWall
      ? columns - Math.ceil(maxLine / 2) - 3
      : Math.ceil(maxLine / 2) + 2;
    const cy = Math.round(previousBottom + size.ry + (index === 0 ? 2 : 3));

    centers.push({ cx, cy, ...size, textLines: lines });
    previousBottom = cy + size.ry;
  });

  const last = centers[centers.length - 1];
  const height = Math.ceil(last.cy + last.ry * 1.35 + 2);
  const grid = createGrid(columns, height);

  centers.forEach((splotch, index) => {
    const from =
      index === 0
        ? { x: 1, y: 1 }
        : {
            x:
              centers[index - 1].cx +
              (index % 2 === 0 ? 1 : -1) * centers[index - 1].rx * 0.55,
            y: centers[index - 1].cy + centers[index - 1].ry * 0.9,
          };

    drawBallPath(
      grid,
      from.x,
      from.y,
      splotch.cx + (index % 2 === 0 ? splotch.rx * 0.5 : -splotch.rx * 0.5),
      splotch.cy - splotch.ry * 0.5,
      rng,
    );
  });

  centers.forEach((splotch) => drawSplotch(grid, splotch, rng));

  /* Bounce away: a short fading arc leaving the final burst, drawn after
     the splotches so it stays visible against the fringe. */
  const exitX = last.cx - last.rx * 0.9;
  for (let i = 0; i < 5; i += 1) {
    setCell(
      grid,
      exitX - i * 3,
      last.cy + last.ry * 0.75 + i,
      i < 2 ? "o" : ".",
      i < 2 ? "ball" : "trail",
      false,
    );
  }

  return gridToRows(grid);
}
