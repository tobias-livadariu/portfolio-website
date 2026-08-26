import { useEffect, useMemo, useState } from "react";
import publicPath from "../../utility/public-path";
import type { AsciiImageProfile } from "./ascii-image-profiles";

interface AtlasFrame {
  frame: {
    h: number;
    w: number;
    x: number;
    y: number;
  };
}

interface AtlasJson {
  animations?: Record<string, string[]>;
  frames: Record<string, AtlasFrame>;
}

export interface AsciiCell {
  char: string;
  color: string;
}

export type AsciiFrame = AsciiCell[][];

export interface ColoredRun {
  color: string;
  text: string;
}

export const ASCII_FRAME_CACHE = new Map<string, Promise<AsciiFrame[]>>();
export const ASCII_PREVIEW_FRAME_CACHE = new Map<string, Promise<AsciiFrame>>();
export const TRANSPARENT_CELL: AsciiCell = { char: " ", color: "transparent" };
/* Terminal cells are roughly twice as tall as they are wide, so an image
   needs half as many rows as square pixels to keep its aspect ratio. */
export const CHARACTER_CELL_ASPECT = 0.5;

function colorString(red: number, green: number, blue: number) {
  return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
}

function getRotatedCell(
  frame: AsciiFrame,
  row: number,
  column: number,
  turns: number,
) {
  const height = frame.length;
  const width = frame[0]?.length ?? 0;

  if (turns === 1) {
    return frame[height - 1 - column]?.[row];
  }

  if (turns === 2) {
    return frame[height - 1 - row]?.[width - 1 - column];
  }

  if (turns === 3) {
    return frame[column]?.[width - 1 - row];
  }

  return frame[row]?.[column];
}

export function rotateFrame(frame: AsciiFrame, quarterTurns = 0) {
  const turns = ((quarterTurns % 4) + 4) % 4;

  if (turns === 0) {
    return frame;
  }

  const sourceHeight = frame.length;
  const sourceWidth = frame[0]?.length ?? 0;
  const targetHeight = turns % 2 === 0 ? sourceHeight : sourceWidth;
  const targetWidth = turns % 2 === 0 ? sourceWidth : sourceHeight;

  return Array.from({ length: targetHeight }, (_, row) =>
    Array.from({ length: targetWidth }, (_, column) => {
      return getRotatedCell(frame, row, column, turns) ?? TRANSPARENT_CELL;
    }),
  );
}

export function flipFrame(frame: AsciiFrame, flipX = false, flipY = false) {
  if (!flipX && !flipY) {
    return frame;
  }

  const height = frame.length;
  const width = frame[0]?.length ?? 0;

  return Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, column) => {
      const sourceRow = flipY ? height - 1 - row : row;
      const sourceColumn = flipX ? width - 1 - column : column;

      return frame[sourceRow]?.[sourceColumn] ?? TRANSPARENT_CELL;
    }),
  );
}

const IMAGE_CACHE = new Map<string, Promise<HTMLImageElement>>();
const ATLAS_CACHE = new Map<string, Promise<AtlasJson>>();

function loadImage(path: string) {
  let promise = IMAGE_CACHE.get(path);

  if (!promise) {
    const image = new Image();
    image.decoding = "async";
    image.src = publicPath(path);
    promise = image.decode().then(() => image);
    IMAGE_CACHE.set(path, promise);
  }

  return promise;
}

function loadAtlas(path: string) {
  let promise = ATLAS_CACHE.get(path);

  if (!promise) {
    promise = fetch(publicPath(path)).then((response) => response.json());
    ATLAS_CACHE.set(path, promise);
  }

  return promise;
}

interface SampledFrame {
  alpha: Float32Array;
  blue: Float32Array;
  green: Float32Array;
  red: Float32Array;
}

interface ToneFrame {
  edgeMagnitude: Float32Array;
  gradientX: Float32Array;
  gradientY: Float32Array;
  luminance: Float32Array;
}

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

function srgbToLinear(value: number) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number) {
  return value <= 0.0031308
    ? value * 12.92
    : 1.055 * value ** (1 / 2.4) - 0.055;
}

