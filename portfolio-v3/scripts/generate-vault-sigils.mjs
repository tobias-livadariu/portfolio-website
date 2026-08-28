/**
 * Generates the ASCII vault sigils used by the render-mode controls.
 *
 * Each mark is a circle of still water with ripple sources on its rim. A source
 * sits at one point of the boundary and emits a family of wavefronts: circles
 * internally tangent to the boundary at that point, shrinking geometrically
 * back toward it. The number of sources is the mode index, so DEEP has one
 * ripple from the top, FLAT two from the left and right, and CHAR three spaced
 * evenly around the rim.
 *
 * Every wavefront is an independent circle, and the field they are drawn into
 * is additive: where two ripples cross, the two contributions sum and the cell
 * quantises to a denser glyph, which is what reads as interference.
 *
 * Everything is drawn analytically and supersampled, then quantised against a
 * subset of the ramp the About modal's portrait uses, so the marks belong to
 * the same visual family as the rest of the site's ASCII art.
 *
 * Usage: node scripts/generate-vault-sigils.mjs [--print]
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/* A subset of the About portrait's ramp (" .,:;irsXA253hMHGS#9B&@"). The full
   ramp packs too many near-identical weights for marks this small: at ~8px the
   middle of it turns into undifferentiated grey, and the line drawing stops
   reading. These ten steps keep the same glyph family with usable contrast. */
const RAMP = " .:irsXA#&@";

/* Iosevka Term advances exactly half its font size, so a glyph cell is twice as
   tall as it is wide at line-height 1. The grid is sized to compensate: a round
   sigil needs twice the columns of rows.

   13 rows is the floor for three wavefronts per source. Below it the innermost
   two land in the same row near their pole and the family stops reading as
   separate circles — 11 rows produced a solid blob. Raising rippleCount needs
   proportionally more rows again (four wants ~22). */
const COLUMNS = 25;
const ROWS = 13;

/** Half-extent of the drawing area in sigil radii; >1 leaves an outer margin. */
const VIEW = 1.08;

/** Samples per axis inside one glyph cell before the tone is quantised. */
const SUPERSAMPLES = 8;

/* Stroke half-width in sigil radii. Tuned by eye: wide enough that a wavefront
   lands on a glyph in every cell it crosses, narrow enough that neighbouring
   wavefronts stay separate where they bunch up near their source. */
const STROKE_HALF = 0.018;

/* Softens the falloff either side of a stroke. Lower values give harder,
   blockier edges, which survive the quantisation step far better than a
   photographic ramp would. */
const EDGE_SOFTNESS = 0.9;

/* Interference response. The per-cell field is the sum of every wavefront
   covering it, so one stroke on its own lands near SINGLE_STROKE_TONE and each
   further crossing pushes further up the ramp with diminishing returns.
   Saturating rather than clamping is what keeps a crossing visibly denser than
   a lone stroke without blowing every crossing out to a solid @. */
const SINGLE_STROKE_TONE = 0.52;
const INTERFERENCE_GAIN = -Math.log(1 - SINGLE_STROKE_TONE);

/* Cells where no wavefront passes more strongly than this stay blank. */
const TONE_FLOOR = 0.4;

/* Wavefronts shrink by this factor each step back toward their source. */
const RIPPLE_RATIO = 0.63;

const SIGILS = [
  { id: "deep", firstRipple: 0.78, rippleCount: 3, sources: [90] },
  { id: "flat", firstRipple: 0.68, rippleCount: 3, sources: [180, 0] },
  { id: "char", firstRipple: 0.62, rippleCount: 3, sources: [-90, 30, 150] },
];

