#!/usr/bin/env node

import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/* The picture a chat app, LinkedIn or a search result shows beside a link to
   the site: a capture of the real landing view in its default 3D render.
   index.html points at the result through its `og:image` tag.

   1200x630 is the size those previews are designed around. The page is laid
   out at twice that size and captured at half density, because the 3D menu
   is at its largest share of the screen on a wide window: that keeps the
   name as readable as the real layout allows once the picture is shrunk
   into a small card. The render-mode rail is hidden for the capture: at
   preview size it is unreadable, and the picture is meant to carry the name
   and the scene.

   Planet positions are random on every load, so run it again if a planet
   lands behind the name. Run it against the development server after
   changing the landing view:

     npm run link-preview -- http://127.0.0.1:5173/portfolio/ */
const PREVIEW_SIZE = { height: 630, width: 1200 };
const LAYOUT_SCALE = 2;
/* How long the scene is left running before the capture, so every planet
   has faded in and the menu has settled. */
const SETTLE_MS = 6_000;
/* JPEG keeps the file near a tenth of the PNG's size; a starfield is noise
   that PNG cannot compress. Some chat apps skip preview images over 300 KB. */
const JPEG_QUALITY = 90;

const baseUrl = process.argv[2] ?? "http://127.0.0.1:5173/portfolio/";
const outputPath = resolve(process.argv[3] ?? "public/images/link-preview.jpg");

const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});

try {
  const page = await browser.newPage({
    deviceScaleFactor: 1 / LAYOUT_SCALE,
    viewport: {
      height: PREVIEW_SIZE.height * LAYOUT_SCALE,
      width: PREVIEW_SIZE.width * LAYOUT_SCALE,
    },
  });

  await page.goto(baseUrl);
  await page
    .locator('.bg-transition-overlay[data-startup="true"]')
    .waitFor({ state: "detached", timeout: 20_000 });
  await page.addStyleTag({
    content: ".bg-mode-switch-anchor { visibility: hidden !important; }",
  });
  await page.waitForTimeout(SETTLE_MS);

  const image = await page.screenshot({ quality: JPEG_QUALITY, type: "jpeg" });

  await writeFile(outputPath, image);
  console.log(
    `Wrote ${outputPath} (${PREVIEW_SIZE.width}x${PREVIEW_SIZE.height}, ${Math.round(image.length / 1024)} KB)`,
  );
} finally {
  await browser.close();
}
