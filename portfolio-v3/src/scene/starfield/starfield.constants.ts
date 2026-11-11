import { COLOR_PALETTE_STR } from "../../theme/colors";

export type VolumetricStarfieldMode = "3d" | "ascii";

export interface StarfieldOrbitWell {
  distance: number;
  position: number;
  rotationDirection: -1 | 1;
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
    /* False generates one fresh entropy seed per page load, then keeps that
       layout stable for the entire session. True uses the star/planet seeds
       below, which is useful for reproducible screenshots and debugging. */
    useDeterministicLayout: false,
    bounds: {
      // Extra world-space padding before stars are culled at a viewport edge.
      edgeBuffer: 0.75,
      // Multiplies half the viewport diagonal to establish every orbit radius.
      fieldRadiusMultiplier: 1.25,
    },
    /* Invisible gravity wells sit just beyond the viewport. `position` moves a
       well along its edge, `distance` pushes it outward by a fraction of the
       field radius, `weight` is its relative mass/influence, and
       `rotationDirection` establishes the well's dominant orbital flow. */
    orbitWells: [
      {
        side: "left",
        position: 0.18,
        distance: 0.28,
        weight: 1,
        rotationDirection: 1,
      },
      {
        side: "left",
        position: 0.72,
        distance: 0.28,
        weight: 1,
        rotationDirection: -1,
      },
      {
        side: "right",
        position: 0.28,
        distance: 0.28,
        weight: 1,
        rotationDirection: -1,
      },
      {
        side: "right",
        position: 0.78,
        distance: 0.28,
        weight: 1,
        rotationDirection: 1,
      },
      {
        side: "top",
        position: 0.32,
        distance: 0.24,
        weight: 1,
        rotationDirection: -1,
      },
      {
        side: "top",
        position: 0.82,
        distance: 0.24,
        weight: 1,
        rotationDirection: 1,
      },
      {
        side: "bottom",
        position: 0.24,
        distance: 0.24,
        weight: 1,
        rotationDirection: 1,
      },
      {
        side: "bottom",
        position: 0.68,
        distance: 0.24,
        weight: 1,
        rotationDirection: -1,
      },
    ] satisfies readonly StarfieldOrbitWell[],
    stars: {
      // Deterministic star seed; used only when the profile flag above is true.
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
      /* The star band sits several times farther away than it once did, so
         sizes are scaled up by the same factor to stay the same on screen. */
      size: {
        mean: 0.014 * 4.7,
        stdDev: 0.005 * 4.7,
        min: 0.005 * 4.7,
        max: 0.03 * 4.7,
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
         therefore render smaller under the perspective camera. The whole
         band lies beyond the deepest planet: stars are the backdrop, so they
         drift slowest and shift least when the camera moves. Its far edge
         must stay inside the camera's far plane. */
      depthBand: {
        nearestZ: -33,
        farthestZ: -88,
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
      orbitalMotion: {
        /* 0 restores independently sampled angular speeds. 1 applies the full
           circular-orbit relationship omega ∝ radius^-1.5. Intermediate values
           retain some cinematic motion while making distant stars feel deep. */
        keplerianFalloffInfluence: 0.82,
        // The depth and radius where the sampled speed above is unchanged.
        referenceDepthZ: -3.5,
        referenceOrbitRadiusRatio: 0.7,
        /* Safety rails around the physical multiplier. The floor deliberately
           keeps the farthest stars moving; the ceiling prevents near fly-bys. */
        minimumSpeedMultiplier: 0.2,
        maximumSpeedMultiplier: 1.35,
        // Absolute motion rails after all radius and well-mass adjustments.
        minimumAngularSpeedRadiansPerSecond: 0.0015,
        maximumAngularSpeedRadiansPerSecond: 0.038,
        /* A value of 1 uses sqrt(well weight), as circular-orbit velocity does
           for central mass. 0 makes well weight irrelevant to orbital speed. */
        wellMassInfluence: 1,
        /* Bodies around one well mostly share angular momentum. Lower this
           toward 0.5 for the old evenly mixed clockwise/counterclockwise flow. */
        coherentDirectionProbability: 0.86,
      },
      // Prevents stars from clustering at the center of an orbit well.
      minOrbitRadiusRatio: 0.34,
      /* Smooth brightness shimmer. A twinkling star follows two slow sine
         waves whose periods never line up, so its brightness drifts
         continuously and never visibly repeats. Nothing steps: the change
         from one frame to the next is a fraction of a percent. */
      twinkle: {
        // Share of stars that twinkle at all. 0 disables the effect.
        starFraction: 0.5,
        /* Length of the slower wave, sampled per star. The quicker wave runs
           the golden ratio faster. */
        periodSeconds: { min: 3, max: 7 },
        /* Largest swing either side of a star's own brightness, sampled per
           star: 0.3 drifts between 70% and 130%. */
        amplitude: { min: 0.15, max: 0.38 },
      },
    },
    planets: {
      // Deterministic planet seed; used only when the profile flag above is true.
      seed: 73091,
      /* Candidate population; raising it increases visible planet density.
         Sized so the deep field adds small far planets without thinning out
         the large near ones. */
      virtualCount: 400,
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
        nearestZ: 2.75,
        farthestZ: -18.75,
      },
      /* How planets fill the depth band. The view widens with distance, so a
         field that reads as deep holds a few large near bodies and many
         small far ones. 0 spreads planets evenly by distance from the
         camera; 2 would fill the viewing volume evenly, which leaves almost
         nothing nearby. */
      depthDistribution: {
        densityExponent: 0.15,
      },
      // Orbital angular velocity distribution in radians per second.
      angularSpeedRadiansPerSecond: {
        mean: 0.012,
        stdDev: 0.005,
        min: 0.003,
        max: 0.026,
      },
      orbitalMotion: {
        /* Near planets sweep past and far ones drift: the difference in pace
           is one of the strongest cues that the field has depth. */
        keplerianFalloffInfluence: 0.68,
        referenceDepthZ: -3.5,
        referenceOrbitRadiusRatio: 0.7,
        minimumSpeedMultiplier: 0.3,
        maximumSpeedMultiplier: 1.5,
        minimumAngularSpeedRadiansPerSecond: 0.0015,
        maximumAngularSpeedRadiansPerSecond: 0.024,
        wellMassInfluence: 1,
        coherentDirectionProbability: 0.9,
      },
      /* Every planet follows a Kepler ellipse with its well at one focus, timed
         by Kepler's equation so it sweeps equal areas in equal times: quicker
         near the well, slower at the far end of its orbit. */
      orbitShape: {
        // Half-normal spread of orbital eccentricity. 0 restores circles.
        eccentricityStdDev: 0.18,
        maximumEccentricity: 0.45,
        /* Small bodies ride long comet-like ellipses, as real asteroids and
           comets do, rather than the near-circles planets settle into. */
        cometTypes: ["astroid"] satisfies readonly PlanetType[],
        cometEccentricity: { min: 0.5, max: 0.75 },
        /* Tilt of each orbital plane out of the screen plane. This is what
           carries a planet toward and away from the camera along its path.
           0 restores flat, constant-depth orbits. */
        inclinationStdDevDegrees: 45,
        maximumInclinationDegrees: 65,
        /* 0 aims each orbit's line of nodes in a random direction. 1 aims it
           from the well at the screen centre, which spends the whole depth
           change on the stretch of orbit a visitor can actually see. */
        nodeAlignment: 0.6,
        /* Turns the ellipse itself makes per orbit (apsidal precession), so
           no path ever exactly repeats. */
        apsidalPrecessionPerOrbit: { min: 0.03, max: 0.09 },
        /* A tilted orbit is flattened until it stays inside these depths.
           `nearestZ` matches the depth band, so the largest planet on screen
           is no larger than it was with constant-depth orbits. */
        depthLimits: {
          nearestZ: 2.75,
          farthestZ: -32,
          /* Largest swing toward the camera, as a share of the planet's own
             distance. Keeps a far planet's swing in proportion instead of
             letting it cross the whole field. */
          maximumSwingRatio: 0.38,
        },
      },
      /* Distance haze. Between these depths a planet blends from its source
         colours toward `farTint`, so near bodies stay vivid and far ones
         recede into the background they are drifting through. */
      depthShading: {
        startZ: -2,
        endZ: -24,
        farTint: "#7480ad",
      },
      /* Small bodies captured by a large one: moons around a ringed giant,
         planets around a star, debris around a black hole. Kept rare: every
         system is a tight cluster, and too many of them make the whole field
         read as bunched. */
      satellites: {
        /* Which bodies can hold a system, and how far each one's solid body
           reaches as a fraction of half its sprite width (measured from the
           art: a star's disc, a giant inside its rings, a black hole inside
           its wisps). Orbits are sized to stay outside that body, so a moon
           is never hidden behind its own host. */
        hostBodyRadius: {
          star: 0.56,
          "gas-giant-2": 0.36,
          "black-hole": 0.45,
        } satisfies Partial<Record<PlanetType, number>>,
        satelliteTypes: [
          "astroid",
          "ice-world",
          "islands",
          "lava-world",
          "no-atmosphere",
          "terran-dry",
          "terran-wet",
        ] satisfies readonly PlanetType[],
        // Share of eligible hosts that hold a system at all.
        systemProbability: 0.1,
        maximumSatellitesPerHost: 2,
        // Shrinks a captured body so it reads as smaller than its host.
        sizeMultiplier: 0.6,
        /* Gap left between the host's body and the innermost moon's edge at
           its closest approach on screen, in host radii. */
        innerClearanceInHostRadii: { min: 0.08, max: 0.35 },
        /* Added per further moon. Wider than a moon, so two moons of one
           system never cover each other either. */
        orbitSpacingInHostRadii: { min: 0.55, max: 0.75 },
        /* Period of an orbit one host radius out. Wider orbits slow down by
           Kepler's third law, period ∝ radius^1.5. */
        referencePeriodSeconds: { min: 16, max: 34 },
        /* Tilt of a system's plane away from face-on. Steeper tilts need a
           wider orbit to clear the host, so this stays moderate. */
        tiltDegrees: { min: 25, max: 42 },
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
    /* These values preserve the pre-separation ASCII composition and styling.
       They are deliberately duplicated instead of inheriting from 3D so future
       3D experiments cannot alter ASCII density, scale, depth, or motion. */
    // Preserve the established curated ASCII composition by default.
    useDeterministicLayout: true,
    bounds: {
      edgeBuffer: 0.75,
      fieldRadiusMultiplier: 1.25,
    },
    orbitWells: [
      {
        side: "left",
        position: 0.18,
        distance: 0.28,
        weight: 1,
        rotationDirection: 1,
      },
      {
        side: "left",
        position: 0.72,
        distance: 0.28,
        weight: 1,
        rotationDirection: -1,
      },
      {
        side: "right",
        position: 0.28,
        distance: 0.28,
        weight: 1,
        rotationDirection: -1,
      },
      {
        side: "right",
        position: 0.78,
        distance: 0.28,
        weight: 1,
        rotationDirection: 1,
      },
      {
        side: "top",
        position: 0.32,
        distance: 0.24,
        weight: 1,
        rotationDirection: -1,
      },
      {
        side: "top",
        position: 0.82,
        distance: 0.24,
        weight: 1,
        rotationDirection: 1,
      },
      {
        side: "bottom",
        position: 0.24,
        distance: 0.24,
        weight: 1,
        rotationDirection: 1,
      },
      {
        side: "bottom",
        position: 0.68,
        distance: 0.24,
        weight: 1,
        rotationDirection: -1,
      },
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
      orbitalMotion: {
        keplerianFalloffInfluence: 0.82,
        referenceDepthZ: -3.5,
        referenceOrbitRadiusRatio: 0.7,
        minimumSpeedMultiplier: 0.2,
        maximumSpeedMultiplier: 1.35,
        minimumAngularSpeedRadiansPerSecond: 0.0015,
        maximumAngularSpeedRadiansPerSecond: 0.038,
        wellMassInfluence: 1,
        coherentDirectionProbability: 0.86,
      },
      minOrbitRadiusRatio: 0.34,
      /* Smooth brightness shimmer. A twinkling star follows two slow sine
         waves whose periods never line up, so its brightness drifts
         continuously and never visibly repeats. Nothing steps: the change
         from one frame to the next is a fraction of a percent. */
      twinkle: {
        // Share of stars that twinkle at all. 0 disables the effect.
        starFraction: 0.5,
        /* Length of the slower wave, sampled per star. The quicker wave runs
           the golden ratio faster. */
        periodSeconds: { min: 3, max: 7 },
        /* Largest swing either side of a star's own brightness, sampled per
           star: 0.3 drifts between 70% and 130%. */
        amplitude: { min: 0.15, max: 0.38 },
      },
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
      orbitalMotion: {
        keplerianFalloffInfluence: 0.62,
        referenceDepthZ: -3.5,
        referenceOrbitRadiusRatio: 0.7,
        minimumSpeedMultiplier: 0.38,
        maximumSpeedMultiplier: 1.4,
        minimumAngularSpeedRadiansPerSecond: 0.0015,
        maximumAngularSpeedRadiansPerSecond: 0.024,
        wellMassInfluence: 1,
        coherentDirectionProbability: 0.9,
      },
      // Same orbital model as 3D, kept as an independent copy like the rest.
      orbitShape: {
        // Half-normal spread of orbital eccentricity. 0 restores circles.
        eccentricityStdDev: 0.18,
        maximumEccentricity: 0.45,
        /* Small bodies ride long comet-like ellipses, as real asteroids and
           comets do, rather than the near-circles planets settle into. */
        cometTypes: ["astroid"] satisfies readonly PlanetType[],
        cometEccentricity: { min: 0.5, max: 0.75 },
        /* Tilt of each orbital plane out of the screen plane. This is what
           carries a planet toward and away from the camera along its path.
           0 restores flat, constant-depth orbits. */
        inclinationStdDevDegrees: 45,
        maximumInclinationDegrees: 65,
        /* 0 aims each orbit's line of nodes in a random direction. 1 aims it
           from the well at the screen centre, which spends the whole depth
           change on the stretch of orbit a visitor can actually see. */
        nodeAlignment: 0.6,
        /* Turns the ellipse itself makes per orbit (apsidal precession), so
           no path ever exactly repeats. */
        apsidalPrecessionPerOrbit: { min: 0.03, max: 0.09 },
        /* A tilted orbit is flattened until it stays inside these depths.
           `nearestZ` matches the depth band, so the largest planet on screen
           is no larger than it was with constant-depth orbits. */
        depthLimits: {
          nearestZ: -1.35,
          farthestZ: -14,
          // 1 leaves the swing limited only by the two depths above.
          maximumSwingRatio: 1,
        },
      },
      /* Distance haze. Between these depths a planet blends from its source
         colours toward `farTint`, so near bodies stay vivid and far ones
         recede into the background they are drifting through. */
      depthShading: {
        startZ: -3,
        endZ: -12,
        /* White leaves colours untouched. ASCII planets are already dimmed
           by `tint` and `maxOpacity`, and the glyph filter turns any further
           darkening into missing characters instead of distance. */
        farTint: "#ffffff",
      },
      /* Small bodies captured by a large one: moons around a ringed giant,
         planets around a star, debris around a black hole. Kept rare: every
         system is a tight cluster, and too many of them make the whole field
         read as bunched. */
      satellites: {
        /* Which bodies can hold a system, and how far each one's solid body
           reaches as a fraction of half its sprite width (measured from the
           art: a star's disc, a giant inside its rings, a black hole inside
           its wisps). Orbits are sized to stay outside that body, so a moon
           is never hidden behind its own host. */
        hostBodyRadius: {
          star: 0.56,
          "gas-giant-2": 0.36,
          "black-hole": 0.45,
        } satisfies Partial<Record<PlanetType, number>>,
        satelliteTypes: [
          "astroid",
          "ice-world",
          "islands",
          "lava-world",
          "no-atmosphere",
          "terran-dry",
          "terran-wet",
        ] satisfies readonly PlanetType[],
        // Share of eligible hosts that hold a system at all.
        systemProbability: 0.1,
        maximumSatellitesPerHost: 2,
        // Shrinks a captured body so it reads as smaller than its host.
        sizeMultiplier: 0.6,
        /* Gap left between the host's body and the innermost moon's edge at
           its closest approach on screen, in host radii. */
        innerClearanceInHostRadii: { min: 0.08, max: 0.35 },
        /* Added per further moon. Wider than a moon, so two moons of one
           system never cover each other either. */
        orbitSpacingInHostRadii: { min: 0.55, max: 0.75 },
        /* Period of an orbit one host radius out. Wider orbits slow down by
           Kepler's third law, period ∝ radius^1.5. */
        referencePeriodSeconds: { min: 16, max: 34 },
        /* Tilt of a system's plane away from face-on. Steeper tilts need a
           wider orbit to clear the host, so this stays moderate. */
        tiltDegrees: { min: 25, max: 42 },
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
  /* How many variants of each planet type exist in `public/`. This is the
     ceiling; how many a given visitor actually downloads is set by their
     device tier in `scene/device-tier.ts`. */
  variantsPerType: 5,
  assetBasePath: "rotating-planet-spritesheets",
  imageExtension: "webp",
} as const;

export const PLANET_ATLAS_LOADING = {
  // At most this many image atlases may be fetched and decoded at once.
  maximumConcurrentLoads: 2,
  /* Attempts per atlas before it is given up on. A dropped connection during
     startup used to cost the planets for the whole session: the load was
     latched after one pass and nothing ever asked again. */
  maximumAttempts: 3,
  // Backoff before the first retry. Doubles on each further attempt.
  retryBackoffMs: 400,
} as const;
