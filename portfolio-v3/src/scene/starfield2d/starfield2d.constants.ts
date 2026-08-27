import { COLOR_PALETTE_STR } from "../../theme/colors";

// The 2D starfield is authored in CSS-pixel coordinates (origin at screen
// center, +y up) inside a camera-following group, so densities and radii from
// the old portfolio-v2 design port over 1:1.
export const STARFIELD_2D = {
  // World units between the camera and the 2D plane. Keeps the plane behind
  // the 3D menu (which sits at z = 0) while staying well inside the far clip.
  planeDistance: 9,
} as const;

export const STARS_2D = {
  // 2D owns its palette so volumetric 3D/ASCII tuning cannot change it.
  colors: [
    COLOR_PALETTE_STR.white,
    COLOR_PALETTE_STR.mutedWhite,
    COLOR_PALETTE_STR.softGray,
    COLOR_PALETTE_STR.dimBlueGray,
    COLOR_PALETTE_STR.fadedBlue,
  ],
  // Values ported from portfolio-v2. Count is calculated from the circular
  // field area rather than the rectangular viewport area.
  densityPerPx2: 21e-4,
  minCount: 1500,
  maxCount: 32000,
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
  // Master population multiplier. Raise/lower this before changing the density
  // baseline; 0 still respects minimumCount unless enabled is false.
  densityMultiplier: 1,
  // Approximate virtual-planet population per million pixels of field area.
  densityPerMegapixel: 52,
  // Master switch for all 2D planets. It does not affect 3D or ASCII modes.
  enabled: true,
  // Hard population ceiling protecting large and ultrawide screens.
  maximumCount: 430,
  // Population floor protecting small screens from looking empty.
  minimumCount: 42,
  // Spawn ring outer radius relative to half the viewport diagonal.
  fieldRadiusMultiplier: 2,
  /* Per-planet atlas playback distribution. This intentionally matches the
     3D and ASCII profiles while remaining independently tunable for 2D. */
  frameRate: {
    // Most planets animate around five atlas frames per second.
    mean: 5,
    // Natural variation prevents the planet rotations from synchronizing.
    stdDev: 1.6,
    // Slowest permitted atlas playback rate.
    min: 2,
    // Fastest permitted atlas playback rate.
    max: 9,
  },
  // v2 faded planets in at 0.06 alpha/tick at 60fps.
  fadeInAlphaPerSecond: 3.6,
  // Extra offscreen distance travelled before an initially fading planet can
  // enter the viewport. Planets then orbit continuously without recycling.
  offscreenSpawnPaddingPx: 32,
  // Multiplier on fade duration when calculating the offscreen angular lead.
  // Values above 1 guarantee the fade completes before the visible boundary.
  offscreenFadeLeadMultiplier: 1.25,
  // Positive local z range assigned from apparent size. Larger planets receive
  // more depth and therefore render above smaller planets when they overlap.
  apparentDepthRangePx: 8,
  // Rotation offset making the source PNG's bright top-left corner face back
  // toward the top-left menu/light source. Three's local Y axis points up, so
  // the correct counterpart to portfolio-v2's Pixi -45 degrees is +45 here.
  lightFacingRotationOffsetDegrees: 45,
  // Natural sprite-size multiplier distribution. A value of 1 uses the source
  // atlas frame's normal size; smaller values read as farther from the viewer.
  sizeScale: {
    // Most planets cluster around this source-frame size multiplier.
    mean: 0.8,
    // Spread around the mean before values are clamped to min/max.
    stdDev: 0.25,
    // Smallest and therefore visually farthest permitted planet.
    min: 0.4,
    // Largest and therefore visually nearest permitted planet.
    max: 1.4,
  },
  orbitSpeed: {
    // Normal angular speed before per-planet variation, in degrees per second.
    baselineDegreesPerSecond: 1.8,
    // 0 is fully random; 1 maps apparent size directly onto relative speed.
    apparentSizeInfluence: 0.68,
    // Fastest possible speed relative to the baseline (1.35 is 35% faster).
    maximumBaselineMultiplier: 1.35,
    // Slowest possible speed relative to the baseline (0.55 is 45% slower).
    minimumBaselineMultiplier: 0.55,
  },
} as const;
