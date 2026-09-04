import { expect, test } from "@playwright/test";
import { BACKGROUND_TRANSITION } from "../../src/background/background-mode-core";

test("startup holds the cover until the background and the 3D menu have both painted", async ({
  page,
}) => {
  let releaseFonts!: () => void;
  let blockedFontRequests = 0;
  const fontsReleased = new Promise<void>((resolve) => {
    releaseFonts = resolve;
  });

  /* The menu suspends on its Text3D typeface while stars are already drawing.
     Holding the typeface proves the cover waits for the menu too: releasing on
     the background alone let the menu pop in over an exposed starfield. */
  await page.route("**/fonts/**/*.typeface.json", async (route) => {
    blockedFontRequests += 1;
    await fontsReleased;
    await route.continue();
  });

  /* Observe the production overlay from its insertion so a fast first frame
     cannot race Playwright's post-navigation locator setup. */
  await page.addInitScript(() => {
    let observedOverlay: HTMLCanvasElement | null = null;

    const observeOverlay = () => {
      const element = document.querySelector<HTMLCanvasElement>(
        '.bg-transition-overlay[data-startup="true"]',
      );

      if (!element || element === observedOverlay) {
        return;
      }

      observedOverlay = element;
      const recordPhase = () => {
        const root = document.documentElement;

        if (!root) {
          return;
        }

        const phase = element.getAttribute("data-phase") ?? "missing";
        const phases = root.dataset.startupRevealPhases?.split(",") ?? [];

        if (phases[phases.length - 1] !== phase) {
          root.dataset.startupRevealPhases = [...phases, phase].join(",");
        }

        if (phase !== "clearing") {
          return;
        }

        const sampleAperture = () => {
          const context = element.getContext("2d");

          if (!context || !element.isConnected) {
            return;
          }

          const bottomRightAlpha = context.getImageData(
            Math.max(0, element.width - 2),
            Math.max(0, element.height - 2),
            1,
            1,
          ).data[3];
          const topLeftAlpha = context.getImageData(1, 1, 1, 1).data[3];

          if (bottomRightAlpha < topLeftAlpha) {
            root.dataset.startupApertureOrigin = "bottom-right";
            return;
          }

          requestAnimationFrame(sampleAperture);
        };

        requestAnimationFrame(sampleAperture);
      };

      recordPhase();
      new MutationObserver(recordPhase).observe(element, {
        attributeFilter: ["data-phase"],
        attributes: true,
      });
    };

    new MutationObserver(observeOverlay).observe(document, {
      childList: true,
      subtree: true,
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const layer = page.locator(".modal-layer");
  const overlay = page.locator('.bg-transition-overlay[data-startup="true"]');
  const railAnchor = page.locator(".bg-mode-switch-anchor");
  const scrollRoot = page.locator(".modal-scroll-root");

  await expect.poll(() => blockedFontRequests).toBeGreaterThan(0);

  /* Comfortably inside the fail-open deadline, so a cover still standing here
     is the menu holding it rather than the safety valve not having fired. */
  await page.waitForTimeout(
    BACKGROUND_TRANSITION.startupSceneReadyTimeoutMs / 2,
  );
  await expect(overlay).toHaveCount(1);

  releaseFonts();

  await expect(overlay).toHaveCount(0, { timeout: 5_000 });
  expect(
    await page.evaluate(
      () => document.documentElement.dataset.startupRevealPhases,
    ),
  ).toBe("covered,clearing");
  expect(
    await page.evaluate(
      () => document.documentElement.dataset.startupApertureOrigin,
    ),
  ).toBe("bottom-right");
  await expect(layer).not.toHaveAttribute("inert", "");
  await expect(layer).not.toHaveAttribute("aria-busy", "true");
  await expect(railAnchor).not.toHaveAttribute("data-hidden", "true");
  await expect(railAnchor.locator("button.rm-tile")).toHaveCount(3);

  await page.keyboard.press("ArrowDown");
  await expect
    .poll(() => scrollRoot.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
});

test("startup fails open when the menu typeface never arrives", async ({
  page,
}) => {
  /* Waiting on the 3D UI must not become a way to hang the page behind a
     resource that never resolves. */
  await page.route("**/fonts/**/*.typeface.json", () => {
    /* Never continued, never aborted. */
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(
    page.locator('.bg-transition-overlay[data-startup="true"]'),
  ).toHaveCount(0, {
    timeout: BACKGROUND_TRANSITION.startupSceneReadyTimeoutMs + 5_000,
  });
  await expect(page.locator(".modal-layer")).not.toHaveAttribute("inert", "");
});

test("startup fails open when WebGL cannot create a context", async ({
  page,
}) => {
  test.setTimeout(15_000);
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (
      contextId: string,
      ...options: unknown[]
    ) {
      if (contextId === "webgl" || contextId === "webgl2") {
        return null;
      }

      return getContext.call(this, contextId, ...options);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  const startedAt = Date.now();
  await page.goto("/");
  await expect(
    page.locator('.bg-transition-overlay[data-startup="true"]'),
  ).toHaveCount(0, {
    timeout: BACKGROUND_TRANSITION.startupSceneReadyTimeoutMs + 5_000,
  });

  expect(Date.now() - startedAt).toBeLessThan(
    BACKGROUND_TRANSITION.startupSceneReadyTimeoutMs + 4_000,
  );
  await expect(page.locator(".portfolio-canvas-fallback")).toBeAttached();
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(7, 11, 20)",
  );
  await expect(page.locator(".modal-layer")).not.toHaveAttribute("inert", "");
  await expect(page.locator("button.rm-tile")).toHaveCount(3);
});

test("startup does not fetch or instantiate off-screen document renderers", async ({
  page,
}) => {
  const startupRequests: string[] = [];

  page.on("request", (request) => startupRequests.push(request.url()));
  await page.goto("/");
  await expect(
    page.locator('.bg-transition-overlay[data-startup="true"]'),
  ).toHaveCount(0, { timeout: 10_000 });

  expect(startupRequests.some((url) => url.endsWith("/resume.pdf"))).toBe(
    false,
  );
  /* Only the background holds a rendering context before a modal is opened.
     The modal section canvases exist in the markup but stay inert until the
     shared renderer mounts. */
  await expect(page.locator(".portfolio-canvas-layer canvas")).toHaveCount(1);
  await expect(
    page.locator('[data-testid="modal-shared-scene-layer"]'),
  ).toHaveCount(0);

  /* The generated SVG keeps the complete document structurally and visually
     present before opening a modal admits PDF.js. */
  const poster = page.locator(".modal-resume-svg-poster");
  await expect(poster).toBeAttached();
  const bounds = await poster.boundingBox();

  expect(bounds).not.toBeNull();
  expect((bounds?.width ?? 0) / (bounds?.height ?? 1)).toBeCloseTo(
    612 / 792,
    2,
  );
});
