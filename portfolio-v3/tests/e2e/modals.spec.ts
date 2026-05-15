import { expect, test } from "@playwright/test";

test("modal stack opens from scroll and supports section navigation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.mouse.move(900, 120);
  await page.mouse.wheel(0, 520);

  const dialog = page.getByRole("dialog", {
    name: "Portfolio section panels",
  });
  const activePanel = page.locator('.modal-panel[data-active="true"]');

  await expect(dialog).toBeVisible();
  await expect(activePanel).toContainText("File: about.modal");
  await expect(activePanel).toContainText("whoami");

  await page.waitForTimeout(600);
  await page.keyboard.press("PageDown");
  await expect(activePanel).toContainText("File: resume.modal");
  await expect(page.getByRole("link", { name: "DOWNLOAD PDF" })).toBeVisible();

  await page.getByRole("button", { name: "PORTFOLIO" }).click();
  await expect(activePanel).toContainText("File: portfolio.modal");
  await expect(activePanel).toContainText("cd work && ls -l");
  await expect(activePanel).toContainText("cd ../../personal && ls -l");
  await expect(
    page.getByRole("link", { name: /portfolio-website/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "CONTACT ME" }).click();
  await expect(activePanel).toContainText("File: contact.modal");
  await expect(
    page.getByRole("link", { name: "tlivadar@uwaterloo.ca" }),
  ).toBeVisible();

  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: "test-results/modal-contact.png",
  });

  await page.getByRole("button", { name: "Close section" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
