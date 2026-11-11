import { COLOR_PALETTE_STR } from "../../theme/colors";

export type VolumetricStarfieldMode = "3d" | "ascii";

export interface StarfieldOrbitWell {
  distance: number;
  position: number;
  rotationDirection: -1 | 1;
  side: "bottom" | "left" | "right" | "top";
  weight: number;
}

/* The only values a render mode may change. Everything else about the
   starfield (how many bodies there are, how deep they sit, how they move) is
   shared, so ASCII is DEEP seen through a different lens and can never drift
   away from it. Add a field here only when a mode truly needs its own value;
   tests/e2e/background-modes.spec.ts asserts that nothing else differs. */
export interface VolumetricReframe {
  // True pins the layout to the seeds below instead of a fresh one per visit.
  useDeterministicLayout: boolean;
  // Multiplies every star's size.
  starScale: number;
  // Multiplies every planet sprite's size.
  planetScale: number;
  /* Shifts the whole planet depth range along z. Negative pushes planets
     away from the camera, which is how a mode that enlarges its planets
     keeps the nearest ones from filling the screen. */
  planetDepthOffset: number;
  /* Multiplies the planet density. Pushing the depth range back enlarges
     the space the planets fill, which would otherwise add planets. */
  planetDensityScale: number;
  /* Multiplies the planets' small-screen density boost. A mode that draws
     larger sprites fills a phone screen sooner, so it takes less of it. */
  planetSmallScreenBoostScale: number;
  // Colour multiplied into every planet. White leaves the art untouched.
  planetTint: string;
  planetMaxOpacity: number;
  /* Colour a planet fades toward at the far end of the distance haze. White
     switches the haze off. */
  planetFarTint: string;
}

export const VOLUMETRIC_REFRAMES = {
  "3d": {
    useDeterministicLayout: false,
    starScale: 1.315,
    planetScale: 1,
    planetDepthOffset: 0,
    planetDensityScale: 1,
    planetSmallScreenBoostScale: 1,
    planetTint: "#ffffff",
    planetMaxOpacity: 1,
    planetFarTint: "#7480ad",
  },
  ascii: {
    // The glyph filter reads best over one fixed, repeatable composition.
    useDeterministicLayout: true,
    /* Glyph cells are coarse, so everything is drawn larger and the planets
       sit farther back to make room. */
    starScale: 2.5,
    planetScale: 2.35,
    planetDepthOffset: -4.1,
    // Cancels the extra space the offset adds, so ASCII draws as many planets
    // as DEEP does on the same screen (within about 1% on laptops and
    // desktops). Re-derive it if the planet depth band or offset changes.
    planetDensityScale: 0.68,
    // The enlarged sprites already crowd a phone; the full boost turns the
    // glyph field into one unbroken texture.
    planetSmallScreenBoostScale: 0.4,
    // Dimmed so planets sit behind the menu's glyphs instead of fighting them.
    planetTint: "#a5afbf",
    planetMaxOpacity: 0.78,
    /* No haze: the glyph filter turns any further darkening into missing
       characters instead of distance. */
    planetFarTint: "#ffffff",
  },
} as const satisfies Record<VolumetricStarfieldMode, VolumetricReframe>;

/* Builds one mode's complete tuning. Each call returns its own objects, so a
   mode's tuning can be inspected or compared without aliasing the other's.

   The true 2D renderer has its own pixel-space controls in
   starfield2d/starfield2d.constants.ts and does not use these profiles. */
/* Where the small-screen density boost starts and stops, as window area in
   CSS pixels (width x height). Stars and planets share these two points by
   default; each population's `smallScreenBoost` may override them. */
const SMALL_SCREEN_RAMP = {
  fullBoostAreaPx: 250_000,
  noBoostAreaPx: 1_200_000,
} as const;

