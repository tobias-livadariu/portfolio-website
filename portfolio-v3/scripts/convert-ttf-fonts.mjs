import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { TTFLoader } from "three/addons/loaders/TTFLoader.js";

const fontDir = process.argv[2];

if (!fontDir) {
  console.error("Usage: node convert-ttf-fonts.mjs <ttf-font-directory>.");
  process.exit(1);
}

const loader = new TTFLoader();
const files = await readdir(fontDir);

for (const file of files) {
  if (!file.toLowerCase().endsWith(".ttf")) continue;

  const inputPath = path.join(fontDir, file);
  const outputPath = path.join(
    fontDir,
    file.replace(/\.ttf$/i, ".typeface.json"),
  );

  const buffer = await readFile(inputPath);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );

  const json = loader.parse(arrayBuffer);

  await writeFile(outputPath, JSON.stringify(json));
  console.log(`Converted ${inputPath} -> ${outputPath}`);
}
