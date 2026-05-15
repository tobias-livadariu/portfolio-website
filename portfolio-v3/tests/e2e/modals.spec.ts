import { expect, test, type Page } from "@playwright/test";

async function wheelGesture(page: Page) {
  for (let index = 0; index < 7; index += 1) {
    await page.mouse.wheel(0, 96);
    await page.waitForTimeout(40);
  }
}

test("modal stack opens from scroll and supports section navigation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.mouse.move(900, 120);
  await page.mouse.wheel(0, 120);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await wheelGesture(page);

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
  await page.waitForTimeout(300);

  const resumeScrollArea = activePanel.locator(".modal-panel-scroll");
  const resumeDocument = activePanel.locator(".modal-resume-document");
  const resumeBox = await resumeDocument.boundingBox();

  expect(resumeBox).not.toBeNull();

  if (resumeBox) {
    const scrollMetrics = await resumeScrollArea.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    }));

    if (scrollMetrics.scrollHeight > scrollMetrics.clientHeight + 2) {
      await resumeScrollArea.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
    }

    await page.waitForTimeout(100);

    const scrollBox = await resumeScrollArea.boundingBox();

    if (scrollBox) {
      await page.mouse.move(
        scrollBox.x + scrollBox.width / 2,
        scrollBox.y + scrollBox.height * 0.65,
      );
    } else {
      await page.mouse.move(
        resumeBox.x + resumeBox.width / 2,
        resumeBox.y + resumeBox.height / 2,
      );
    }

    await wheelGesture(page);
    await expect(activePanel).toContainText("File: portfolio.modal");
  }

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
