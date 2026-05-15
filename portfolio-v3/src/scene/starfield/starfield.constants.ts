import { COLOR_PALETTE_STR } from "../../theme/colors";

// Background z-depth bands. Planets live behind the UI, and stars live behind
// every planet. That means depth testing naturally lets opaque planet pixels
// cover stars while transparent sprite edges still reveal stars behind them.
export const STARFIELD_DEPTH = {
  planets: {
    nearestZ: -1.35,
    farthestZ: -7.8,
  },
  stars: {
    nearestZ: -8.8,
    farthestZ: -16,
  },
} as const;

// Extra world-space padding around the visible camera plane before objects are
// hidden. This prevents objects from popping out right at the screen edge.
export const STARFIELD_BOUNDS = {
  edgeBuffer: 0.75,
  fieldRadiusMultiplier: 1.25,
} as const;

// Orbit centers are generated from the current visible bounds, not fixed world
// coordinates. side decides which viewport edge the invisible center sits
// beyond, position moves it along that edge, and distance pushes it farther
// outside by a fraction of the generated field radius.
export const STARFIELD_ORBIT_WELLS = [
  { side: "left", position: 0.18, distance: 0.28, weight: 1 },
  { side: "left", position: 0.72, distance: 0.28, weight: 1 },
  { side: "right", position: 0.28, distance: 0.28, weight: 1 },
  { side: "right", position: 0.78, distance: 0.28, weight: 1 },
  { side: "top", position: 0.32, distance: 0.24, weight: 1 },
  { side: "top", position: 0.82, distance: 0.24, weight: 1 },
  { side: "bottom", position: 0.24, distance: 0.24, weight: 1 },
  { side: "bottom", position: 0.68, distance: 0.24, weight: 1 },
] as const;

// Star palette inherited from v2. The instance color picks from these values
// while material buckets provide the broader emissive intensity difference.
export const STAR_COLORS = [
  COLOR_PALETTE_STR.white,
  COLOR_PALETTE_STR.mutedWhite,
  COLOR_PALETTE_STR.softGray,
  COLOR_PALETTE_STR.dimBlueGray,
  COLOR_PALETTE_STR.fadedBlue,
] as const;

// Deterministic instanced stars. Values marked mean/stdDev are sampled with a
// clipped normal distribution, so most stars cluster near the mean while a few
// outliers create natural variation.
export const STARS = {
  seed: 48017,
  virtualCount: 10000,
  size: {
    mean: 0.014,
    stdDev: 0.005,
    min: 0.005,
    max: 0.03,
  },
  emissiveIntensity: {
    mean: 0.46,
    stdDev: 0.11,
    min: 0.22,
    max: 0.72,
    buckets: [0.26, 0.38, 0.5, 0.62, 0.72],
  },
  depth: {
    mean: 0.58,
    stdDev: 0.22,
    min: 0,
    max: 1,
  },
  angularSpeedRadiansPerSecond: {
    mean: 0.022,
    stdDev: 0.008,
    min: 0.006,
    max: 0.044,
  },
  minOrbitRadiusRatio: 0.34,
} as const;

export const PLANET_TYPES = [
  "astroid",
  "black-hole",
  "galaxy",
  "gas-giant-1",
  "gas-giant-2",
  "ice-world",
  "islands",
  "lava-world",
  "no-atmosphere",
  "star",
  "terran-dry",
  "terran-wet",
] as const;

export type PlanetType = (typeof PLANET_TYPES)[number];

// Planet planes use the existing v2 spritesheets from public assets. They are
// loaded progressively so the background can start with stars and then populate
// planets as each atlas becomes ready.
export const PLANETS = {
  seed: 73091,
  variantsPerType: 5,
  virtualCount: 300,
  assetBasePath: "rotating-planet-spritesheets",
  pixelsToWorldUnit: 0.0048,
  fadeInSeconds: 1.15,
  visibilityBuffer: 1.4,
  minOrbitRadiusRatio: 0.42,
  sizeScale: {
    mean: 0.9,
    stdDev: 0.18,
    min: 0.58,
    max: 1.28,
  },
  depth: {
    mean: 0.5,
    stdDev: 0.2,
    min: 0,
    max: 1,
  },
  angularSpeedRadiansPerSecond: {
    mean: 0.012,
    stdDev: 0.005,
    min: 0.003,
    max: 0.026,
  },
  frameRate: {
    mean: 5,
    stdDev: 1.6,
    min: 2,
    max: 9,
  },
  rotation: {
    // The spritesheets are painted as if the light comes from the upper-left
    // corner. In local plane coordinates that direction is 135 degrees.
    illuminatedDirectionRadians: (Math.PI * 3) / 4,
    // Higher values make sprites align to the gravity-field light direction
    // faster. Keep this gentle so highlights do not appear to spin.
    damping: 4.5,
  },
} as const;