/** Relative luminance converted back to a perceptually spaced sRGB value. */
function perceptualLuminance(red: number, green: number, blue: number) {
  const linear =
    srgbToLinear(clampUnit(red)) * 0.2126 +
    srgbToLinear(clampUnit(green)) * 0.7152 +
    srgbToLinear(clampUnit(blue)) * 0.0722;

  return clampUnit(linearToSrgb(linear));
}

function sampleFrames(
  image: HTMLImageElement,
  sources: readonly { h: number; w: number; x: number; y: number }[],
  columns: number,
  rows: number,
  profile: AsciiImageProfile,
): SampledFrame[] {
  const samplesPerAxis = Math.max(1, Math.round(profile.raster.samplesPerAxis));
  const sampleWidth = columns * samplesPerAxis;
  const frameSampleHeight = rows * samplesPerAxis;
  const sampleHeight = frameSampleHeight * sources.length;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  if (!context) {
    return [];
  }

  context.clearRect(0, 0, sampleWidth, sampleHeight);
  context.imageSmoothingEnabled = profile.raster.smoothingEnabled;
  context.imageSmoothingQuality = profile.raster.smoothingQuality;
  sources.forEach((source, frameIndex) => {
    context.drawImage(
      image,
      source.x,
      source.y,
      source.w,
      source.h,
      0,
      frameIndex * frameSampleHeight,
      sampleWidth,
      frameSampleHeight,
    );
  });

  const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
  const length = columns * rows;
  const samplesPerCell = samplesPerAxis * samplesPerAxis;

  return sources.map((_, frameIndex) => {
    const red = new Float32Array(length);
    const green = new Float32Array(length);
    const blue = new Float32Array(length);
    const alpha = new Float32Array(length);
    const framePixelOffset = frameIndex * frameSampleHeight;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        let alphaSum = 0;
        let redSum = 0;
        let greenSum = 0;
        let blueSum = 0;

        for (let sampleY = 0; sampleY < samplesPerAxis; sampleY += 1) {
          const pixelY = framePixelOffset + row * samplesPerAxis + sampleY;

          for (let sampleX = 0; sampleX < samplesPerAxis; sampleX += 1) {
            const pixelX = column * samplesPerAxis + sampleX;
            const offset = (pixelY * sampleWidth + pixelX) * 4;
            const sampleAlpha = pixels[offset + 3] / 255;

            alphaSum += sampleAlpha;
            redSum += (pixels[offset] / 255) * sampleAlpha;
            greenSum += (pixels[offset + 1] / 255) * sampleAlpha;
            blueSum += (pixels[offset + 2] / 255) * sampleAlpha;
          }
        }

        const index = row * columns + column;
        alpha[index] = alphaSum / samplesPerCell;

        if (alphaSum > 0) {
          red[index] = redSum / alphaSum;
          green[index] = greenSum / alphaSum;
          blue[index] = blueSum / alphaSum;
        }
      }
    }

    return { alpha, blue, green, red };
  });
}

function gaussianKernel(sigma: number) {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float32Array(radius * 2 + 1);
  let sum = 0;

  for (let offset = -radius; offset <= radius; offset += 1) {
    const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
    kernel[offset + radius] = weight;
    sum += weight;
  }

  for (let index = 0; index < kernel.length; index += 1) {
    kernel[index] /= sum;
  }

  return { kernel, radius };
}

/** Gaussian blur that does not bleed transparent pixels into visible edges. */
function blurField(
  values: Float32Array,
  alpha: Float32Array,
  width: number,
  height: number,
  sigma: number,
) {
  if (sigma <= 0) {
    return values.slice();
  }

  const { kernel, radius } = gaussianKernel(sigma);
  const horizontalValue = new Float32Array(values.length);
  const horizontalWeight = new Float32Array(values.length);
  const output = new Float32Array(values.length);

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column;

      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleColumn = Math.min(width - 1, Math.max(0, column + offset));
        const sampleIndex = row * width + sampleColumn;
        const weight = kernel[offset + radius] * alpha[sampleIndex];
        horizontalValue[index] += values[sampleIndex] * weight;
        horizontalWeight[index] += weight;
      }
    }
  }

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column;
      let valueSum = 0;
      let weightSum = 0;

      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleRow = Math.min(height - 1, Math.max(0, row + offset));
        const sampleIndex = sampleRow * width + column;
        const kernelWeight = kernel[offset + radius];
        valueSum += horizontalValue[sampleIndex] * kernelWeight;
        weightSum += horizontalWeight[sampleIndex] * kernelWeight;
      }

      output[index] = weightSum > 0 ? valueSum / weightSum : values[index];
    }
  }

  return output;
}

