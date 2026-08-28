/**
 * Generates the ASCII vault sigils used by the render-mode controls.
 *
 * The three marks are built the same way an Outer Wilds vault lock is: an outer
 * boundary circle, N "petal" circles internally tangent to it at evenly spaced
 * points, and inside each petal a family of circles that share that tangent
 * point and shrink geometrically toward it. N is the mode index, so DEEP is the
 * one-petal lock, FLAT the two-petal lock and CHAR the three-petal lock.
 *
 * Everything is drawn analytically and supersampled, then quantised against the
 * same ramp the About modal's portrait uses, so the marks belong to the same
 * visual family as the rest of the site's ASCII art.
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
   sigil needs twice the columns of rows. */
const COLUMNS = 21;
const ROWS = 11;

/** Half-extent of the drawing area in sigil radii; >1 leaves an outer margin. */
const VIEW = 1.08;

/** Samples per axis inside one glyph cell before the tone is quantised. */
const SUPERSAMPLES = 8;

/* Stroke half-width in sigil radii. Tuned by eye: wide enough that an arc
   lands on a glyph in every cell it crosses, narrow enough that the nested
   circles do not merge into one blob where they converge on their pole. */
const STROKE_HALF = 0.045;

/* Softens the falloff either side of a stroke. Lower values give harder,
   blockier edges, which survive the quantisation step far better than a
   photographic ramp would. */
const EDGE_SOFTNESS = 0.9;

/* Cells below this coverage stay blank; the rest are lifted by TONE_GAMMA so a
   grazing arc still lands on a visible glyph. */
const TONE_FLOOR = 0.08;
const TONE_GAMMA = 0.55;

const SIGILS = [
  {
    id: "deep",
    // One petal is the boundary circle itself, so its family reads as a single
    // column of nested circles hanging from the top pole.
    angles: [90],
    nestedCount: 3,
    nestedRatio: 0.6,
    petalRadius: 1,
  },
  {
    id: "flat",
    angles: [180, 0],
    nestedCount: 2,
    nestedRatio: 0.5,
    petalRadius: 0.66,
  },
  {
    id: "char",
    // The third lock adds a circle about the origin, which is what closes the
    // trefoil the three petals cut out of each other.
    angles: [-90, 30, 150],
    centerRadius: 0.34,
    nestedCount: 1,
    nestedRatio: 0.4,
    petalRadius: 0.58,
  },
];

function buildCircles({
  angles,
  centerRadius,
  nestedCount,
  nestedRatio,
  petalRadius,
}) {
  const circles = [{ radius: 1, x: 0, y: 0 }];

  if (centerRadius) {
    circles.push({ radius: centerRadius, x: 0, y: 0 });
  }

  for (const angleDegrees of angles) {
    const angle = (angleDegrees * Math.PI) / 180;
    const tangentX = Math.cos(angle);
    const tangentY = Math.sin(angle);

    for (let index = 0; index < nestedCount; index += 1) {
      const radius = petalRadius * nestedRatio ** index;

      // Internally tangent to the boundary at the petal's own pole.
      circles.push({
        radius,
        x: tangentX * (1 - radius),
        y: tangentY * (1 - radius),
      });
    }
  }

  return circles;
}

function renderSigil(sigil) {
  const circles = buildCircles(sigil);
  const rows = [];

  for (let row = 0; row < ROWS; row += 1) {
    let line = "";

    for (let column = 0; column < COLUMNS; column += 1) {
      let coverage = 0;

      for (let sampleY = 0; sampleY < SUPERSAMPLES; sampleY += 1) {
        for (let sampleX = 0; sampleX < SUPERSAMPLES; sampleX += 1) {
          const u = (column + (sampleX + 0.5) / SUPERSAMPLES) / COLUMNS;
          const v = (row + (sampleY + 0.5) / SUPERSAMPLES) / ROWS;
          const x = (u * 2 - 1) * VIEW;
          const y = (1 - v * 2) * VIEW;
          let nearest = Infinity;

          for (const circle of circles) {
            const distance = Math.abs(
              Math.hypot(x - circle.x, y - circle.y) - circle.radius,
            );

            if (distance < nearest) {
              nearest = distance;
            }
          }

          const edge = (nearest - STROKE_HALF) / (STROKE_HALF * EDGE_SOFTNESS);

          coverage +=
            edge <= 0 ? 1 : edge >= 1 ? 0 : 1 - edge * edge * (3 - 2 * edge);
        }
      }

      coverage /= SUPERSAMPLES * SUPERSAMPLES;
      // Pull faint partial cells up so a thin arc still lands on a real glyph
      // instead of vanishing into a space.
      const tone =
        coverage <= TONE_FLOOR ? 0 : Math.min(1, coverage ** TONE_GAMMA);

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
   ASCII ramp (" .,:;irsXA253hMHGS#9B&@"). The petal count is the mode
   index: one for DEEP, two for FLAT, three for CHAR.

   The grid is ${COLUMNS} columns by ${ROWS} rows, and .rm-art's font-size is what maps
   that onto a round mark — re-run the script and adjust that rule together. */
export const VAULT_SIGILS = {
${body}
} as const;
`,
);
console.log(`wrote ${outputPath}`);
