import { expect, test, type Page } from "@playwright/test";

async function waitForStartupReveal(page: Page) {
  await expect(
    page.locator('.bg-transition-overlay[data-startup="true"]'),
  ).toHaveCount(0, { timeout: 15_000 });
}

async function wheelGesture(page: Page) {
  for (let index = 0; index < 7; index += 1) {
    await page.mouse.wheel(0, 96);
    await page.waitForTimeout(40);
  }
}

test("one wheel stream survives the closed-to-open modal handoff", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "The uninterrupted wheel stream uses Chromium's CDP input transaction API.",
  );
  test.setTimeout(30_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await waitForStartupReveal(page);
  const canvas = page.locator(".portfolio-canvas-layer canvas");
  const scrollRoot = page.locator(".modal-scroll-root");
  await expect(canvas).toBeVisible();
  await expect(scrollRoot).toHaveJSProperty("scrollTop", 0);

  const client = await page.context().newCDPSession(page);
  const pendingWheelEvents: Array<Promise<unknown>> = [];

  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: 900,
    y: 140,
  });

  /* Queue a single OS-like transaction independently of page responsiveness.
     Every target it can cross—the canvas, backdrop, and modal content—now
     belongs to the same native scroll container. */
  for (let index = 0; index < 12; index += 1) {
    pendingWheelEvents.push(
      client.send("Input.dispatchMouseEvent", {
        type: "mouseWheel",
        deltaX: 0,
        deltaY: 96,
        x: 900,
        y: 140,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 8));
  }

  await Promise.all(pendingWheelEvents);
  await expect
    .poll(() => scrollRoot.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(1_000);
  await expect(page.locator(".modal-layer")).toHaveClass(/modal-layer-open/);
  await expect(canvas).toBeVisible();
  await expect(page.locator('.modal-panel[data-active="true"]')).toContainText(
    "File: about.modal",
  );
});