function percentile(sorted: readonly number[], position: number) {
  if (sorted.length === 0) {
    return 0;
  }

  const index = clampUnit(position) * (sorted.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const amount = index - lowerIndex;

  return sorted[lowerIndex] * (1 - amount) + sorted[upperIndex] * amount;
}

function applyAutomaticLevels(
  values: Float32Array,
  alpha: Float32Array,
  profile: AsciiImageProfile,
) {
  const visibleValues = Array.from(values).filter(
    (_, index) => alpha[index] >= profile.alpha.threshold,
  );
  visibleValues.sort((left, right) => left - right);

  const black = percentile(visibleValues, profile.tone.blackPointPercentile);
  const white = percentile(visibleValues, profile.tone.whitePointPercentile);
  const range = Math.max(1 / 255, white - black);

  return values.map((value) => clampUnit((value - black) / range));
}

function getFieldValue(
  values: Float32Array,
  alpha: Float32Array,
  width: number,
  height: number,
  row: number,
  column: number,
  fallback: number,
) {
  const safeRow = Math.min(height - 1, Math.max(0, row));
  const safeColumn = Math.min(width - 1, Math.max(0, column));
  const index = safeRow * width + safeColumn;

  return alpha[index] > 0 ? values[index] : fallback;
}

function sobelField(
  values: Float32Array,
  alpha: Float32Array,
  width: number,
  height: number,
) {
  const gradientX = new Float32Array(values.length);
  const gradientY = new Float32Array(values.length);
  const edgeMagnitude = new Float32Array(values.length);

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column;
      const center = values[index];
      const topLeft = getFieldValue(
        values,
        alpha,
        width,
        height,
        row - 1,
        column - 1,
        center,
      );
      const top = getFieldValue(
        values,
        alpha,
        width,
        height,
        row - 1,
        column,
        center,
      );
      const topRight = getFieldValue(
        values,
        alpha,
        width,
        height,
        row - 1,
        column + 1,
        center,
      );
      const left = getFieldValue(
        values,
        alpha,
        width,
        height,
        row,
        column - 1,
        center,
      );
      const right = getFieldValue(
        values,
        alpha,
        width,
        height,
        row,
        column + 1,
        center,
      );
      const bottomLeft = getFieldValue(
        values,
        alpha,
        width,
        height,
        row + 1,
        column - 1,
        center,
      );
      const bottom = getFieldValue(
        values,
        alpha,
        width,
        height,
        row + 1,
        column,
        center,
      );
      const bottomRight = getFieldValue(
        values,
        alpha,
        width,
        height,
        row + 1,
        column + 1,
        center,
      );

      const x =
        -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight;
      const y =
        -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;

      gradientX[index] = x;
      gradientY[index] = y;
      edgeMagnitude[index] = clampUnit(Math.hypot(x, y) / 4);
    }
  }

  return { edgeMagnitude, gradientX, gradientY };
}

