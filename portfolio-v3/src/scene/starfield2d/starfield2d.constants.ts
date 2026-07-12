// The 2D starfield is authored in CSS-pixel coordinates (origin at screen
// center, +y up) inside a camera-following group, so densities and radii from
// the old portfolio-v2 design port over 1:1.
export const STARFIELD_2D = {
  // World units between the camera and the 2D plane. Keeps the plane behind
  // the 3D menu (which sits at z = 0) while staying well inside the far clip.
  planeDistance: 9,
} as const;

export const STARS_2D = {
  // Values ported from portfolio-v2. Count is calculated from the circular
  // field area rather than the rectangular viewport area.
  densityPerPx2: 13e-4,
  minCount: 900,
  maxCount: 20000,
  // getFieldRadius starts from half the diagonal; 2 recreates v2's full
  // viewport-diagonal radius and prevents corners appearing during rotation.
  fieldRadiusMultiplier: 2,
  // v2's signature slow wheel: the whole field turns 1.8 degrees per second
  // around the screen center.
  orbitRadiansPerSecond: (1.8 * Math.PI) / 180,
  // Pixel sizes with selection weights (most stars are small).
  sizes: [
    { size: 1, weight: 0.5 },
    { size: 2, weight: 0.35 },
    { size: 3, weight: 0.15 },
  ],
  // Local z offset (in px-space units) keeping stars behind planets.
  zOffset: -2,
} as const;

export const PLANETS_2D = {
  densityPerPx2: 3.3e-5,
  minCount: 24,
  maxCount: 320,
  // No planets spawn within this radius of the screen center (v2 value),
  // keeping the area behind the menu and modals calm.
  exclusionRadiusPx: 395,
  // Spawn ring outer radius relative to half the viewport diagonal.
  fieldRadiusMultiplier: 2,
  // v2 sprite animation speed: one 50-frame rotation every 25 seconds.
  framesPerSecond: 2,
  // v2 faded planets in at 0.06 alpha/tick at 60fps.
  fadeInAlphaPerSecond: 3.6,
  sizeScale: {
    mean: 0.8,
    stdDev: 0.25,
    min: 0.4,
    max: 1.4,
  },
  orbitRadiansPerSecond: (1.8 * Math.PI) / 180,
  orbitSpeedVariance: 0.15,
} as const;
