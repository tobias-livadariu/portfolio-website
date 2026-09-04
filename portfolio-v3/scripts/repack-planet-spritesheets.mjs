#!/usr/bin/env node

/**
 * Repacks the rotating-planet sprite sheets from single-row strips into
 * compact grids, so no sheet exceeds a WebGL texture limit any more.
 *
 * The strips are up to 15000px wide. Every WebGL implementation clamps a
 * texture to `MAX_TEXTURE_SIZE`, and three.js does it by drawing the decoded
 * image onto a 2D canvas at the reduced size — synchronously, on the main
 * thread, the first time the texture is uploaded (`resizeImage` in
 * WebGLTextures). That work is what this script removes. It also removes the
 * fractional frame pitch the clamp produced: 10000x200 became 8192x163, so
 * frames no longer started on whole texels and bled into each other under
 * NEAREST filtering.
 *
 * Frames keep their source resolution. `sourceSize` in the atlas JSON is what
 * the planet renderers scale a planet by, so the ratio of packed texels to
 * `sourceSize` is a planet's texel density on screen. That ratio has to be the
 * same for every planet type: a 300px gas giant draws three times the width of
 * a 100px asteroid, and packing it at a lower density would give it visibly
 * chunkier pixels than the asteroid sitting next to it. `FRAME_SCALE` therefore
 * applies to every type at once or to none of them.
 *
 * Pixel work runs in Chromium (a Playwright dev dependency): its canvas
 * downscale is premultiplied-alpha correct, which matters because the
 * transparent pixels in these sprites are opaque-black underneath and would
 * otherwise bleed dark halos into every edge. It is also the same resampling
 * three.js itself would have applied at runtime.
 *
 * Usage: npm run planet-spritesheets
 */

import { chromium } from "@playwright/test";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Density of the packed frames relative to their source, applied to every
 * planet type together. 1 keeps the sprites exactly as drawn. Lowering it is
 * the one supported way to trade planet sharpness for texture memory, and it
 * has to stay a single number: packing one type more loosely than another is
 * what makes a gas giant look chunky beside an asteroid.
 */
const FRAME_SCALE = 1;

/** Columns in the packed grid. 50 frames become a 10x5 block. */
const GRID_COLUMNS = 10;

/**
 * Largest dimension a packed sheet may reach. 99.95% of WebGL devices report a
 * `MAX_TEXTURE_SIZE` of at least 4096 (web3dsurvey.com); anything above the
 * limit is downscaled by three.js on the main thread at first upload, which is
 * both a hitch and the density break described above. The 2048 floor that the
 * WebGL2 spec guarantees is out of reach here: 50 frames of 300px is 4.5
 * megapixels and 2048 squared is 4.19, so it cannot be met without scaling
 * every type down.
 */
const MAXIMUM_SHEET_DIMENSION_PX = 4096;

const SHEET_DIRECTORY = resolve("public/rotating-planet-spritesheets");
const SOURCE_DIRECTORY = resolve("assets/planet-sources");

