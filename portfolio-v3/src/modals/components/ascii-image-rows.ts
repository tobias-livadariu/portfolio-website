import { useEffect, useMemo, useState } from "react";
import publicPath from "../../utility/public-path";

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

const ASCII_RAMP = " .:-=+*#%@";
export const ASCII_FRAME_CACHE = new Map<string, Promise<AsciiFrame[]>>();
export const TRANSPARENT_CELL: AsciiCell = { char: " ", color: "transparent" };

function getBrightness(red: number, green: number, blue: number) {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

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

async function loadImage(path: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = publicPath(path);

  await image.decode();

  return image;
}

function frameToAscii(
  image: HTMLImageElement,
  source: { h: number; w: number; x: number; y: number },
  columns: number,
  rows: number,
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  canvas.width = columns;
  canvas.height = rows;

  if (!context) {
    return [];
  }

  context.clearRect(0, 0, columns, rows);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    image,
    source.x,
    source.y,
    source.w,
    source.h,
    0,
    0,
    columns,
    rows,
  );

  const pixels = context.getImageData(0, 0, columns, rows).data;

  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      const offset = (row * columns + column) * 4;
      const alpha = pixels[offset + 3] / 255;

      if (alpha < 0.08) {
        return TRANSPARENT_CELL;
      }

      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const rampIndex = Math.min(
        ASCII_RAMP.length - 1,
        Math.floor((getBrightness(red, green, blue) / 255) * ASCII_RAMP.length),
      );

      return {
        char: ASCII_RAMP[rampIndex],
        color: colorString(red, green, blue),
      };
    }),
  );
}

export async function loadAsciiFrames(props: {
  atlasKey?: string;
  columns: number;
  imagePath: string;
  jsonPath?: string;
  rows: number;
}) {
  const image = await loadImage(props.imagePath);

  if (!props.jsonPath) {
    return [
      frameToAscii(
        image,
        { x: 0, y: 0, w: image.naturalWidth, h: image.naturalHeight },
        props.columns,
        props.rows,
      ),
    ];
  }

  const atlas = (await fetch(publicPath(props.jsonPath)).then((response) =>
    response.json(),
  )) as AtlasJson;
  const animationKeys = Object.keys(atlas.animations ?? {});
  const animationKey = props.atlasKey ?? animationKeys[0] ?? "";
  const frameKeys =
    atlas.animations?.[animationKey] ??
    atlas.animations?.[animationKeys[0] ?? ""] ??
    Object.keys(atlas.frames).slice(0, 1);

  return frameKeys
    .map((frameKey) => atlas.frames[frameKey])
    .filter((frame): frame is AtlasFrame => Boolean(frame))
    .map((frame) =>
      frameToAscii(image, frame.frame, props.columns, props.rows),
    );
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

export function useAsciiImageRows(props: {
  atlasKey?: string;
  columns: number;
  flipX?: boolean;
  flipY?: boolean;
  imagePath: string;
  jsonPath?: string;
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
    rotateQuarterTurns = 0,
    rows,
  } = props;
  const [frames, setFrames] = useState<AsciiFrame[]>([]);
  const cacheKey = useMemo(
    () => `${imagePath}|${jsonPath ?? ""}|${atlasKey ?? ""}|${columns}|${rows}`,
    [atlasKey, columns, imagePath, jsonPath, rows],
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
  }, [atlasKey, cacheKey, columns, imagePath, jsonPath, rows]);

  const displayFrame = useMemo(() => {
    const source = frames[0];

    if (!source) {
      return [] as AsciiFrame;
    }

    return flipFrame(rotateFrame(source, rotateQuarterTurns), flipX, flipY);
  }, [flipX, flipY, frames, rotateQuarterTurns]);

  return useMemo(() => displayFrame.map(buildRowRuns), [displayFrame]);
}
