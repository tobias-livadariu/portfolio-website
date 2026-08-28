import { expect, test } from "@playwright/test";
import {
  ASCII_GRAPH_TRANSITION,
  buildAsciiTransitionField,
} from "../../src/background/ascii-graph-transition";
import {
  getTwoDimensionalVisibleHeight,
  getTwoDimensionalWorldPerPixel,
} from "../../src/scene/canvas.constants";
import { VOLUMETRIC_STARFIELD_TUNING } from "../../src/scene/starfield/starfield.constants";
import { getCinematicOrbitalAngularSpeed } from "../../src/scene/starfield/starfield.math";
import {
  PLANETS_2D,
  STARS_2D,
} from "../../src/scene/starfield2d/starfield2d.constants";
import { COLOR_PALETTE_STR } from "../../src/theme/colors";

const MODE_LABELS = {
  "2d": /FLAT/,
  "3d": /DEEP/,
  ascii: /CHAR/,
} as const;

function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

test("2D planets use the same playback distribution as volumetric modes", () => {
  expect(PLANETS_2D.frameRate).toEqual(
    VOLUMETRIC_STARFIELD_TUNING["3d"].planets.frameRate,
  );
  expect(PLANETS_2D.frameRate).toEqual(
    VOLUMETRIC_STARFIELD_TUNING.ascii.planets.frameRate,
  );
});

test("ASCII transition graph propagates from the renderer to complete faces", () => {
  const field = buildAsciiTransitionField(
    1_440,
    900,
    1_400,
    860,
    createSeededRandom(42),
  );

  expect(field.nodes.length).toBeGreaterThan(100);
  expect(field.edges.length).toBeGreaterThan(field.nodes.length);
  expect(field.faces.length).toBeGreaterThan(field.nodes.length);
  expect(field.nodes[field.seedIndex].startProgress).toBe(0);
  expect(field.nodes[field.goalIndex].startProgress).toBeCloseTo(
    ASCII_GRAPH_TRANSITION.goalFoundProgress,
    10,
  );
  expect(ASCII_GRAPH_TRANSITION.glyphScalePulseHz).toBeLessThan(3);

  for (const node of field.nodes) {
    expect(node.startProgress).toBeGreaterThanOrEqual(0);
    expect(node.startProgress).toBeLessThanOrEqual(1);
  }

  for (const face of field.faces) {
    expect(face.coverProgress).toBe(
      Math.max(
        field.nodes[face.a].startProgress,
        field.nodes[face.b].startProgress,
        field.nodes[face.c].startProgress,
      ),
    );
  }
});

test("volumetric modes own independent tuning and preserve ASCII appearance", () => {
  const threeDimensional = VOLUMETRIC_STARFIELD_TUNING["3d"];
  const ascii = VOLUMETRIC_STARFIELD_TUNING.ascii;

  expect(threeDimensional).not.toBe(ascii);
  expect(threeDimensional.bounds).not.toBe(ascii.bounds);
  expect(threeDimensional.orbitWells).not.toBe(ascii.orbitWells);
  expect(threeDimensional.stars).not.toBe(ascii.stars);
  expect(threeDimensional.planets).not.toBe(ascii.planets);
  expect(threeDimensional.stars.orbitalMotion).not.toBe(
    ascii.stars.orbitalMotion,
  );
  expect(threeDimensional.planets.orbitalMotion).not.toBe(
    ascii.planets.orbitalMotion,
  );
  expect(STARS_2D.colors).not.toBe(ascii.stars.colors);
  expect(threeDimensional.useDeterministicLayout).toBe(false);

  /* The physical-motion properties are intentionally excluded: they may evolve
     without changing the curated ASCII population's composition or styling. */
  const appearanceOnlyAscii = {
    ...ascii,
    orbitWells: ascii.orbitWells.map((well) =>
      Object.fromEntries(
        Object.entries(well).filter(([key]) => key !== "rotationDirection"),
      ),
    ),
    stars: Object.fromEntries(
      Object.entries(ascii.stars).filter(([key]) => key !== "orbitalMotion"),
    ),
    planets: Object.fromEntries(
      Object.entries(ascii.planets).filter(([key]) => key !== "orbitalMotion"),
    ),
  };

  expect(appearanceOnlyAscii).toEqual({
    useDeterministicLayout: true,
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
    ],
    stars: {
      seed: 48017,
      virtualCount: 10000,
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
  });
});

test("volumetric orbital motion slows large distant orbits without freezing them", () => {
  const tuning = VOLUMETRIC_STARFIELD_TUNING["3d"].stars.orbitalMotion;
  const orbitWell = VOLUMETRIC_STARFIELD_TUNING["3d"].orbitWells[0];
  const common = {
    baseAngularSpeed: 0.022,
    cameraZ: 7.25,
    directionRandom: 0,
    orbitWell,
    tuning,
  };
  const nearSpeed = Math.abs(
    getCinematicOrbitalAngularSpeed({
      ...common,
      orbitRadiusRatio: 0.45,
      z: -8.8,
    }),
  );
  const farSpeed = Math.abs(
    getCinematicOrbitalAngularSpeed({
      ...common,
      orbitRadiusRatio: 0.95,
      z: -16,
    }),
  );

  expect(farSpeed).toBeLessThan(nearSpeed);
  expect(farSpeed).toBeGreaterThanOrEqual(
    tuning.minimumAngularSpeedRadiansPerSecond,
  );
  expect(nearSpeed).toBeLessThanOrEqual(
    tuning.maximumAngularSpeedRadiansPerSecond,
  );
});

