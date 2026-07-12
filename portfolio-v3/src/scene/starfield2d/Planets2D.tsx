import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial } from "three";
import { PlaneGeometry } from "three";
import {
  getPlanetAtlasKeys,
  type PlanetAtlas,
} from "../starfield/planet-atlas";
import {
  ensurePlanetAtlasesLoading,
  subscribePlanetAtlases,
} from "../starfield/planet-atlas-cache";
import { lerp, sampleNormal } from "../starfield/starfield.math";
import { getFlatMenuExclusionRadiusPx } from "../ui3d/main-menu.constants";
import { PLANETS_2D } from "./starfield2d.constants";

const PLANET_PLANE_GEOMETRY = new PlaneGeometry(1, 1);

interface VirtualPlanet2D {
  assetKey: string;
  frameTimeOffset: number;
  id: number;
  revision: number;
  sizeScale: number;
  spawnAngle: number;
  spawnRadius: number;
}

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/* Uniform-area sampling of a ring between the center exclusion radius and the
   field edge, mirroring the v2 spawn distribution. */
function sampleRingRadius(fieldRadius: number, exclusionRadius: number) {
  const innerRadius2 = exclusionRadius ** 2;
  const outerRadius2 = fieldRadius ** 2;

  return Math.sqrt(lerp(innerRadius2, outerRadius2, Math.random()));
}

function getFieldRadius(viewportWidth: number, viewportHeight: number) {
  return (
    (Math.hypot(viewportWidth, viewportHeight) / 2) *
    PLANETS_2D.fieldRadiusMultiplier
  );
}

function createVirtualPlanets2D(
  viewportWidth: number,
  viewportHeight: number,
): VirtualPlanet2D[] {
  const atlasKeys = getPlanetAtlasKeys();
  const fieldRadius = getFieldRadius(viewportWidth, viewportHeight);
  const exclusionRadius = getFlatMenuExclusionRadiusPx(
    viewportWidth,
    viewportHeight,
  );
  const count = Math.min(
    PLANETS_2D.maxCount,
    Math.max(
      PLANETS_2D.minCount,
      Math.round(
        Math.PI *
          (fieldRadius ** 2 - exclusionRadius ** 2) *
          PLANETS_2D.densityPerPx2,
      ),
    ),
  );

  return Array.from({ length: count }, (_, index) => ({
    assetKey: atlasKeys[Math.floor(Math.random() * atlasKeys.length)],
    frameTimeOffset: Math.random() * 100,
    id: index,
    revision: 0,
    sizeScale: sampleNormal(
      Math.random,
      PLANETS_2D.sizeScale.mean,
      PLANETS_2D.sizeScale.stdDev,
      PLANETS_2D.sizeScale.min,
      PLANETS_2D.sizeScale.max,
    ),
    spawnAngle: Math.random() * Math.PI * 2,
    spawnRadius: sampleRingRadius(fieldRadius, exclusionRadius),
  }));
}

function rerollVirtualPlanet2D(
  planet: VirtualPlanet2D,
  viewportWidth: number,
  viewportHeight: number,
): VirtualPlanet2D {
  const atlasKeys = getPlanetAtlasKeys();
  const exclusionRadius = getFlatMenuExclusionRadiusPx(
    viewportWidth,
    viewportHeight,
  );

  return {
    assetKey: atlasKeys[Math.floor(Math.random() * atlasKeys.length)],
    frameTimeOffset: Math.random() * 100,
    id: planet.id,
    revision: planet.revision + 1,
    sizeScale: sampleNormal(
      Math.random,
      PLANETS_2D.sizeScale.mean,
      PLANETS_2D.sizeScale.stdDev,
      PLANETS_2D.sizeScale.min,
      PLANETS_2D.sizeScale.max,
    ),
    spawnAngle: Math.random() * Math.PI * 2,
    spawnRadius: sampleRingRadius(
      getFieldRadius(viewportWidth, viewportHeight),
      exclusionRadius,
    ),
  };
}

interface CircularPlanetBody {
  alpha: number;
  angle: number;
  angularSpeed: number;
  radius: number;
  rotation: number;
}

function createBody(planet: VirtualPlanet2D): CircularPlanetBody {
  const variance = PLANETS_2D.orbitSpeedVariance;

  return {
    alpha: 0,
    angle: planet.spawnAngle,
    angularSpeed:
      PLANETS_2D.orbitRadiansPerSecond *
      randomInRange(1 - variance, 1 + variance),
    radius: planet.spawnRadius,
    rotation: planet.spawnAngle - Math.PI / 4,
  };
}

interface PlanetSprite2DProps {
  atlas: PlanetAtlas;
  onRecycle: () => void;
  planet: VirtualPlanet2D;
  viewportHeight: number;
  viewportWidth: number;
}

