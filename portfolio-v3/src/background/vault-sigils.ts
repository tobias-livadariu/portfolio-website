import { ASCII_DENSITY_RAMP } from "../utility/ascii-density-ramp";

/**
 * Small, image-like ASCII approximations of the Echoes of the Eye vault seals.
 *
 * This module intentionally renders at import time instead of emitting a
 * generated source file. Its tiny analytic fields are cheap to calculate, and
 * keeping the renderer in `src` means geometry and tone edits update through
 * Vite HMR like every other UI element.
 *
 * Each source emits internally tangent circular wavefronts. Waves belonging to
 * one source are merged before quantisation, so their convergence at the rim
 * stays one clean stroke. Different sources remain additive: their crossings
 * climb the shared About-portrait density ramp and visibly interfere.
 */

export const VAULT_SIGIL_COLUMNS = 63;
export const VAULT_SIGIL_ROWS = 33;

const VIEW = 1.08;
const SUPERSAMPLES = 6;
const STROKE_CORE_CELLS = 0.04;
const STROKE_EDGE_CELLS = 0.42;
const OUTWARD_CAP_FADE_START = 0.12;
const OUTWARD_CAP_FADE_END = 0.72;
const SOURCE_INSET = 0.18;
const SOURCE_CORE_RADIUS = 0.065;
const SOURCE_EDGE_RADIUS = 0.13;
const COVERAGE_FLOOR = 0.035;
const COVERAGE_FULL = 0.3;
const SINGLE_WAVE_TONE = 0.34;
const INTERFERENCE_FLOOR = 0.045;
const INTERFERENCE_FULL = 0.24;
const INTERFERENCE_TONE = 0.34;
const SOURCE_COVERAGE_FLOOR = 0.08;
const SOURCE_COVERAGE_FULL = 0.62;
const GLYPH_TONE_FLOOR = 0.05;

interface Circle {
  radius: number;
  x: number;
  y: number;
}

interface RippleFamily {
  circles: readonly Circle[];
  directionX: number;
  directionY: number;
  sourceColumn: number;
  sourceRow: number;
  sourceX: number;
  sourceY: number;
}

interface SigilDefinition {
  rippleRadii: readonly number[];
  sourceAngles: readonly number[];
}

const SIGIL_DEFINITIONS = {
  deep: {
    rippleRadii: [0.72, 0.48, 0.28],
    sourceAngles: [90],
  },
  flat: {
    rippleRadii: [0.54, 0.34, 0.19],
    sourceAngles: [180, 0],
  },
  char: {
    rippleRadii: [0.5, 0.25],
    sourceAngles: [-90, 30, 150],
  },
} as const satisfies Record<string, SigilDefinition>;

const CELL_WIDTH = (2 * VIEW) / VAULT_SIGIL_COLUMNS;
const CELL_HEIGHT = (2 * VIEW) / VAULT_SIGIL_ROWS;
const RAMP = Array.from(ASCII_DENSITY_RAMP);

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const amount = clampUnit((value - edge0) / (edge1 - edge0));

  return amount * amount * (3 - 2 * amount);
}

function buildRippleFamilies(definition: SigilDefinition) {
  return definition.sourceAngles.map((angleDegrees): RippleFamily => {
    const angle = (angleDegrees * Math.PI) / 180;
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const sourceX = directionX * (1 - SOURCE_INSET);
    const sourceY = directionY * (1 - SOURCE_INSET);

    return {
      circles: definition.rippleRadii.map((radius) => ({
        radius,
        x: directionX * (1 - radius),
        y: directionY * (1 - radius),
      })),
      directionX,
      directionY,
      sourceColumn: Math.min(
        VAULT_SIGIL_COLUMNS - 1,
        Math.floor(((sourceX / VIEW + 1) / 2) * VAULT_SIGIL_COLUMNS),
      ),
      sourceRow: Math.min(
        VAULT_SIGIL_ROWS - 1,
        Math.floor(((1 - sourceY / VIEW) / 2) * VAULT_SIGIL_ROWS),
      ),
      sourceX,
      sourceY,
    };
  });
}

/** Distance to a circle outline measured across glyph cells. */
function cellDistanceToCircle(x: number, y: number, circle: Circle) {
  const dx = x - circle.x;
  const dy = y - circle.y;
  const radialDistance = Math.hypot(dx, dy);

  if (radialDistance === 0) {
    return circle.radius / Math.min(CELL_WIDTH, CELL_HEIGHT);
  }

  /* Project a unit radial step onto the non-square character grid. This makes
     horizontal and vertical arcs deposit the same fraction of a cell. */
  const cellsPerUnit = Math.hypot(
    dx / radialDistance / CELL_WIDTH,
    dy / radialDistance / CELL_HEIGHT,
  );

  return Math.abs(radialDistance - circle.radius) * cellsPerUnit;
}

function circleInk(x: number, y: number, circle: Circle) {
  return (
    1 -
    smoothstep(
      STROKE_CORE_CELLS,
      STROKE_EDGE_CELLS,
      cellDistanceToCircle(x, y, circle),
    )
  );
}