test("modal document opens from scroll and supports section navigation", async ({
  page,
}) => {
  test.setTimeout(70_000);
  await page.setViewportSize({ width: 2048, height: 720 });
  await page.goto("/");
  await waitForStartupReveal(page);
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.mouse.move(900, 120);
  await page.mouse.wheel(0, 120);

  const activePanel = page.locator('.modal-panel[data-active="true"]');
  const scrollRoot = page.locator(".modal-scroll-root");

  await expect(
    page.getByRole("dialog", {
      name: "Portfolio sections",
    }),
  ).toBeVisible();
  await expect(activePanel).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator(".modal-layer")
        .evaluate((element) =>
          Number(
            getComputedStyle(element).getPropertyValue(
              "--modal-backdrop-opacity",
            ),
          ),
        ),
    )
    .toBeGreaterThan(0);

  const interruptedGestureTop = await scrollRoot.evaluate(
    (element) => element.scrollTop,
  );

  await page.mouse.wheel(0, 360);
  await expect
    .poll(() => scrollRoot.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(interruptedGestureTop);

  await wheelGesture(page);
  await expect(
    page.getByRole("dialog", {
      name: "Portfolio sections",
    }),
  ).toBeVisible();
  await expect
    .poll(() => scrollRoot.evaluate((element) => Math.round(element.scrollTop)))
    .toBeGreaterThan(0);
  await expect(activePanel).toContainText("File: about.modal");
  await expect(activePanel).toContainText("tobifetch");
  const sideBySideHostLine = activePanel.locator(
    ".modal-terminal-line-tobifetch-side-by-side:has(.modal-tobifetch-host)",
  );

  await expect(sideBySideHostLine).toBeVisible();
  const horizontalGap = await sideBySideHostLine.evaluate((line) => {
    const art = line.querySelector(".modal-tobifetch-art");
    const info = line.querySelector(".modal-tobifetch-info");

    if (!(art instanceof HTMLElement) || !(info instanceof HTMLElement)) {
      return -1;
    }

    return (
      info.getBoundingClientRect().left - art.getBoundingClientRect().right
    );
  });
  expect(horizontalGap).toBeGreaterThanOrEqual(0);
  await expect(
    activePanel.locator(".modal-tobifetch-host", {
      hasText: "tlivadar@uwaterloo",
    }),
  ).toHaveCSS("font-weight", "700");
  await expect(
    activePanel.locator(".modal-header-sprite").first(),
  ).toHaveAttribute("data-ascii-profile", "modal-header-planet-v2");
  await expect(
    activePanel.locator(".modal-tobifetch-art").first(),
  ).toHaveAttribute("data-ascii-profile", "tobifetch-portrait-v2");
  await expect(
    activePanel.locator(".modal-tobifetch-text-cyan", {
      hasText: "Hello dear reader!",
    }),
  ).toHaveCSS("color", "rgb(81, 199, 218)");
  await expect(
    activePanel.locator(".modal-tobifetch-text-purple", {
      hasText: "My name is Tobi",
    }),
  ).toHaveCSS("color", "rgb(175, 152, 230)");
  await expect(
    activePanel.locator(".modal-tobifetch-text-red", {
      hasText: "I deeply appreciate",
    }),
  ).toHaveCSS("color", "rgb(251, 125, 167)");

  await page.setViewportSize({ width: 640, height: 720 });

  const stackedInfoLines = activePanel.locator(
    ".modal-terminal-line-tobifetch-stacked-info",
  );
  const firstArtLine = activePanel
    .locator(".modal-terminal-line-fetch")
    .first();

  await expect(stackedInfoLines.first()).toBeVisible();
  await expect(firstArtLine).toBeVisible();
  const verticalGap = await activePanel.evaluate((panel) => {
    const infoLines = Array.from(
      panel.querySelectorAll(".modal-terminal-line-tobifetch-stacked-info"),
    );
    const artLine = panel.querySelector(".modal-terminal-line-fetch");

    if (!(artLine instanceof HTMLElement) || infoLines.length === 0) {
      return -1;
    }

    const infoBottom = Math.max(
      ...infoLines.map((line) => line.getBoundingClientRect().bottom),
    );
    return artLine.getBoundingClientRect().top - infoBottom;
  });
  expect(verticalGap).toBeGreaterThanOrEqual(-1);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.keyboard.press("PageDown");
  await expect(activePanel).toContainText("File: resume.modal");
  await expect(page.getByRole("link", { name: "DOWNLOAD PDF" })).toBeVisible();
  await expect(page.locator(".modal-resume-pdf-canvas")).toBeVisible({
    timeout: 20_000,
  });

  const resumeScrollTop = await scrollRoot.evaluate(
    (element) => element.scrollTop,
  );
  await page.mouse.move(900, 700);
  await page.mouse.wheel(0, 900);
  await expect
    .poll(() => scrollRoot.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(resumeScrollTop);

  await activePanel.getByRole("button", { name: "PORTFOLIO" }).click();
  await expect(activePanel).toContainText("File: portfolio.modal");
  await expect(activePanel).toContainText("work/shopify | main");
  await expect(activePanel).toContainText("personal/projects | main");
  await expect(
    activePanel.getByRole("heading", { name: "SHOPIFY: what I built" }),
  ).toBeAttached();
  await expect(
    activePanel.getByRole("heading", { name: "IDEANOTION: what I built" }),
  ).toBeAttached();
  await expect(
    activePanel.getByText("./what-i-built", { exact: true }),
  ).toHaveCount(2);
  await expect(
    activePanel.getByText("./what-i-learnt", { exact: true }),
  ).toHaveCount(0);
  await expect(
    activePanel.getByRole("button", { name: /hologram motion/i }),
  ).toHaveCount(0);
  const shopifyCards = activePanel.locator(".modal-story-cards").first();
  await expect(
    shopifyCards.locator(".modal-story-heading").first(),
  ).toContainText("00 // REPORT RELIABILITY");
  await expect(
    shopifyCards
      .locator(".modal-story-meta-label", { hasText: "IMPACT" })
      .first()
      .locator(
        "xpath=ancestor::div[contains(@class, 'modal-terminal-line-story')]",
      )
      .locator(".modal-story-meta-accent"),
  ).toHaveText(["r", "150", "a"]);
  await expect(
    shopifyCards
      .locator(".modal-story-meta-label", { hasText: "STACK" })
      .first()
      .locator(
        "xpath=ancestor::div[contains(@class, 'modal-terminal-line-story')]",
      )
      .locator(".modal-story-meta-accent"),
  ).toHaveText(["R", "T"]);
  const ideaNotionCards = activePanel.locator(".modal-story-cards").nth(1);
  await expect(
    ideaNotionCards
      .locator(".modal-story-meta-label", { hasText: "STACK" })
      .first()
      .locator(
        "xpath=ancestor::div[contains(@class, 'modal-terminal-line-story')]",
      )
      .locator(".modal-story-meta-accent"),
  ).toHaveText(["R", ".N", "O", "C"]);
  await expect(
    page.getByRole("link", { name: /portfolio-website/ }),
  ).toBeVisible();
  const firstStoryHero = activePanel.locator(".modal-story-hero").first();
  await firstStoryHero.scrollIntoViewIfNeeded();
  await expect(firstStoryHero.locator("canvas")).toBeVisible({
    timeout: 20_000,
  });

  await activePanel.getByRole("button", { name: "CONTACT ME" }).click();
  await expect(activePanel).toContainText("File: contact.modal");
  await expect(
    activePanel.getByRole("link", { name: "tlivadar@uwaterloo.ca" }),
  ).toBeVisible();

  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: "test-results/modal-contact.png",
  });

  await activePanel.getByRole("button", { name: "Close section" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 10_000 });
});

test("modal reveal scrolls continuously and closes from keyboard or backdrop", async ({
  page,
}) => {
  await page.goto("/");
  await waitForStartupReveal(page);

  const revealTop = await page.evaluate(() => window.innerHeight);
  const scrollRoot = page.locator(".modal-scroll-root");

  await page.mouse.move(900, 120);
  await page.mouse.wheel(0, 120);
  await expect(
    page.getByRole("dialog", {
      name: "Portfolio sections",
    }),
  ).toBeVisible();
  await page.keyboard.press("Shift+Q");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(() => scrollRoot.evaluate((element) => Math.round(element.scrollTop)))
    .toBe(0);

  await page.mouse.move(900, 120);
  await wheelGesture(page);
  await wheelGesture(page);
  await expect(
    page.getByRole("dialog", {
      name: "Portfolio sections",
    }),
  ).toBeVisible();
  await expect
    .poll(() => scrollRoot.evaluate((element) => Math.round(element.scrollTop)))
    .toBeGreaterThan(revealTop);

  await page.keyboard.press("q");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.mouse.move(900, 120);
  await wheelGesture(page);
  await wheelGesture(page);
  await expect(
    page.getByRole("dialog", {
      name: "Portfolio sections",
    }),
  ).toBeVisible();

  await page.mouse.click(8, revealTop / 2);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
