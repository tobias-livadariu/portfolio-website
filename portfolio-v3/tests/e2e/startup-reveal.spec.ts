import { expect, test } from "@playwright/test";

test("startup stays covered and inert until the real DEEP reveal completes", async ({
  page,
}) => {
  let releaseFonts!: () => void;
  const fontsReleased = new Promise<void>((resolve) => {
    releaseFonts = resolve;
  });

  /* Text3D suspends the composed scene on these resources. Holding them gives
     the test a deterministic view of the otherwise brief startup gate. */
  await page.route("**/fonts/**/*.typeface.json", async (route) => {
    await fontsReleased;
    await route.continue();
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const layer = page.locator(".modal-layer");
  const overlay = page.locator(".bg-transition-overlay");
  const railAnchor = page.locator(".bg-mode-switch-anchor");
  const scrollRoot = page.locator(".modal-scroll-root");

  await expect(overlay).toHaveAttribute("data-phase", "covered");
  await expect(overlay).toHaveAttribute("data-startup", "true");
  await expect(overlay).toHaveAttribute("data-target-mode", "3d");
  await expect(layer).toHaveAttribute("inert", "");
  await expect(layer).toHaveAttribute("aria-busy", "true");
  await expect(railAnchor).toHaveAttribute("data-hidden", "true");
  await expect(railAnchor.locator("button.rm-tile")).toHaveCount(0);

  const coverPixel = await overlay.evaluate((element: HTMLCanvasElement) => {
    const context = element.getContext("2d");

    return context
      ? Array.from(context.getImageData(0, 0, 1, 1).data)
      : undefined;
  });

  expect(coverPixel).toEqual([7, 11, 20, 255]);

  await page.keyboard.press("ArrowDown");
  await page.mouse.wheel(0, 1_200);
  await page.waitForTimeout(100);
  expect(await scrollRoot.evaluate((element) => element.scrollTop)).toBe(0);

  /* Record the production canvas itself opening at the bottom-right seed. */
  await overlay.evaluate((element: HTMLCanvasElement) => {
    document.documentElement.dataset.startupRevealPhases =
      element.getAttribute("data-phase") ?? "missing";

    new MutationObserver(() => {
      const phase = element.getAttribute("data-phase") ?? "missing";
      const phases =
        document.documentElement.dataset.startupRevealPhases?.split(",") ?? [];

      if (phases[phases.length - 1] !== phase) {
        document.documentElement.dataset.startupRevealPhases = [
          ...phases,
          phase,
        ].join(",");
      }

      if (phase !== "clearing") {
        return;
      }

      const sampleAperture = () => {
        const context = element.getContext("2d");

        if (!context) {
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
          document.documentElement.dataset.startupApertureOrigin =
            "bottom-right";
          return;
        }

        requestAnimationFrame(sampleAperture);
      };

      requestAnimationFrame(sampleAperture);
    }).observe(element, {
      attributeFilter: ["data-phase"],
      attributes: true,
    });
  });

  releaseFonts();

  await expect(overlay).toHaveCount(0, { timeout: 15_000 });
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