function processTone(
  sampled: SampledFrame,
  columns: number,
  rows: number,
  profile: AsciiImageProfile,
): ToneFrame {
  let luminance = new Float32Array(sampled.alpha.length);

  for (let index = 0; index < luminance.length; index += 1) {
    luminance[index] = perceptualLuminance(
      sampled.red[index] * profile.tone.exposure,
      sampled.green[index] * profile.tone.exposure,
      sampled.blue[index] * profile.tone.exposure,
    );
  }

  luminance = blurField(
    luminance,
    sampled.alpha,
    columns,
    rows,
    profile.tone.preBlurSigma,
  );
  luminance = applyAutomaticLevels(luminance, sampled.alpha, profile);

  for (let index = 0; index < luminance.length; index += 1) {
    const contrasted = (luminance[index] - 0.5) * profile.tone.contrast + 0.5;
    luminance[index] = clampUnit(
      clampUnit(contrasted) ** (1 / Math.max(0.01, profile.tone.gamma)),
    );
  }

  if (profile.tone.localContrastAmount !== 0) {
    const surroundings = blurField(
      luminance,
      sampled.alpha,
      columns,
      rows,
      profile.tone.localContrastSigma,
    );

    for (let index = 0; index < luminance.length; index += 1) {
      luminance[index] = clampUnit(
        luminance[index] +
          (luminance[index] - surroundings[index]) *
            profile.tone.localContrastAmount,
      );
    }
  }

  if (profile.tone.sharpenAmount !== 0) {
    const softened = blurField(
      luminance,
      sampled.alpha,
      columns,
      rows,
      profile.tone.sharpenSigma,
    );

    for (let index = 0; index < luminance.length; index += 1) {
      luminance[index] = clampUnit(
        luminance[index] +
          (luminance[index] - softened[index]) * profile.tone.sharpenAmount,
      );
    }
  }

  const edges = sobelField(luminance, sampled.alpha, columns, rows);

  if (profile.tone.edgeBoost !== 0) {
    for (let index = 0; index < luminance.length; index += 1) {
      luminance[index] = clampUnit(
        luminance[index] + edges.edgeMagnitude[index] * profile.tone.edgeBoost,
      );
    }
  }

  return { ...edges, luminance };
}

interface DiffusionTarget {
  column: number;
  row: number;
  weight: number;
}

function diffusionTargets(
  mode: AsciiImageProfile["quantization"]["dither"],
  row: number,
  column: number,
  direction: number,
): DiffusionTarget[] {
  if (mode === "atkinson") {
    return [
      { column: column + direction, row, weight: 1 / 8 },
      { column: column + direction * 2, row, weight: 1 / 8 },
      { column: column - direction, row: row + 1, weight: 1 / 8 },
      { column, row: row + 1, weight: 1 / 8 },
      { column: column + direction, row: row + 1, weight: 1 / 8 },
      { column, row: row + 2, weight: 1 / 8 },
    ];
  }

  return [
    { column: column + direction, row, weight: 7 / 16 },
    { column: column - direction, row: row + 1, weight: 3 / 16 },
    { column, row: row + 1, weight: 5 / 16 },
    { column: column + direction, row: row + 1, weight: 1 / 16 },
  ];
}

function quantizeLuminance(
  tone: ToneFrame,
  alpha: Float32Array,
  columns: number,
  rows: number,
  profile: AsciiImageProfile,
) {
  const rampLength = Math.max(1, Array.from(profile.quantization.ramp).length);
  const levels = Math.max(1, rampLength - 1);
  const indices = new Int16Array(tone.luminance.length);
  indices.fill(-1);
  const working = tone.luminance.slice();
  const useDiffusion = profile.quantization.dither !== "none";

  for (let row = 0; row < rows; row += 1) {
    const direction = profile.quantization.serpentine && row % 2 === 1 ? -1 : 1;
    const start = direction === 1 ? 0 : columns - 1;

    for (let step = 0; step < columns; step += 1) {
      const column = start + step * direction;
      const index = row * columns + column;

      if (alpha[index] < profile.alpha.threshold) {
        continue;
      }

      const value = clampUnit(working[index]);
      const quantizedIndex = Math.round(value * levels);
      const quantizedValue = quantizedIndex / levels;
      indices[index] = quantizedIndex;

      if (!useDiffusion || profile.quantization.ditherStrength === 0) {
        continue;
      }

      const error =
        (value - quantizedValue) * profile.quantization.ditherStrength;

      for (const target of diffusionTargets(
        profile.quantization.dither,
        row,
        column,
        direction,
      )) {
        if (
          target.row < 0 ||
          target.row >= rows ||
          target.column < 0 ||
          target.column >= columns
        ) {
          continue;
        }

        const targetIndex = target.row * columns + target.column;

        if (alpha[targetIndex] >= profile.alpha.threshold) {
          working[targetIndex] += error * target.weight;
        }
      }
    }
  }

  return indices;
}

