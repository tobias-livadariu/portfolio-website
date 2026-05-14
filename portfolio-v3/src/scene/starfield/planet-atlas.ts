import {
  ClampToEdgeWrapping,
  NearestFilter,
  SRGBColorSpace,
  Texture,
  TextureLoader,
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

export async function loadPlanetAtlases(
  onAtlasReady: (atlas: PlanetAtlas) => void,
  signal?: AbortSignal,
) {
  const textureLoader = new TextureLoader();

  for (const type of PLANET_TYPES) {
    for (let variant = 1; variant <= PLANETS.variantsPerType; variant++) {
      if (signal?.aborted) {
        return;
      }

      const key = getPlanetAtlasKey(type, variant);
      const atlasBasePath = `${PLANETS.assetBasePath}/${type}/${key}`;
      const jsonUrl = publicPath(`${atlasBasePath}.json`);
      const textureUrl = publicPath(`${atlasBasePath}.png`);

      try {
        const [atlasJson, texture] = await Promise.all([
          fetch(jsonUrl, { signal }).then((response) => {
            if (!response.ok) {
              throw new Error(`Failed to load ${jsonUrl}`);
            }

            return response.json() as Promise<AtlasJson>;
          }),
          textureLoader.loadAsync(textureUrl),
        ]);

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
          continue;
        }

        onAtlasReady({
          frameHeight: frames[0].sourceH,
          frameWidth: frames[0].sourceW,
          frames,
          key,
          texture,
          textureHeight: atlasJson.meta.size.h,
          textureWidth: atlasJson.meta.size.w,
          type,
          variant,
        });

        await nextFrame();
      } catch (error) {
        if (!signal?.aborted) {
          console.warn(`Failed to load planet atlas ${key}:`, error);
        }
      }
    }
  }
}
