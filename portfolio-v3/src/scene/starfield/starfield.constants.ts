import { COLOR_PALETTE_STR } from "../../theme/colors";

export type VolumetricStarfieldMode = "3d" | "ascii";

export interface StarfieldOrbitWell {
  distance: number;
  position: number;
  side: "bottom" | "left" | "right" | "top";
  weight: number;
}

/* 3D and ASCII intentionally use the same renderer but own completely
   independent tuning profiles. Keep a knob in the relevant profile when
   experimenting: changing `3d` cannot alter the established ASCII scene.

   The true 2D renderer has its own pixel-space controls in
   starfield2d/starfield2d.constants.ts and does not use these profiles. */
export const VOLUMETRIC_STARFIELD_TUNING = {
  "3d": {
    bounds: {
      // Extra world-space padding before stars are culled at a viewport edge.
      edgeBuffer: 0.75,
      // Multiplies half the viewport diagonal to establish every orbit radius.
      fieldRadiusMultiplier: 1.25,
    },
    /* Invisible gravity wells sit just beyond the viewport. `position` moves a
       well along its edge, `distance` pushes it outward by a fraction of the
       field radius, and `weight` controls its lighting/orbit influence. */
    orbitWells: [
      { side: "left", position: 0.18, distance: 0.28, weight: 1 },
      { side: "left", position: 0.72, distance: 0.28, weight: 1 },
      { side: "right", position: 0.28, distance: 0.28, weight: 1 },
      { side: "right", position: 0.78, distance: 0.28, weight: 1 },
      { side: "top", position: 0.32, distance: 0.24, weight: 1 },
      { side: "top", position: 0.82, distance: 0.24, weight: 1 },
      { side: "bottom", position: 0.24, distance: 0.24, weight: 1 },
      { side: "bottom", position: 0.68, distance: 0.24, weight: 1 },
    ] satisfies readonly StarfieldOrbitWell[],
    stars: {
      // Seed for the deterministic star layout. Changing it reshuffles stars.
      seed: 48017,
      // Candidate population; raising it increases visible star density.
      virtualCount: 10000,
      // Final multiplier applied after the sampled world-space star size.
      visualScale: 1,
      // Instance colors, selected deterministically for individual stars.
      colors: [
        COLOR_PALETTE_STR.white,
        COLOR_PALETTE_STR.mutedWhite,
        COLOR_PALETTE_STR.softGray,
        COLOR_PALETTE_STR.dimBlueGray,
        COLOR_PALETTE_STR.fadedBlue,
      ],
      // World-space glyph size distribution before `visualScale` is applied.
      size: {
        mean: 0.014,
        stdDev: 0.005,
        min: 0.005,
        max: 0.03,
      },
      // Brightness distribution and material buckets used to approximate it.
      emissiveIntensity: {
        mean: 0.46,
        stdDev: 0.11,
        min: 0.22,
        max: 0.72,
        buckets: [0.26, 0.38, 0.5, 0.62, 0.72],
      },
      /* Camera-relative z volume. More-negative bands are farther away and
         therefore render smaller under the perspective camera. */
      depthBand: {
        nearestZ: -8.8,
        farthestZ: -16,
      },
      // Distribution from the near (0) to far (1) edge of the depth band.
      depthDistribution: {
        mean: 0.58,
        stdDev: 0.22,
        min: 0,
        max: 1,
      },
      // Orbital angular velocity distribution in radians per second.
      angularSpeedRadiansPerSecond: {
        mean: 0.022,
        stdDev: 0.008,
        min: 0.006,
        max: 0.044,
      },
      // Prevents stars from clustering at the center of an orbit well.
      minOrbitRadiusRatio: 0.34,
    },
    planets: {
      // Seed for the deterministic planet layout and atlas selection.
      seed: 73091,
      // Candidate population; raising it increases visible planet density.
      virtualCount: 300,
      // Final multiplier applied to sampled planet sprite dimensions.
      visualScale: 1,
      // World units represented by one source-atlas pixel.
      pixelsToWorldUnit: 0.0048,
      // Normal 3D sprites retain their source colors and full opacity.
      tint: "#ffffff",
      maxOpacity: 1,
      // Time taken by a newly decoded atlas sprite to reach `maxOpacity`.
      fadeInSeconds: 1.15,
      // Offscreen world-space padding used for visibility and orbit generation.
      visibilityBuffer: 1.4,
      // Prevents planets from clustering at the center of an orbit well.
      minOrbitRadiusRatio: 0.42,
      // Natural variation around each atlas frame's source dimensions.
      sizeScale: {
        mean: 0.9,
        stdDev: 0.18,
        min: 0.58,
        max: 1.28,
      },
      /* Camera-relative z volume. Pulling this band closer makes planets larger;
         pushing it farther away makes them smaller through perspective. */
      depthBand: {
        nearestZ: -1.35,
        farthestZ: -7.8,
      },
      // Distribution from the near (0) to far (1) edge of the depth band.
      depthDistribution: {
        mean: 0.5,
        stdDev: 0.2,
        min: 0,
        max: 1,
      },
      // Orbital angular velocity distribution in radians per second.
      angularSpeedRadiansPerSecond: {
        mean: 0.012,
        stdDev: 0.005,
        min: 0.003,
        max: 0.026,
      },
      // Animated atlas playback speed distribution in frames per second.
      frameRate: {
        mean: 5,
        stdDev: 1.6,
        min: 2,
        max: 9,
      },
      rotation: {
        // Source sprites are painted with light arriving from the upper-left.
        illuminatedDirectionRadians: (Math.PI * 3) / 4,
        // Higher values align sprite lighting with the gravity field faster.
        damping: 4.5,
      },
    },
  },
  ascii: {
    /* These values reproduce the pre-separation ASCII scene exactly. They are
       deliberately duplicated instead of inheriting from 3D so future 3D
       experimentation cannot change ASCII density, scale, depth, or motion. */
    bounds: {
      edgeBuffer: 0.75,
      fieldRadiusMultiplier: 1.25,
    },
    orbitWells: [
      { side: "left", position: 0.18, distance: 0.28, weight: 1 },
      { side: "left", position: 0.72, distance: 0.28, weight: 1 },
      { side: "right", position: 0.28, distance: 0.28, weight: 1 },
      { side: "right", position: 0.78, distance: 0.28, weight: 1 },
      { side: "top", position: 0.32, distance: 0.24, weight: 1 },
      { side: "top", position: 0.82, distance: 0.24, weight: 1 },
      { side: "bottom", position: 0.24, distance: 0.24, weight: 1 },
      { side: "bottom", position: 0.68, distance: 0.24, weight: 1 },
    ] satisfies readonly StarfieldOrbitWell[],
    stars: {
      seed: 48017,
      virtualCount: 10000,
      // Existing ASCII enlargement retained exactly.
      visualScale: 2.5,
      colors: [
        COLOR_PALETTE_STR.white,
        COLOR_PALETTE_STR.mutedWhite,
        COLOR_PALETTE_STR.softGray,
        COLOR_PALETTE_STR.dimBlueGray,
        COLOR_PALETTE_STR.fadedBlue,
      ],
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
      depthBand: {
        nearestZ: -8.8,
        farthestZ: -16,
      },
      depthDistribution: {
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
    },
    planets: {
      seed: 73091,
      virtualCount: 300,
      // Existing ASCII enlargement, neutral tint, and opacity retained exactly.
      visualScale: 2.35,
      pixelsToWorldUnit: 0.0048,
      tint: "#a5afbf",
      maxOpacity: 0.78,
      fadeInSeconds: 1.15,
      visibilityBuffer: 1.4,
      minOrbitRadiusRatio: 0.42,
      sizeScale: {
        mean: 0.9,
        stdDev: 0.18,
        min: 0.58,
        max: 1.28,
      },
      depthBand: {
        nearestZ: -1.35,
        farthestZ: -7.8,
      },
      depthDistribution: {
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
        illuminatedDirectionRadians: (Math.PI * 3) / 4,
        damping: 4.5,
      },
    },
  },
} as const;

export type VolumetricStarfieldTuning =
  (typeof VOLUMETRIC_STARFIELD_TUNING)[VolumetricStarfieldMode];
export type VolumetricStarTuning = VolumetricStarfieldTuning["stars"];
export type VolumetricPlanetTuning = VolumetricStarfieldTuning["planets"];

/* Mesh buffers are allocated once at the largest configured population. Mode
   switches only change the active deterministic population; they do not force
   Three.js to replace the instance buffers. */
export const MAX_VOLUMETRIC_STAR_COUNT = Math.max(
  VOLUMETRIC_STARFIELD_TUNING["3d"].stars.virtualCount,
  VOLUMETRIC_STARFIELD_TUNING.ascii.stars.virtualCount,
);
export const MAX_VOLUMETRIC_STAR_BUCKET_COUNT = Math.max(
  VOLUMETRIC_STARFIELD_TUNING["3d"].stars.emissiveIntensity.buckets.length,
  VOLUMETRIC_STARFIELD_TUNING.ascii.stars.emissiveIntensity.buckets.length,
);

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

// Atlas inventory is shared because both volumetric modes render the same art.
export const PLANET_ATLASES = {
  variantsPerType: 5,
  assetBasePath: "rotating-planet-spritesheets",
} as const;

export const PLANET_ATLAS_LOADING = {
  // At most this many PNG atlases may be fetched and decoded at once.
  maximumConcurrentLoads: 2,
} as const;