function contourGlyph(
  gradientX: number,
  gradientY: number,
  profile: AsciiImageProfile,
) {
  const halfTurn = Math.PI;
  let angle = Math.atan2(gradientY, gradientX) + Math.PI / 2;
  angle = ((angle % halfTurn) + halfTurn) % halfTurn;

  if (angle < Math.PI / 8 || angle >= (Math.PI * 7) / 8) {
    return profile.structure.horizontalGlyph;
  }

  if (angle < (Math.PI * 3) / 8) {
    return profile.structure.backwardSlashGlyph;
  }

  if (angle < (Math.PI * 5) / 8) {
    return profile.structure.verticalGlyph;
  }

  return profile.structure.forwardSlashGlyph;
}

function processedColor(
  sampled: SampledFrame,
  tone: ToneFrame,
  index: number,
  profile: AsciiImageProfile,
) {
  let red = clampUnit(sampled.red[index] * profile.tone.exposure);
  let green = clampUnit(sampled.green[index] * profile.tone.exposure);
  let blue = clampUnit(sampled.blue[index] * profile.tone.exposure);
  const sourceTone = perceptualLuminance(red, green, blue);

  red = sourceTone + (red - sourceTone) * profile.color.saturation;
  green = sourceTone + (green - sourceTone) * profile.color.saturation;
  blue = sourceTone + (blue - sourceTone) * profile.color.saturation;

  const targetTone =
    sourceTone * (1 - profile.color.toneMapStrength) +
    tone.luminance[index] * profile.color.toneMapStrength;
  const adjustedTone = perceptualLuminance(red, green, blue);
  const scale = targetTone / Math.max(1 / 255, adjustedTone);

  return colorString(
    clampUnit(red * scale) * 255,
    clampUnit(green * scale) * 255,
    clampUnit(blue * scale) * 255,
  );
}

function sampledFrameToAscii(
  sampled: SampledFrame,
  columns: number,
  rows: number,
  profile: AsciiImageProfile,
) {
  const tone = processTone(sampled, columns, rows, profile);
  const quantized = quantizeLuminance(
    tone,
    sampled.alpha,
    columns,
    rows,
    profile,
  );
  const ramp = Array.from(profile.quantization.ramp);

  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      const index = row * columns + column;
      const rampIndex = quantized[index];

      if (rampIndex < 0) {
        return TRANSPARENT_CELL;
      }

      const useContour =
        profile.structure.enabled &&
        tone.edgeMagnitude[index] >= profile.structure.edgeThreshold &&
        tone.luminance[index] >= profile.structure.minTone &&
        tone.luminance[index] <= profile.structure.maxTone;

      return {
        char: useContour
          ? contourGlyph(tone.gradientX[index], tone.gradientY[index], profile)
          : (ramp[rampIndex] ?? ramp.at(-1) ?? " "),
        color: processedColor(sampled, tone, index, profile),
      };
    }),
  );
}

/** Intrinsic pixel size of an image, for deriving an ASCII grid's shape. */
export async function loadImageSize(imagePath: string) {
  const image = await loadImage(imagePath);

  return { height: image.naturalHeight, width: image.naturalWidth };
}

export interface AsciiFrameRequest {
  atlasKey?: string;
  columns: number;
  imagePath: string;
  jsonPath?: string;
  profile: AsciiImageProfile;
  rows: number;
}

export function getAsciiFrameCacheKey(props: AsciiFrameRequest) {
  return [
    props.imagePath,
    props.jsonPath ?? "",
    props.atlasKey ?? "",
    props.columns,
    props.rows,
    JSON.stringify(props.profile),
  ].join("|");
}

async function loadAsciiSources(props: AsciiFrameRequest) {
  const image = await loadImage(props.imagePath);

  if (!props.jsonPath) {
    return {
      image,
      sources: [{ x: 0, y: 0, w: image.naturalWidth, h: image.naturalHeight }],
    };
  }

  const atlas = await loadAtlas(props.jsonPath);
  const animationKeys = Object.keys(atlas.animations ?? {});
  const animationKey = props.atlasKey ?? animationKeys[0] ?? "";
  const frameKeys =
    atlas.animations?.[animationKey] ??
    atlas.animations?.[animationKeys[0] ?? ""] ??
    Object.keys(atlas.frames).slice(0, 1);
  const sources = frameKeys
    .map((frameKey) => atlas.frames[frameKey])
    .filter((frame): frame is AtlasFrame => Boolean(frame))
    .map((frame) => frame.frame);

  return { image, sources };
}