function createVolumetricTuning(reframe: VolumetricReframe) {
  return {
    /* False generates one fresh entropy seed per page load, then keeps that
     layout stable for the entire session. True uses the star/planet seeds
     below, which is useful for reproducible screenshots and debugging. */
    useDeterministicLayout: reframe.useDeterministicLayout,
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
      /* How many stars exist. The count follows the size of the space they
       fill, so a narrow phone and a wide monitor show the same density of
       stars instead of the same number squeezed in or spread thin. */
      population: {
        /* Average stars per 1000 cubic world units of the star field (the
         slab of space, a little wider than the view, between the two
         depths of `depthBand`). Raise it for a busier sky. */
        densityPer1000CubicUnits: 23.3,
        /* Ceiling for very wide displays, and the size the instance buffers
         are allocated at. A 16:10 window uses about 10,000; this is only
         reached beyond roughly a 2.7:1 window. */
        maximumCount: 24000,
        /* Where along the depth band stars gather. 0 fills space evenly, so
         most stars sit far away simply because there is more room there.
         Positive values pull the population toward the camera (2 spreads
         it evenly by distance); negative values push it deeper. */
        cameraBias: 0.5,
        /* Extra density on small screens, where the same density reads as
         sparse because so little of the sky fits in the window. */
        smallScreenBoost: {
          /* How much denser the smallest screens are: 0.44 draws 44% more
           stars than `densityPer1000CubicUnits` asks for. 0 turns it off. */
          boost: 0.44,
          /* Window area (CSS width x height) at or below which the full
           boost applies. 250,000 is a 375 x 667 phone. */
          fullBoostAreaPx: SMALL_SCREEN_RAMP.fullBoostAreaPx,
          /* Window area at or above which there is no boost. In between the
           boost eases off smoothly. Keep it under 1,296,000 (1440 x 900) to
           leave laptops and desktops at the plain density. */
          noBoostAreaPx: SMALL_SCREEN_RAMP.noBoostAreaPx,
        },
      },
      // Final multiplier applied after the sampled world-space star size.
      visualScale: reframe.starScale,
      // Instance colors, selected deterministically for individual stars.
      colors: [
        COLOR_PALETTE_STR.white,
        COLOR_PALETTE_STR.mutedWhite,
        COLOR_PALETTE_STR.softGray,
        COLOR_PALETTE_STR.dimBlueGray,
        COLOR_PALETTE_STR.fadedBlue,
      ],
      // World-space glyph size distribution before `visualScale` is applied.
      /* The star band sits about 3.57 times farther away than it once did,
       so sizes carry the same factor to stay the same on screen. */
      size: {
        mean: 0.014 * 3.57,
        stdDev: 0.005 * 3.57,
        min: 0.005 * 3.57,
        max: 0.03 * 3.57,
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
      /* How many planets exist. As with the stars, the count follows the size
       of the space they fill rather than being a fixed number. */
      population: {
        /* Average planets per 1000 cubic world units of the planet field.
         Raise it for a busier scene. */
        densityPer1000CubicUnits: 24 * reframe.planetDensityScale,
        /* Ceiling for very wide displays. A 16:10 window uses about 640, 16:9
         about 730 and a 21:9 ultrawide about 1,100; this is only reached
         beyond roughly a 2.8:1 window, the same point as the star ceiling.
         Re-derive it if the density or depth band changes. */
        maximumCount: 1450,
        /* Where along the depth band planets gather. 0 fills space evenly,
         which leaves almost nothing nearby; 2 spreads planets evenly by
         distance. Raise it for more large near planets, lower it for a
         deeper field of small far ones. */
        cameraBias: 2.5,
        /* Extra density on small screens; see the star population above for
         what each value does. */
        smallScreenBoost: {
          boost: 0.22 * reframe.planetSmallScreenBoostScale,
          fullBoostAreaPx: SMALL_SCREEN_RAMP.fullBoostAreaPx,
          noBoostAreaPx: SMALL_SCREEN_RAMP.noBoostAreaPx,
        },
      },
      // Final multiplier applied to sampled planet sprite dimensions.
      visualScale: reframe.planetScale,
      // World units represented by one source-atlas pixel.
      pixelsToWorldUnit: 0.0048,
      // White and 1 leave sprites at their source colours and full opacity.
      tint: reframe.planetTint,
      maxOpacity: reframe.planetMaxOpacity,
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
        nearestZ: 2.75 + reframe.planetDepthOffset,
        farthestZ: -26.75 + reframe.planetDepthOffset,
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
          nearestZ: 2.75 + reframe.planetDepthOffset,
          farthestZ: -32 + reframe.planetDepthOffset,
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
        startZ: -2 + reframe.planetDepthOffset,
        endZ: -23 + reframe.planetDepthOffset,
        // White switches the haze off.
        farTint: reframe.planetFarTint,
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
  } as const;
}

export const VOLUMETRIC_STARFIELD_TUNING = {
  "3d": createVolumetricTuning(VOLUMETRIC_REFRAMES["3d"]),
  ascii: createVolumetricTuning(VOLUMETRIC_REFRAMES.ascii),
};

export type VolumetricStarfieldTuning =
  (typeof VOLUMETRIC_STARFIELD_TUNING)[VolumetricStarfieldMode];
export type VolumetricStarTuning = VolumetricStarfieldTuning["stars"];
export type VolumetricPlanetTuning = VolumetricStarfieldTuning["planets"];

/* Mesh buffers are allocated once at the largest configured population. Mode
   switches only change the active deterministic population; they do not force
   Three.js to replace the instance buffers. */
export const MAX_VOLUMETRIC_STAR_COUNT = Math.max(
  VOLUMETRIC_STARFIELD_TUNING["3d"].stars.population.maximumCount,
  VOLUMETRIC_STARFIELD_TUNING.ascii.stars.population.maximumCount,
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

/* How large each kind of body looks, as a fraction of its sprite frame. Many
   sprites are mostly empty frame around a small body (a ringed giant, a black
   hole, a galaxy), so frame size alone says little about apparent size.
   Measured from the art: the radius of a disc with the same opaque area. */
export const PLANET_VISUAL_RADIUS = {
  astroid: 0.5,
  "black-hole": 0.43,
  galaxy: 0.41,
  "gas-giant-1": 1,
  "gas-giant-2": 0.4,
  "ice-world": 1,
  islands: 1,
  "lava-world": 1,
  "no-atmosphere": 1,
  star: 0.5,
  "terran-dry": 1,
  "terran-wet": 1,
} as const satisfies Record<PlanetType, number>;

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
