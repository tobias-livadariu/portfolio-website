import {
  ClampToEdgeWrapping,
  ImageBitmapLoader,
  NearestFilter,
  SRGBColorSpace,
  Texture,
} from "three";
import publicPath from "../../utility/public-path";
import { PLANETS, PLANET_TYPES, type PlanetType } from "./starfield.constants";

interface AtlasJsonFrame {
  frame: {
    h: number;
    w: number;
    x: number;
    y: number;
  };
  sourceSize: {
    h: number;
    w: number;
  };
}

interface AtlasJson {
  animations: Record<string, string[]>;
  frames: Record<string, AtlasJsonFrame>;
  meta: {
    image: string;
    size: {
      h: number;
      w: number;
    };
  };
}

export interface PlanetFrame {
  h: number;
  sourceH: number;
  sourceW: number;
  w: number;
  x: number;
  y: number;
}

export interface PlanetAtlas {
  frameHeight: number;
  frameWidth: number;
  frames: PlanetFrame[];
  key: string;
  texture: Texture;
  textureHeight: number;
  textureWidth: number;
  type: PlanetType;
  variant: number;
}

export function getPlanetAtlasKey(type: PlanetType, variant: number) {
  return `${type}-${variant}`;
}

export function getPlanetAtlasKeys() {
  return PLANET_TYPES.flatMap((type) =>
    Array.from({ length: PLANETS.variantsPerType }, (_, index) =>
      getPlanetAtlasKey(type, index + 1),
    ),
  );
}

function configureTexture(texture: Texture) {
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
}

async function nextFrame() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function createBitmapLoader() {
  const loader = new ImageBitmapLoader();
  loader.setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none" });
  return loader;
}

async function loadAtlas(
  type: PlanetType,
  variant: number,
  bitmapLoader: ImageBitmapLoader,
  signal?: AbortSignal,
): Promise<PlanetAtlas | null> {
  const key = getPlanetAtlasKey(type, variant);
  const atlasBasePath = `${PLANETS.assetBasePath}/${type}/${key}`;
  const jsonUrl = publicPath(`${atlasBasePath}.json`);
  const textureUrl = publicPath(`${atlasBasePath}.png`);

  const [atlasJson, bitmap] = await Promise.all([
    fetch(jsonUrl, { signal }).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${jsonUrl}`);
      }

      return response.json() as Promise<AtlasJson>;
    }),
    bitmapLoader.loadAsync(textureUrl) as Promise<ImageBitmap>,
  ]);

  if (signal?.aborted) {
    bitmap.close?.();
    return null;
  }

  const texture = new Texture();
  texture.image = bitmap;
  texture.flipY = false;
  texture.needsUpdate = true;
  configureTexture(texture);

  const animationKeys = atlasJson.animations[key] ?? [];
  const frames = animationKeys
    .map((frameKey) => atlasJson.frames[frameKey])
    .filter((frame): frame is AtlasJsonFrame => Boolean(frame))
    .map((frame) => ({
      h: frame.frame.h,
      sourceH: frame.sourceSize.h,
      sourceW: frame.sourceSize.w,
      w: frame.frame.w,
      x: frame.frame.x,
      y: frame.frame.y,
    }));

  if (frames.length === 0) {
    console.warn(`No planet frames found for ${key}`);
    texture.dispose();
    return null;
  }

  return {
    frameHeight: frames[0].sourceH,
    frameWidth: frames[0].sourceW,
    frames,
    key,
    texture,
    textureHeight: atlasJson.meta.size.h,
    textureWidth: atlasJson.meta.size.w,
    type,
    variant,
  };
}

export async function loadPlanetAtlases(
  onAtlasReady: (atlas: PlanetAtlas) => void,
  signal?: AbortSignal,
) {
  const bitmapLoader = createBitmapLoader();
  const tasks: Array<Promise<PlanetAtlas | null>> = [];

  for (const type of PLANET_TYPES) {
    for (let variant = 1; variant <= PLANETS.variantsPerType; variant++) {
      const task = loadAtlas(type, variant, bitmapLoader, signal).catch(
        (error) => {
          if (!signal?.aborted) {
            const key = getPlanetAtlasKey(type, variant);
            console.warn(`Failed to load planet atlas ${key}:`, error);
          }
          return null;
        },
      );
      tasks.push(task);
    }
  }

  for (const task of tasks) {
    if (signal?.aborted) {
      return;
    }

    const atlas = await task;

    if (signal?.aborted) {
      atlas?.texture.dispose();
      return;
    }

    if (atlas) {
      onAtlasReady(atlas);
      await nextFrame();
    }
  }
}