function yieldToMainThread() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

async function convertSampledFrames(
  sampledFrames: readonly SampledFrame[],
  props: AsciiFrameRequest,
) {
  const frames: AsciiFrame[] = [];
  const framesPerYield = Math.max(
    1,
    Math.round(props.profile.raster.framesPerYield),
  );

  for (let index = 0; index < sampledFrames.length; index += 1) {
    frames.push(
      sampledFrameToAscii(
        sampledFrames[index],
        props.columns,
        props.rows,
        props.profile,
      ),
    );

    if (
      (index + 1) % framesPerYield === 0 &&
      index + 1 < sampledFrames.length
    ) {
      await yieldToMainThread();
    }
  }

  return frames;
}

export async function loadAsciiFrames(props: AsciiFrameRequest) {
  const { image, sources } = await loadAsciiSources(props);

  return convertSampledFrames(
    sampleFrames(image, sources, props.columns, props.rows, props.profile),
    props,
  );
}

/** Converts frame zero separately so animated art appears before its queue. */
export async function loadAsciiPreviewFrame(props: AsciiFrameRequest) {
  const { image, sources } = await loadAsciiSources(props);
  const source = sources[0];

  if (!source) {
    return [];
  }

  const [sampled] = sampleFrames(
    image,
    [source],
    props.columns,
    props.rows,
    props.profile,
  );

  return sampled
    ? sampledFrameToAscii(sampled, props.columns, props.rows, props.profile)
    : [];
}

/** Intrinsic image size as React state; null until the image is decoded. */
export function useImageSize(imagePath: string) {
  const [size, setSize] = useState<{ height: number; width: number } | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    void loadImageSize(imagePath).then((imageSize) => {
      if (isMounted) {
        setSize(imageSize);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [imagePath]);

  return size;
}

export function buildRowRuns(row: AsciiCell[]): ColoredRun[] {
  const runs: ColoredRun[] = [];
  let current: ColoredRun | null = null;

  for (const cell of row) {
    if (current && current.color === cell.color) {
      current.text += cell.char;
    } else {
      current = { color: cell.color, text: cell.char };
      runs.push(current);
    }
  }

  return runs;
}

export function useAsciiImageFrame(props: {
  atlasKey?: string;
  columns: number;
  flipX?: boolean;
  flipY?: boolean;
  imagePath: string;
  jsonPath?: string;
  profile: AsciiImageProfile;
  rotateQuarterTurns?: number;
  rows: number;
}) {
  const {
    atlasKey,
    columns,
    flipX = false,
    flipY = false,
    imagePath,
    jsonPath,
    profile,
    rotateQuarterTurns = 0,
    rows,
  } = props;
  const [frames, setFrames] = useState<AsciiFrame[]>([]);
  const cacheKey = useMemo(
    () =>
      getAsciiFrameCacheKey({
        atlasKey,
        columns,
        imagePath,
        jsonPath,
        profile,
        rows,
      }),
    [atlasKey, columns, imagePath, jsonPath, profile, rows],
  );

  useEffect(() => {
    let isMounted = true;
    let promise = ASCII_FRAME_CACHE.get(cacheKey);

    if (!promise) {
      promise = loadAsciiFrames({
        atlasKey,
        columns,
        imagePath,
        jsonPath,
        profile,
        rows,
      });
      ASCII_FRAME_CACHE.set(cacheKey, promise);
    }

    void promise.then((nextFrames) => {
      if (isMounted) {
        setFrames(nextFrames);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [atlasKey, cacheKey, columns, imagePath, jsonPath, profile, rows]);

  return useMemo(() => {
    const source = frames[0];

    if (!source) {
      return [] as AsciiFrame;
    }

    return flipFrame(rotateFrame(source, rotateQuarterTurns), flipX, flipY);
  }, [flipX, flipY, frames, rotateQuarterTurns]);
}

export function useAsciiImageRows(
  props: Parameters<typeof useAsciiImageFrame>[0],
) {
  const displayFrame = useAsciiImageFrame(props);

  return useMemo(() => displayFrame.map(buildRowRuns), [displayFrame]);
}
