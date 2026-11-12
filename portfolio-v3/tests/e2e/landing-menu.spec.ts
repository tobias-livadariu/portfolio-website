import { expect, test, type Page } from "@playwright/test";

async function waitForStartupReveal(page: Page) {
  await expect(
    page.locator('.bg-transition-overlay[data-startup="true"]'),
  ).toHaveCount(0, { timeout: 15_000 });
}

/* Safari only moves focus to buttons with Tab when "Press Tab to highlight
   each item" is switched on; Option+Tab always does. */
function getTabKey(browserName: string) {
  return browserName === "webkit" ? "Alt+Tab" : "Tab";
}

const menu = (page: Page) => page.locator(".landing-menu");
const menuButton = (page: Page, name: string) =>
  menu(page).getByRole("button", { name, exact: true });

test("the landing menu is reachable from the keyboard and opens a section", async ({
  browserName,
  page,
}) => {
  const tab = getTabKey(browserName);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForStartupReveal(page);

  /* The 3D menu is on screen, so the HTML copy stays invisible. */
  await expect(menu(page)).not.toHaveAttribute("data-shown", "true");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Tobias Livadariu/,
  );

  for (const name of ["About", "Resume", "Portfolio", "Contact Me"]) {
    await page.keyboard.press(tab);
    await expect(menuButton(page, name)).toBeFocused();
  }

  /* Focusing a menu button must not scroll the document stack. */
  expect(
    await page
      .locator(".modal-scroll-root")
      .evaluate((element) => element.scrollTop),
  ).toBe(0);

  await page.keyboard.press(`Shift+${tab}`);
  await expect(menuButton(page, "Portfolio")).toBeFocused();
  await page.keyboard.press("Enter");

  /* Focus follows the visitor into the document that opened. */
  const portfolioPanel = page.locator(".modal-panel").nth(2);

  await expect(portfolioPanel).toHaveAttribute("data-active", "true", {
    timeout: 10_000,
  });
  await expect(
    portfolioPanel.locator('.modal-section-tabs [aria-current="page"]'),
  ).toBeFocused();
  await expect(menu(page)).toHaveAttribute("inert", "");

  /* Closing returns focus to the menu entry that opened the document. */
  await page.keyboard.press("q");
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 10_000 });
  await expect(menuButton(page, "Portfolio")).toBeFocused();
  await expect(menu(page)).not.toHaveAttribute("inert", "");
});

test("the HTML menu is shown when the 3D menu cannot be drawn", async ({
  page,
}) => {
  /* Without its typefaces the 3D menu is dropped from the scene. */
  await page.route("**/fonts/**/*.typeface.json", (route) => route.abort());

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForStartupReveal(page);

  await expect(menu(page)).toHaveAttribute("data-shown", "true", {
    timeout: 10_000,
  });
  await expect(menuButton(page, "Resume")).toBeVisible();

  await menuButton(page, "Resume").click();
  await expect(page.locator(".modal-panel").nth(1)).toHaveAttribute(
    "data-active",
    "true",
    { timeout: 10_000 },
  );
});

test("the HTML menu is shown when the browser has no WebGL", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (type.startsWith("webgl")) {
        return null;
      }

      return (getContext as (...args: unknown[]) => unknown).call(
        this,
        type,
        ...rest,
      );
    } as typeof getContext;
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForStartupReveal(page);

  await expect(menu(page)).toHaveAttribute("data-shown", "true", {
    timeout: 10_000,
  });
  await expect(menuButton(page, "About")).toBeVisible();
});
