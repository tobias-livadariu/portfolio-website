import { expect, test } from "@playwright/test";

const MODE_LABELS = {
  "2d": /FLAT/,
  "3d": /DEEP/,
  ascii: /CHAR/,
} as const;

test("planet atlases load through a bounded, diversity-first queue", async ({
  page,
}) => {
  test.setTimeout(45_000);

  let activeAtlasRequests = 0;
  let maximumActiveAtlasRequests = 0;
  const requestedAtlases: string[] = [];
  const modalPreviewAtlases = new Set([
    "/astroid/astroid-5.png",
    "/ice-world/ice-world-1.png",
    "/islands/islands-1.png",
    "/terran-wet/terran-wet-1.png",
  ]);

  await page.route(
    "**/rotating-planet-spritesheets/**/*.png",
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
  expect(firstAtlases.every((path) => /-1\.png$/.test(path))).toBe(true);
  expect(
    new Set(firstAtlases.map((path) => path.split("/").at(-2)).filter(Boolean))
      .size,
  ).toBe(firstAtlases.length);
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
