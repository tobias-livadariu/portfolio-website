import { expect, test } from "@playwright/test";

const MODE_LABELS = {
  "2d": /FLAT/,
  "3d": /DEPTH/,
  ascii: /ASCII/,
} as const;

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
