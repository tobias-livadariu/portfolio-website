import { expect, test } from "@playwright/test";

test("phone render selector retains square ASCII cells without overflow", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const rail = page.locator(".rm-rail");
  const railOption = rail.locator('.rm-tile[data-mode="3d"]');
  const railArt = railOption.locator(".rm-art");
  const railMetrics = await rail.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return {
      bottom: bounds.bottom,
      fontFamily: style.fontFamily,
      fontLoaded: document.fonts.check('700 16px "Iosevka Term Web"'),
      overflow: element.scrollWidth - element.clientWidth,
      right: bounds.right,
    };
  });
  const railOptionBounds = await railOption.boundingBox();
  const railArtBounds = await railArt.boundingBox();

  expect(railMetrics.fontLoaded).toBe(true);
  expect(railMetrics.fontFamily).toContain("Iosevka Term Web");
  expect(railMetrics.overflow).toBeLessThanOrEqual(1);
  expect(railMetrics.bottom).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerHeight),
  );
  expect(railMetrics.right).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
  expect(railOptionBounds).not.toBeNull();
  expect(railArtBounds).not.toBeNull();
  expect(
    (railArtBounds?.width ?? 0) / (railArtBounds?.height ?? 1),
  ).toBeCloseTo(1, 1);
  expect(railArtBounds?.width ?? Infinity).toBeLessThanOrEqual(
    (railOptionBounds?.width ?? 0) + 1,
  );
});

test("compact modal render control always animates between headers", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const scrollRoot = page.locator(".modal-scroll-root");
  const panels = page.locator(".modal-panel");
  const aboutPanel = panels.nth(0);
  const resumePanel = panels.nth(1);
  const motionRoot = page.locator(".modal-render-menu");

  await scrollRoot.evaluate((element) =>
    element.scrollTo({ behavior: "instant", top: window.innerHeight * 2.2 }),
  );
  await expect(aboutPanel).toHaveAttribute("data-render-menu-owner", "true");
  /* WebKit can spend several seconds uploading the intentionally large planet
     atlases on a cold mobile-GPU context. Wait for that initial reveal before
     observing the handoff under test; the phase sequence below remains exact. */
  await expect(motionRoot).toHaveAttribute("data-motion", "idle", {
    timeout: 15_000,
  });
  await expect(aboutPanel.locator(".modal-render-trigger-label")).toBeHidden();
  await expect(aboutPanel.locator(".modal-render-trigger-value")).toBeVisible();

  await motionRoot.evaluate((element) => {
    document.documentElement.dataset.mobileHandoffMotions =
      element.getAttribute("data-motion") ?? "missing";

    new MutationObserver(() => {
      const next = element.getAttribute("data-motion") ?? "missing";
      const history =
        document.documentElement.dataset.mobileHandoffMotions?.split(",") ?? [];

      if (history[history.length - 1] !== next) {
        document.documentElement.dataset.mobileHandoffMotions = [
          ...history,
          next,
        ].join(",");
      }
    }).observe(element, {
      attributeFilter: ["data-motion"],
      attributes: true,
    });
  });

  await resumePanel.evaluate((element) =>
    element.scrollIntoView({ behavior: "instant", block: "start" }),
  );

  await expect(resumePanel).toHaveAttribute("data-render-menu-owner", "true");
  await expect(motionRoot).toHaveAttribute("data-motion", "idle", {
    timeout: 15_000,
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.dataset.mobileHandoffMotions,
      ),
    )
    .toMatch(/^idle,leaving,entering,revealing,idle$/);
});
