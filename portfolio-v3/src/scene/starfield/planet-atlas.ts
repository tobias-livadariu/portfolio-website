import {
  ClampToEdgeWrapping,
  ImageBitmapLoader,
  NearestFilter,
  SRGBColorSpace,
  Texture,
} from "three";
import publicPath from "../../utility/public-path";
import {
  PLANETS,
  PLANET_ATLAS_LOADING,
  PLANET_TYPES,
  type PlanetType,
} from "./starfield.constants";

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

interface BrowserScheduler {
  yield?: () => Promise<void>;
}

/* scheduler.yield() lets pending input run before atlas publication resumes.
   It is not available in every browser, so an animation-frame boundary remains
   the portable scheduling primitive and also guarantees the current atlas has
   had an opportunity to reach the renderer before another one is admitted. */
async function waitForAtlasPublicationOpportunity() {
  await nextFrame();

  const scheduler = (
    globalThis as typeof globalThis & { scheduler?: BrowserScheduler }
  ).scheduler;

  if (scheduler?.yield) {
    await scheduler.yield();
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
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

interface AtlasDescriptor {
  type: PlanetType;
  variant: number;
}

/* Load one variant of every planet type before moving to the next variant.
   The virtual populations and their random seeds remain unchanged; this only
   makes the progressively revealed field visually diverse sooner. */
function getAtlasLoadOrder(): AtlasDescriptor[] {
  return Array.from(
    { length: PLANETS.variantsPerType },
    (_, variantIndex) => variantIndex + 1,
  ).flatMap((variant) => PLANET_TYPES.map((type) => ({ type, variant })));
}

export async function loadPlanetAtlases(
  onAtlasReady: (atlas: PlanetAtlas) => void,
  signal?: AbortSignal,
) {
  const bitmapLoader = createBitmapLoader();
  const loadOrder = getAtlasLoadOrder();
  const workerCount = Math.min(
    Math.max(1, Math.floor(PLANET_ATLAS_LOADING.maximumConcurrentLoads)),
    loadOrder.length,
  );
  let nextAtlasIndex = 0;
  let hasPublishedAtlas = false;
  let publicationQueue = Promise.resolve();

  /* Workers may finish out of order, but publication is serialized. This caps
     decoded atlases waiting in memory at roughly the worker count and, more
     importantly, prevents multiple new textures from reaching Three's first
     GPU upload path during the same paint opportunity. */
  const publishAtlas = (atlas: PlanetAtlas) => {
    const publication = publicationQueue.then(async () => {
      if (hasPublishedAtlas) {
        await waitForAtlasPublicationOpportunity();
      }

      if (signal?.aborted) {
        atlas.texture.dispose();
        return;
      }

      onAtlasReady(atlas);
      hasPublishedAtlas = true;
    });

    publicationQueue = publication.catch(() => undefined);
    return publication;
  };

  const loadNextAtlas = async () => {
    while (!signal?.aborted) {
      const descriptor = loadOrder[nextAtlasIndex];
      nextAtlasIndex += 1;

      if (!descriptor) {
        return;
      }

      const { type, variant } = descriptor;
      const atlas = await loadAtlas(type, variant, bitmapLoader, signal).catch(
        (error) => {
          if (!signal?.aborted) {
            const key = getPlanetAtlasKey(type, variant);
            console.warn(`Failed to load planet atlas ${key}:`, error);
          }
          return null;
        },
      );

      if (signal?.aborted) {
        atlas?.texture.dispose();
        return;
      }

      if (atlas) {
        await publishAtlas(atlas);
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => loadNextAtlas()));
  await publicationQueue;
}
