import { COLOR_PALETTE_STR } from "../../theme/colors";

// Shared z-depth band for background objects. The nearest value is still behind
// the menu plane at z=0, so stars/planets add depth without drawing in front of
// the 3D UI.
export const STARFIELD_DEPTH = {
  nearestZ: -1.35,
  farthestZ: -8.5,
} as const;

// Extra world-space padding around the visible camera plane before objects are
// hidden. This prevents objects from popping out right at the screen edge.
export const STARFIELD_BOUNDS = {
  edgeBuffer: 0.75,
  fieldRadiusMultiplier: 1.25,
} as const;

// Offscreen orbit centers expressed as fractions of the generated field radius.
// Keeping the centers outside/near the viewport preserves the v2 orbital soul
// without making every object rotate around the exact same visible point.
export const STARFIELD_ORBIT_WELLS = [
  { x: -0.62, y: 0.56, weight: 0.62 },
  { x: 1.12, y: 0.2, weight: 0.18 },
  { x: -0.18, y: -1.1, weight: 0.2 },
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
  virtualCount: 1800,
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
  minOrbitRadiusRatio: 0.18,
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
  virtualCount: 32,
  assetBasePath: "rotating-planet-spritesheets",
  pixelsToWorldUnit: 0.0048,
  fadeInSeconds: 1.15,
  minOrbitRadiusRatio: 0.34,
  protectedTopLeftNdc: {
    maxX: -0.12,
    minY: 0.18,
  },
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
} as const;