function waveInk(x: number, y: number, circle: Circle, family: RippleFamily) {
  const outwardPosition =
    ((x - circle.x) * family.directionX + (y - circle.y) * family.directionY) /
    circle.radius;
  const capMask =
    1 -
    smoothstep(OUTWARD_CAP_FADE_START, OUTWARD_CAP_FADE_END, outwardPosition);

  return circleInk(x, y, circle) * capMask;
}

function sourceInk(x: number, y: number, family: RippleFamily) {
  const distance = Math.hypot(x - family.sourceX, y - family.sourceY);

  return 1 - smoothstep(SOURCE_CORE_RADIUS, SOURCE_EDGE_RADIUS, distance);
}

function toneToGlyph(tone: number) {
  if (tone < GLYPH_TONE_FLOOR) {
    return " ";
  }

  const visibleTone = clampUnit(
    (tone - GLYPH_TONE_FLOOR) / (1 - GLYPH_TONE_FLOOR),
  );
  const rampIndex = Math.round(visibleTone * (RAMP.length - 1));

  return RAMP[rampIndex] ?? RAMP.at(-1) ?? " ";
}

export function renderVaultSigil(definition: SigilDefinition) {
  const boundary = { radius: 1, x: 0, y: 0 };
  const families = buildRippleFamilies(definition);
  const sampleCount = SUPERSAMPLES * SUPERSAMPLES;
  const familyCoverage = new Float64Array(families.length);
  const rows: string[] = [];

  for (let row = 0; row < VAULT_SIGIL_ROWS; row += 1) {
    let line = "";

    for (let column = 0; column < VAULT_SIGIL_COLUMNS; column += 1) {
      familyCoverage.fill(0);
      let boundaryCoverage = 0;
      let interferenceCoverage = 0;
      let sourceCoverage = 0;

      for (let sampleY = 0; sampleY < SUPERSAMPLES; sampleY += 1) {
        for (let sampleX = 0; sampleX < SUPERSAMPLES; sampleX += 1) {
          const u =
            (column + (sampleX + 0.5) / SUPERSAMPLES) / VAULT_SIGIL_COLUMNS;
          const v = (row + (sampleY + 0.5) / SUPERSAMPLES) / VAULT_SIGIL_ROWS;
          const x = (u * 2 - 1) * VIEW;
          const y = (1 - v * 2) * VIEW;

          boundaryCoverage += circleInk(x, y, boundary);
          let strongestFamilySample = 0;
          let totalFamilySample = 0;
          let strongestSourceSample = 0;

          for (
            let familyIndex = 0;
            familyIndex < families.length;
            familyIndex += 1
          ) {
            const family = families[familyIndex];
            let familySample = 0;

            for (const circle of family.circles) {
              familySample = Math.max(
                familySample,
                waveInk(x, y, circle, family),
              );
            }

            familyCoverage[familyIndex] += familySample;
            strongestFamilySample = Math.max(
              strongestFamilySample,
              familySample,
            );
            totalFamilySample += familySample;
            strongestSourceSample = Math.max(
              strongestSourceSample,
              sourceInk(x, y, family),
            );
          }

          /* Interference exists only where waves overlap inside the same
             supersample. Merely sharing a coarse output cell is not enough. */
          interferenceCoverage += Math.max(
            0,
            totalFamilySample - strongestFamilySample,
          );
          sourceCoverage += strongestSourceSample;
        }
      }

      boundaryCoverage /= sampleCount;
      interferenceCoverage /= sampleCount;
      sourceCoverage /= sampleCount;

      let strongestFamilyCoverage = 0;

      for (
        let familyIndex = 0;
        familyIndex < families.length;
        familyIndex += 1
      ) {
        familyCoverage[familyIndex] /= sampleCount;
        strongestFamilyCoverage = Math.max(
          strongestFamilyCoverage,
          familyCoverage[familyIndex],
        );
      }

      const primaryCoverage = Math.max(
        boundaryCoverage,
        strongestFamilyCoverage,
      );
      const primaryTone =
        smoothstep(COVERAGE_FLOOR, COVERAGE_FULL, primaryCoverage) *
        SINGLE_WAVE_TONE;
      const interferenceTone =
        smoothstep(
          INTERFERENCE_FLOOR,
          INTERFERENCE_FULL,
          interferenceCoverage,
        ) * INTERFERENCE_TONE;
      const markerTone = smoothstep(
        SOURCE_COVERAGE_FLOOR,
        SOURCE_COVERAGE_FULL,
        sourceCoverage,
      );
      const isSourceCell = families.some(
        (family) => family.sourceColumn === column && family.sourceRow === row,
      );

      line += toneToGlyph(
        Math.max(isSourceCell ? 1 : markerTone, primaryTone + interferenceTone),
      );
    }

    rows.push(line.replace(/\s+$/, "").padEnd(VAULT_SIGIL_COLUMNS, " "));
  }

  return rows;
}

export const VAULT_SIGILS = {
  deep: renderVaultSigil(SIGIL_DEFINITIONS.deep),
  flat: renderVaultSigil(SIGIL_DEFINITIONS.flat),
  char: renderVaultSigil(SIGIL_DEFINITIONS.char),
} as const;
