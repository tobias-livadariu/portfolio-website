import { expect, test, type Page } from "@playwright/test";

async function wheelGesture(page: Page) {
  for (let index = 0; index < 7; index += 1) {
    await page.mouse.wheel(0, 96);
    await page.waitForTimeout(40);
  }
}

test("modal document opens from scroll and supports section navigation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
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

  await page.evaluate(() => {
    document.querySelector("canvas")?.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: 360,
      }),
    );
  });
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

  await page.keyboard.press("PageDown");
  await expect(activePanel).toContainText("File: resume.modal");
  await expect(page.getByRole("link", { name: "DOWNLOAD PDF" })).toBeVisible();

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
    page.getByRole("link", { name: /portfolio-website/ }),
  ).toBeVisible();

  await activePanel.getByRole("button", { name: "CONTACT ME" }).click();
  await expect(activePanel).toContainText("File: contact.modal");
  await expect(
    page.getByRole("link", { name: "tlivadar@uwaterloo.ca" }),
  ).toBeVisible();

  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: "test-results/modal-contact.png",
  });

  await activePanel.getByRole("button", { name: "Close section" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("modal reveal scrolls continuously and closes from keyboard or backdrop", async ({
  page,
}) => {
  await page.goto("/");

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

  await page.evaluate((deltaY) => {
    const canvas = document.querySelector("canvas");

    for (let index = 0; index < 3; index += 1) {
      canvas?.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY,
        }),
      );
    }
  }, revealTop * 4);
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
  await page.mouse.wheel(0, revealTop * 4);
  await expect(
    page.getByRole("dialog", {
      name: "Portfolio sections",
    }),
  ).toBeVisible();

  await page.mouse.click(8, revealTop / 2);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
