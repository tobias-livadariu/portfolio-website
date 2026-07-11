import { expect, test } from "@playwright/test";

const MODE_LABELS = {
  "2d": /FLAT/,
  "3d": /DEPTH/,
  ascii: /ASCII/,
  glitch: /GLITCH/,
} as const;

test("render menu selects and persists every background mode", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const trigger = page.getByRole("button", {
    name: "Choose background render mode",
  });
  const transition = page.locator(".bg-transition-overlay");

  for (const mode of ["ascii", "glitch", "2d", "3d"] as const) {
    await trigger.click();

    const option = page.getByRole("menuitemradio", {
      name: MODE_LABELS[mode],
    });

    await expect(option).toBeVisible();
    await option.click();
    await expect(trigger).toContainText(`[${mode.toUpperCase()}]`);
    await expect(transition).toHaveCount(0, { timeout: 10_000 });
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("portfolio:background-mode")),
      )
      .toBe(mode);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});