async function hasCwebp() {
  try {
    await run("cwebp", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

async function readAtlases() {
  const types = await readdir(SHEET_DIRECTORY, { withFileTypes: true });
  const atlases = [];

  for (const type of types.filter((entry) => entry.isDirectory())) {
    const directory = join(SHEET_DIRECTORY, type.name);
    const files = (await readdir(directory)).filter((file) =>
      file.endsWith(".json"),
    );

    for (const file of files.sort()) {
      const key = basename(file, ".json");
      const json = JSON.parse(await readFile(join(directory, file), "utf8"));
      const order = json.animations[key];

      if (!Array.isArray(order) || order.length === 0) {
        throw new Error(`${key}.json has no animation frame order.`);
      }

      atlases.push({
        directory,
        json,
        key,
        order,
        sourcePath: join(SOURCE_DIRECTORY, type.name, `${key}.png`),
        type: type.name,
      });
    }
  }

  return atlases;
}

/* Each frame is lifted into its own canvas before being scaled. Scaling
   straight out of the strip lets the resampler reach past the source
   rectangle and pull in the neighbouring frame along the shared edge. */
async function packInBrowser(page, sourceBase64, layout) {
  return page.evaluate(
    async ({ base64, frames, packedFrame, sheetHeight, sheetWidth }) => {
      const response = await fetch(`data:image/png;base64,${base64}`);
      const source = await createImageBitmap(await response.blob());
      const sheet = new OffscreenCanvas(sheetWidth, sheetHeight);
      const sheetContext = sheet.getContext("2d");
      const frameCanvas = new OffscreenCanvas(1, 1);
      const frameContext = frameCanvas.getContext("2d");

      for (const frame of frames) {
        frameCanvas.width = frame.w;
        frameCanvas.height = frame.h;
        frameContext.clearRect(0, 0, frame.w, frame.h);
        frameContext.imageSmoothingEnabled = false;
        frameContext.drawImage(
          source,
          frame.sourceX,
          frame.sourceY,
          frame.w,
          frame.h,
          0,
          0,
          frame.w,
          frame.h,
        );

        sheetContext.imageSmoothingEnabled = frame.w !== packedFrame;
        sheetContext.imageSmoothingQuality = "high";
        sheetContext.drawImage(
          frameCanvas,
          0,
          0,
          frame.w,
          frame.h,
          frame.x,
          frame.y,
          packedFrame,
          packedFrame,
        );
      }

      source.close();

      const blob = await sheet.convertToBlob({
        // Chromium encodes WebP losslessly at quality 1, which is what the
        // sheets already shipped as.
        quality: 1,
        type: "image/webp",
      });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";

      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }

      return btoa(binary);
    },
    { base64: sourceBase64, ...layout },
  );
}

/* Confirms the packed sheet still holds the source pixels. Only meaningful
   for sheets that were not scaled down; a scaled sheet has no exact answer. */
async function verifyLossless(page, sourceBase64, packedBase64, layout) {
  return page.evaluate(
    async ({
      frames,
      packed,
      packedFrame,
      sheetHeight,
      sheetWidth,
      source,
    }) => {
      const decode = async (base64, type) =>
        createImageBitmap(
          await (await fetch(`data:${type};base64,${base64}`)).blob(),
        );
      const sourceBitmap = await decode(source, "image/png");
      const packedBitmap = await decode(packed, "image/webp");
      const read = (bitmap, width, height) => {
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(bitmap, 0, 0);
        return context.getImageData(0, 0, width, height).data;
      };
      const sourcePixels = read(
        sourceBitmap,
        sourceBitmap.width,
        sourceBitmap.height,
      );
      const packedPixels = read(packedBitmap, sheetWidth, sheetHeight);
      let mismatches = 0;

      for (const frame of frames) {
        for (let y = 0; y < packedFrame; y += 1) {
          for (let x = 0; x < packedFrame; x += 1) {
            const from =
              ((frame.sourceY + y) * sourceBitmap.width + frame.sourceX + x) *
              4;
            const to = ((frame.y + y) * sheetWidth + frame.x + x) * 4;

            for (let channel = 0; channel < 4; channel += 1) {
              if (sourcePixels[from + channel] !== packedPixels[to + channel]) {
                mismatches += 1;
              }
            }
          }
        }
      }

      return mismatches;
    },
    {
      frames: layout.frames,
      packed: packedBase64,
      packedFrame: layout.packedFrame,
      sheetHeight: layout.sheetHeight,
      sheetWidth: layout.sheetWidth,
      source: sourceBase64,
    },
  );
}

async function main() {
  const atlases = await readAtlases();
  const cwebpAvailable = await hasCwebp();
  const workingDirectory = await mkdtemp(join(tmpdir(), "planet-repack-"));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let totalBefore = 0;
  let totalAfter = 0;

  await page.goto("data:text/html,<html></html>");

  if (!cwebpAvailable) {
    console.warn(
      "cwebp was not found; falling back to Chromium's lossless WebP encoder, which produces larger files.",
    );
  }

  try {
    for (const atlas of atlases) {
      const { directory, json, key, order, sourcePath } = atlas;
      const sourceFrame = json.frames[order[0]].frame.w;
      const packedFrame = Math.round(sourceFrame * FRAME_SCALE);
      const rows = Math.ceil(order.length / GRID_COLUMNS);
      const layout = {
        frames: order.map((name, index) => ({
          h: json.frames[name].frame.h,
          name,
          sourceX: json.frames[name].frame.x,
          sourceY: json.frames[name].frame.y,
          w: json.frames[name].frame.w,
          x: (index % GRID_COLUMNS) * packedFrame,
          y: Math.floor(index / GRID_COLUMNS) * packedFrame,
        })),
        packedFrame,
        sheetHeight: rows * packedFrame,
        sheetWidth: Math.min(order.length, GRID_COLUMNS) * packedFrame,
      };
      const largestDimension = Math.max(layout.sheetHeight, layout.sheetWidth);

      if (largestDimension > MAXIMUM_SHEET_DIMENSION_PX) {
        throw new Error(
          `${key} packs to ${layout.sheetWidth}x${layout.sheetHeight}, past the ` +
            `${MAXIMUM_SHEET_DIMENSION_PX}px ceiling. Lower FRAME_SCALE — for every ` +
            `type, not just this one — or repack it into more rows.`,
        );
      }

      const sourceBase64 = (await readFile(sourcePath)).toString("base64");
      const packedBase64 = await packInBrowser(page, sourceBase64, layout);
      const webpPath = join(directory, `${key}.${"webp"}`);
      const previousSize = (await readFile(webpPath)).byteLength;
      let packed = Buffer.from(packedBase64, "base64");

      if (packedFrame === sourceFrame) {
        const mismatches = await verifyLossless(
          page,
          sourceBase64,
          packedBase64,
          layout,
        );

        if (mismatches > 0) {
          throw new Error(
            `${key} was repacked without scaling but ${mismatches} channels changed.`,
          );
        }
      }

      /* cwebp compresses these flat-colour sprites appreciably better than
         Chromium's encoder, so prefer it when the machine has it. */
      if (cwebpAvailable) {
        const intermediate = join(workingDirectory, `${key}.webp`);
        const recompressed = join(workingDirectory, `${key}.min.webp`);

        await writeFile(intermediate, packed);
        await run("cwebp", [
          "-quiet",
          "-lossless",
          "-z",
          "9",
          "-alpha_q",
          "100",
          intermediate,
          "-o",
          recompressed,
        ]);
        const candidate = await readFile(recompressed);

        if (candidate.byteLength < packed.byteLength) {
          packed = candidate;
        }
      }

      await writeFile(webpPath, packed);

      json.meta.size = { h: layout.sheetHeight, w: layout.sheetWidth };
      json.meta.note =
        "Frames are packed in a grid at `frame` resolution; `sourceSize` keeps the layout size the planet renderers scale by.";

      for (const frame of layout.frames) {
        const entry = json.frames[frame.name];

        entry.frame = {
          h: packedFrame,
          w: packedFrame,
          x: frame.x,
          y: frame.y,
        };
        entry.spriteSourceSize = { h: packedFrame, w: packedFrame, x: 0, y: 0 };
      }

      await writeFile(
        join(directory, `${key}.json`),
        `${JSON.stringify(json, null, 2)}\n`,
      );

      totalBefore += previousSize;
      totalAfter += packed.byteLength;
      console.log(
        `${key}: ${sourceFrame}px frames -> ${packedFrame}px, ` +
          `${layout.sheetWidth}x${layout.sheetHeight}, ` +
          `${(previousSize / 1024).toFixed(0)}KB -> ${(packed.byteLength / 1024).toFixed(0)}KB`,
      );
    }
  } finally {
    await browser.close();
    await rm(workingDirectory, { force: true, recursive: true });
  }

  console.log(
    `\n${atlases.length} sheets repacked. ` +
      `${(totalBefore / 1e6).toFixed(2)}MB -> ${(totalAfter / 1e6).toFixed(2)}MB on disk.`,
  );
}

await mkdir(SHEET_DIRECTORY, { recursive: true });
await main();