test("2D pixel-space scale follows the current viewport height", () => {
  const visibleHeight = getTwoDimensionalVisibleHeight();
  const largeViewportHeight = 1440;
  const smallViewportHeight = 844;
  const largeScale = getTwoDimensionalWorldPerPixel(largeViewportHeight);
  const smallScale = getTwoDimensionalWorldPerPixel(smallViewportHeight);

  expect(largeScale * largeViewportHeight).toBeCloseTo(visibleHeight, 10);
  expect(smallScale * smallViewportHeight).toBeCloseTo(visibleHeight, 10);
  expect(smallScale / largeScale).toBeCloseTo(
    largeViewportHeight / smallViewportHeight,
    10,
  );
  expect(Number.isFinite(getTwoDimensionalWorldPerPixel(0))).toBe(true);
});

test("planet atlases load through a bounded, diversity-first queue", async ({
  page,
}) => {
  test.setTimeout(45_000);

  let activeAtlasRequests = 0;
  let maximumActiveAtlasRequests = 0;
  const requestedAtlases: string[] = [];
  const modalPreviewAtlases = new Set([
    "/astroid/astroid-5.webp",
    "/ice-world/ice-world-1.webp",
    "/islands/islands-1.webp",
    "/terran-wet/terran-wet-1.webp",
  ]);

  await page.route(
    "**/rotating-planet-spritesheets/**/*.webp",
    async (route) => {
      const path = new URL(route.request().url()).pathname;

      if ([...modalPreviewAtlases].some((suffix) => path.endsWith(suffix))) {
        await route.continue();
        return;
      }

      requestedAtlases.push(path);
      activeAtlasRequests += 1;
      maximumActiveAtlasRequests = Math.max(
        maximumActiveAtlasRequests,
        activeAtlasRequests,
      );

      try {
        // Keep requests overlapping long enough for the test to observe the
        // loader's actual concurrency limit rather than local-cache timing.
        await new Promise((resolve) => setTimeout(resolve, 35));
        const response = await route.fetch();
        await route.fulfill({ response });
      } finally {
        activeAtlasRequests -= 1;
      }
    },
  );

  await page.goto("/");
  await expect
    .poll(() => requestedAtlases.length, { timeout: 30_000 })
    .toBeGreaterThanOrEqual(8);

  expect(maximumActiveAtlasRequests).toBeLessThanOrEqual(2);

  const firstAtlases = requestedAtlases.slice(0, 8);
  expect(firstAtlases.every((path) => /-1\.webp$/.test(path))).toBe(true);
  expect(
    new Set(firstAtlases.map((path) => path.split("/").at(-2)).filter(Boolean))
      .size,
  ).toBe(firstAtlases.length);

  // The progressive queue intentionally continues after these assertions.
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("render menu selects every mode and refresh resets to 3D", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("portfolio:background-mode", "ascii");
  });
  await page.goto("/");

  const trigger = page.getByRole("button", {
    includeHidden: true,
    name: "Choose background render mode",
  });
  const transition = page.locator(".bg-transition-overlay");

  await expect(trigger).toContainText("[3D]");
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("portfolio:background-mode")),
    )
    .toBeNull();

  for (const mode of ["ascii", "3d", "2d"] as const) {
    await trigger.click();

    const option = page.getByRole("menuitemradio", {
      name: MODE_LABELS[mode],
    });

    await expect(option).toBeVisible();
    await option.click();
    await expect(page.locator(".bg-mode-switch-anchor")).toHaveAttribute(
      "data-hidden",
      "true",
    );
    await expect(trigger).toContainText(`[${mode.toUpperCase()}]`);
    await expect(transition).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator(".bg-mode-switch-anchor")).not.toHaveAttribute(
      "data-hidden",
      "true",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }

  await trigger.click();
  await page.getByRole("menuitemradio", { name: MODE_LABELS.ascii }).click();
  await expect(transition).toHaveCount(0, { timeout: 10_000 });
  await page.reload();
  await expect(trigger).toContainText("[3D]");
});

test("full-motion ASCII graph transition reaches and reveals the ready scene", async ({
  page,
}) => {
  test.setTimeout(30_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const trigger = page.getByRole("button", {
    includeHidden: true,
    name: "Choose background render mode",
  });
  await trigger.click();
  await page.getByRole("menuitemradio", { name: MODE_LABELS.ascii }).click();

  const transition = page.locator(
    '.bg-transition-overlay[data-target-mode="ascii"]',
  );
  const countColoredTransitionPixels = () =>
    transition.evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        return 0;
      }
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      let coloredPixels = 0;

      /* Sample every fourth physical pixel. The overlay background is #070b14;
         any sufficiently different opaque pixel belongs to a graph glyph. */
      for (let index = 0; index < pixels.length; index += 16) {
        if (pixels[index + 3] < 16) {
          continue;
        }
        const differenceFromBackground =
          Math.abs(pixels[index] - 7) +
          Math.abs(pixels[index + 1] - 11) +
          Math.abs(pixels[index + 2] - 20);
        if (differenceFromBackground > 24) {
          coloredPixels += 1;
        }
      }

      return coloredPixels;
    });

  await expect(transition).toHaveAttribute("data-phase", "covering");
  await expect
    .poll(
      async () =>
        (await transition.getAttribute("data-phase")) === "covered" &&
        (await countColoredTransitionPixels()) > 50,
      { timeout: 15_000 },
    )
    .toBe(true);
  await expect
    .poll(() => transition.getAttribute("data-phase"), { timeout: 15_000 })
    .toBe("clearing");
  await expect(transition).toHaveCount(0, { timeout: 10_000 });
  await expect(trigger).toContainText("[ASCII]");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
