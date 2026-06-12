// The 2D starfield is authored in CSS-pixel coordinates (origin at screen
// center, +y up) inside a camera-following group, so densities and radii from
// the old portfolio-v2 design port over 1:1.
export const STARFIELD_2D = {
  // World units between the camera and the 2D plane. Keeps the plane behind
  // the 3D menu (which sits at z = 0) while staying well inside the far clip.
  planeDistance: 9,
} as const;

export const STARS_2D = {
  densityPerPx2: 2.2e-4,
  minCount: 200,
  maxCount: 1200,
  // Star disc radius relative to half the viewport diagonal. Slightly larger
  // than 1 so the rotating field never exposes empty corners.
  fieldRadiusMultiplier: 1.12,
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
  maxCount: 120,
  // No planets spawn within this radius of the screen center (v2 value),
  // keeping the area behind the menu and modals calm.
  exclusionRadiusPx: 395,
  // Spawn ring outer radius relative to half the viewport diagonal.
  fieldRadiusMultiplier: 1.15,
  // Planets drifting past this multiple of the field radius respawn fresh.
  recycleRadiusMultiplier: 1.25,
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
  selfRotationRadiansPerSecond: {
    min: 0.02,
    max: 0.12,
  },
  initialSpeedPxPerSecond: {
    min: 6,
    max: 18,
  },
  maxSpeedPxPerSecond: 30,
  velocityDampingPerSecond: 0.25,
  // Gentle outward push inside the exclusion radius so wells cannot park
  // planets in the center of the screen.
  centerRepulsionPxPerSecond2: 50,
} as const;

export const GRAVITY_WELLS_2D = {
  count: 5,
  // Softened inverse-square strength, px^3/s^2.
  strength: {
    min: 3.5e5,
    max: 9e5,
  },
  softeningPx: 200,
  // Wells slowly wander around their base position so planet paths never
  // settle into repeating orbits.
  driftAmplitudePx: 140,
  driftRadiansPerSecond: {
    min: 0.03,
    max: 0.08,
  },
  // Base well placement in viewport fractions; the range extends past the
  // screen edges so some wells pull from off-screen.
  placementFraction: {
    min: -0.15,
    max: 1.15,
  },
} as const;