function buildCircles({ firstRipple, rippleCount, sources }) {
  const circles = [{ radius: 1, x: 0, y: 0 }];

  for (const angleDegrees of sources) {
    const angle = (angleDegrees * Math.PI) / 180;
    const sourceX = Math.cos(angle);
    const sourceY = Math.sin(angle);

    for (let index = 0; index < rippleCount; index += 1) {
      const radius = firstRipple * RIPPLE_RATIO ** index;

      /* A wavefront of radius r that still touches its source on the rim has
         its centre r in from that point along the radius. */
      circles.push({
        radius,
        x: sourceX * (1 - radius),
        y: sourceY * (1 - radius),
      });
    }
  }

  return circles;
}

function renderSigil(sigil) {
  const circles = buildCircles(sigil);
  const peaks = new Float64Array(circles.length);
  const rows = [];

  for (let row = 0; row < ROWS; row += 1) {
    let line = "";

    for (let column = 0; column < COLUMNS; column += 1) {
      peaks.fill(0);

      for (let sampleY = 0; sampleY < SUPERSAMPLES; sampleY += 1) {
        for (let sampleX = 0; sampleX < SUPERSAMPLES; sampleX += 1) {
          const u = (column + (sampleX + 0.5) / SUPERSAMPLES) / COLUMNS;
          const v = (row + (sampleY + 0.5) / SUPERSAMPLES) / ROWS;
          const x = (u * 2 - 1) * VIEW;
          const y = (1 - v * 2) * VIEW;

          for (let index = 0; index < circles.length; index += 1) {
            const circle = circles[index];
            const distance = Math.abs(
              Math.hypot(x - circle.x, y - circle.y) - circle.radius,
            );
            const edge =
              (distance - STROKE_HALF) / (STROKE_HALF * EDGE_SOFTNESS);
            const value =
              edge <= 0 ? 1 : edge >= 1 ? 0 : 1 - edge * edge * (3 - 2 * edge);

            if (value > peaks[index]) {
              peaks[index] = value;
            }
          }
        }
      }

      /* Each wavefront contributes how strongly it passes through this cell,
         not how much of the cell's area it fills. Area would make horizontal
         arcs render far fainter than vertical ones, because a glyph cell is
         twice as tall as it is wide. Summing the per-wavefront peaks keeps one
         stroke the same weight in every direction, and still lets two
         wavefronts crossing the same cell sum into a denser glyph. */
      let field = 0;

      for (const peak of peaks) {
        field += peak;
      }

      const tone =
        field <= TONE_FLOOR ? 0 : 1 - Math.exp(-field * INTERFERENCE_GAIN);

      line += RAMP[Math.round(tone * (RAMP.length - 1))];
    }

    rows.push(line.replace(/\s+$/, "").padEnd(COLUMNS, " "));
  }

  return rows;
}

const rendered = SIGILS.map((sigil) => ({
  id: sigil.id,
  rows: renderSigil(sigil),
}));

if (process.argv.includes("--print")) {
  for (const { id, rows } of rendered) {
    console.log(`\n${id}`);
    console.log(rows.map((row) => `|${row}|`).join("\n"));
  }
}

const outputPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/background/vault-sigils.ts",
);
const body = rendered
  .map(
    ({ id, rows }) =>
      `  ${id}: [\n${rows.map((row) => `    ${JSON.stringify(row)},`).join("\n")}\n  ],`,
  )
  .join("\n");

writeFileSync(
  outputPath,
  `/* GENERATED by scripts/generate-vault-sigils.mjs — do not edit by hand.

   Outer Wilds vault-lock sigils quantised against a subset of the site's
   ASCII ramp (" .,:;irsXA253hMHGS#9B&@"). Each is a circle of water with
   ripple sources on its rim; the source count is the mode index: one for
   DEEP, two for FLAT, three for CHAR. Crossing wavefronts sum, so they
   quantise to denser glyphs where they interfere.

   The grid is ${COLUMNS} columns by ${ROWS} rows, and .rm-art's font-size is what maps
   that onto a round mark — re-run the script and adjust that rule together. */
export const VAULT_SIGILS = {
${body}
} as const;
`,
);
console.log(`wrote ${outputPath}`);
