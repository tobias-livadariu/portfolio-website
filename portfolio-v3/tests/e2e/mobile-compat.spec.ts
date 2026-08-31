import { expect, test, type Page } from "@playwright/test";

async function waitForStartupReveal(page: Page) {
  await expect(
    page.locator('.bg-transition-overlay[data-startup="true"]'),
  ).toHaveCount(0, { timeout: 15_000 });
}

test("phone render selector retains square ASCII cells without overflow", async ({
  page,
}) => {
  await page.goto("/");
  await waitForStartupReveal(page);
  await page.evaluate(() => document.fonts.ready);

  const rail = page.locator(".rm-rail");
  /* Startup hands off to the existing rail entrance; wait until that visual
     transition has actually reached its bottom-right resting position. */
  await expect
    .poll(async () => {
      const bounds = await rail.boundingBox();

      return (bounds?.x ?? 0) + (bounds?.width ?? 0);
    })
    .toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));

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
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-rm-normalize-cells",
    "true",
  );

  /* iOS can temporarily or permanently use its system monospace when a web
     font is delayed, rejected, or disabled. The ASCII cell contract must not
     depend on that fallback having Iosevka's unusually narrow advance. */
  await page.addStyleTag({
    content: ".rm-art { font-family: monospace !important; }",
  });
  await page.evaluate(() =>
    document.fonts.dispatchEvent(new Event("loadingdone")),
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-rm-normalize-cells",
    "true",
  );
  const fallbackArtBounds = await railArt.boundingBox();

  expect(fallbackArtBounds).not.toBeNull();
  expect(
    (fallbackArtBounds?.width ?? 0) / (fallbackArtBounds?.height ?? 1),
  ).toBeCloseTo(1, 1);

  const portraitViewport = page.viewportSize();

  expect(portraitViewport).not.toBeNull();
  await page.setViewportSize({
    height: portraitViewport?.width ?? 1,
    width: portraitViewport?.height ?? 1,
  });
  await page.evaluate(() => {
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("orientationchange"));
  });
  await expect(page.locator("html")).toHaveAttribute(
    "data-rm-normalize-cells",
    "true",
  );
  const landscapeFallbackArtBounds = await railArt.boundingBox();

  expect(landscapeFallbackArtBounds).not.toBeNull();
  expect(
    (landscapeFallbackArtBounds?.width ?? 0) /
      (landscapeFallbackArtBounds?.height ?? 1),
  ).toBeCloseTo(1, 1);

  await page.setViewportSize(portraitViewport ?? { height: 1, width: 1 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("orientationchange"));
  });
  await expect(page.locator("html")).toHaveAttribute(
    "data-rm-normalize-cells",
    "true",
  );
  const restoredFallbackArtBounds = await railArt.boundingBox();

  expect(restoredFallbackArtBounds).not.toBeNull();
  expect(
    (restoredFallbackArtBounds?.width ?? 0) /
      (restoredFallbackArtBounds?.height ?? 1),
  ).toBeCloseTo(1, 1);

  const scrollRoot = page.locator(".modal-scroll-root");

  await scrollRoot.evaluate((element) =>
    element.scrollTo({ behavior: "instant", top: window.innerHeight * 2.2 }),
  );

  const modalTrigger = page.locator(".modal-render-trigger");

  await expect(modalTrigger).toBeVisible();
  await modalTrigger.click();

  const modalArt = page.locator(
    '.modal-render-panel[data-open="true"] .rm-art',
  );
  await expect(modalArt.first()).toBeVisible();
  /* The panel opens from scaleY(.82), which intentionally distorts every
     descendant while in flight. Judge the settled text geometry. */
  await expect
    .poll(async () => {
      const modalArtBounds = await modalArt.first().boundingBox();

      return (modalArtBounds?.width ?? 0) / (modalArtBounds?.height ?? 1);
    })
    .toBeCloseTo(1, 1);
});

test("compact modal render control always animates between headers", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await waitForStartupReveal(page);

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