function PlanetSprite2DInner({
  atlas,
  onRecycle,
  planet,
  viewportHeight,
  viewportWidth,
}: PlanetSprite2DProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const bodyRef = useRef<CircularPlanetBody | null>(null);
  const hasEnteredViewportRef = useRef(false);
  const hasRecycledRef = useRef(false);
  const texture = useMemo(() => atlas.texture.clone(), [atlas]);
  const planetSize = atlas.frameWidth * planet.sizeScale;

  if (bodyRef.current === null) {
    bodyRef.current = createBody(planet);
  }

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    const body = bodyRef.current;

    if (!mesh || !material || !body) {
      return;
    }

    const deltaSeconds = Math.min(delta, 1 / 30);

    body.angle += body.angularSpeed * deltaSeconds;
    body.rotation += body.angularSpeed * deltaSeconds;

    body.alpha = Math.min(
      1,
      body.alpha + deltaSeconds * PLANETS_2D.fadeInAlphaPerSecond,
    );

    const frameIndex =
      Math.floor(
        (clock.getElapsedTime() + planet.frameTimeOffset) *
          PLANETS_2D.framesPerSecond,
      ) % atlas.frames.length;
    const frame = atlas.frames[frameIndex];

    texture.repeat.set(
      frame.w / atlas.textureWidth,
      frame.h / atlas.textureHeight,
    );
    texture.offset.set(
      frame.x / atlas.textureWidth,
      1 - (frame.y + frame.h) / atlas.textureHeight,
    );

    const x = Math.cos(body.angle) * body.radius;
    const y = Math.sin(body.angle) * body.radius;
    const halfSize = planetSize * 0.5;
    const isOnScreen =
      x >= -halfSize &&
      x <= viewportWidth + halfSize &&
      y <= halfSize &&
      y >= -viewportHeight - halfSize;

    mesh.visible = isOnScreen;

    if (isOnScreen) {
      hasEnteredViewportRef.current = true;
    } else if (hasEnteredViewportRef.current && !hasRecycledRef.current) {
      hasRecycledRef.current = true;
      onRecycle();
      return;
    }

    mesh.position.set(x, y, 0);
    mesh.rotation.z = body.rotation;
    mesh.scale.set(planetSize, planetSize, 1);
    material.opacity = body.alpha;
  });

  return (
    <mesh
      frustumCulled={false}
      geometry={PLANET_PLANE_GEOMETRY}
      ref={meshRef}
      renderOrder={1}
    >
      <meshBasicMaterial
        alphaTest={0.02}
        depthWrite={false}
        map={texture}
        opacity={0}
        ref={materialRef}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}

const PlanetSprite2D = memo(PlanetSprite2DInner);

interface PlanetSlot2DProps {
  atlasMap: ReadonlyMap<string, PlanetAtlas>;
  initialPlanet: VirtualPlanet2D;
  viewportHeight: number;
  viewportWidth: number;
}

function PlanetSlot2D({
  atlasMap,
  initialPlanet,
  viewportHeight,
  viewportWidth,
}: PlanetSlot2DProps) {
  const [planet, setPlanet] = useState(initialPlanet);
  const atlas = atlasMap.get(planet.assetKey);

  if (!atlas) {
    return null;
  }

  return (
    <PlanetSprite2D
      atlas={atlas}
      key={planet.revision}
      onRecycle={() => {
        setPlanet((current) =>
          rerollVirtualPlanet2D(current, viewportWidth, viewportHeight),
        );
      }}
      planet={planet}
      viewportHeight={viewportHeight}
      viewportWidth={viewportWidth}
    />
  );
}

const EMPTY_ATLAS_MAP: ReadonlyMap<string, PlanetAtlas> = new Map();

export default function Planets2D() {
  const { size } = useThree();
  const [atlasMap, setAtlasMap] =
    useState<ReadonlyMap<string, PlanetAtlas>>(EMPTY_ATLAS_MAP);
  const planets = useMemo(
    () => createVirtualPlanets2D(size.width, size.height),
    [size.width, size.height],
  );
  useEffect(() => {
    ensurePlanetAtlasesLoading();

    return subscribePlanetAtlases((atlas) => {
      setAtlasMap((previous) => {
        if (previous.has(atlas.key)) {
          return previous;
        }

        const next = new Map(previous);
        next.set(atlas.key, atlas);
        return next;
      });
    });
  }, []);

  return (
    <group position={[-size.width / 2, size.height / 2, 0]}>
      {planets.map((planet) => {
        return (
          <PlanetSlot2D
            atlasMap={atlasMap}
            initialPlanet={planet}
            key={`${size.width}x${size.height}-${planet.id}`}
            viewportHeight={size.height}
            viewportWidth={size.width}
          />
        );
      })}
    </group>
  );
}
