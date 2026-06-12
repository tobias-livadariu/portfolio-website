import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial } from "three";
import { PlaneGeometry } from "three";
import { getPlanetAtlasKeys, type PlanetAtlas } from "../starfield/planet-atlas";
import {
  ensurePlanetAtlasesLoading,
  subscribePlanetAtlases,
} from "../starfield/planet-atlas-cache";
import { lerp, sampleNormal } from "../starfield/starfield.math";
import {
  createGravityWells,
  resolveWellPositions,
  stepPlanetBody,
  type GravityWell,
  type Planet2DBody,
} from "./gravity-wells";
import { PLANETS_2D } from "./starfield2d.constants";

const PLANET_PLANE_GEOMETRY = new PlaneGeometry(1, 1);

interface VirtualPlanet2D {
  assetKey: string;
  frameTimeOffset: number;
  id: number;
  sizeScale: number;
  spawnAngle: number;
  spawnRadius: number;
}

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/* Uniform-area sampling of a ring between the center exclusion radius and the
   field edge, mirroring the v2 spawn distribution. */
function sampleRingRadius(fieldRadius: number) {
  const innerRadius2 = PLANETS_2D.exclusionRadiusPx ** 2;
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
  const count = Math.min(
    PLANETS_2D.maxCount,
    Math.max(
      PLANETS_2D.minCount,
      Math.round(viewportWidth * viewportHeight * PLANETS_2D.densityPerPx2),
    ),
  );

  return Array.from({ length: count }, (_, index) => ({
    assetKey: atlasKeys[Math.floor(Math.random() * atlasKeys.length)],
    frameTimeOffset: Math.random() * 100,
    id: index,
    sizeScale: sampleNormal(
      Math.random,
      PLANETS_2D.sizeScale.mean,
      PLANETS_2D.sizeScale.stdDev,
      PLANETS_2D.sizeScale.min,
      PLANETS_2D.sizeScale.max,
    ),
    spawnAngle: Math.random() * Math.PI * 2,
    spawnRadius: sampleRingRadius(fieldRadius),
  }));
}

function createBody(planet: VirtualPlanet2D): Planet2DBody {
  const speed = randomInRange(
    PLANETS_2D.initialSpeedPxPerSecond.min,
    PLANETS_2D.initialSpeedPxPerSecond.max,
  );
  const direction = Math.random() * Math.PI * 2;
  const rotationDirection = Math.random() > 0.5 ? 1 : -1;

  return {
    alpha: 0,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed:
      rotationDirection *
      randomInRange(
        PLANETS_2D.selfRotationRadiansPerSecond.min,
        PLANETS_2D.selfRotationRadiansPerSecond.max,
      ),
    vx: Math.cos(direction) * speed,
    vy: Math.sin(direction) * speed,
    x: Math.cos(planet.spawnAngle) * planet.spawnRadius,
    y: Math.sin(planet.spawnAngle) * planet.spawnRadius,
  };
}

function respawnBody(body: Planet2DBody, fieldRadius: number) {
  const radius = sampleRingRadius(fieldRadius);
  const angle = Math.random() * Math.PI * 2;
  const speed = randomInRange(
    PLANETS_2D.initialSpeedPxPerSecond.min,
    PLANETS_2D.initialSpeedPxPerSecond.max,
  );
  const direction = Math.random() * Math.PI * 2;

  body.alpha = 0;
  body.vx = Math.cos(direction) * speed;
  body.vy = Math.sin(direction) * speed;
  body.x = Math.cos(angle) * radius;
  body.y = Math.sin(angle) * radius;
}

interface PlanetSprite2DProps {
  atlas: PlanetAtlas;
  fieldRadius: number;
  planet: VirtualPlanet2D;
  wellPositions: Float32Array;
  wells: GravityWell[];
}

function PlanetSprite2DInner({
  atlas,
  fieldRadius,
  planet,
  wellPositions,
  wells,
}: PlanetSprite2DProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const bodyRef = useRef<Planet2DBody | null>(null);
  const texture = useMemo(() => atlas.texture.clone(), [atlas]);
  const planetSize = atlas.frameWidth * planet.sizeScale;
  const recycleRadius = fieldRadius * PLANETS_2D.recycleRadiusMultiplier;

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

    stepPlanetBody(body, wells, wellPositions, deltaSeconds);

    if (Math.hypot(body.x, body.y) > recycleRadius) {
      respawnBody(body, fieldRadius);
    }

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

    mesh.position.set(body.x, body.y, 0);
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

const EMPTY_ATLAS_MAP: ReadonlyMap<string, PlanetAtlas> = new Map();

export default function Planets2D() {
  const { size } = useThree();
  const [atlasMap, setAtlasMap] =
    useState<ReadonlyMap<string, PlanetAtlas>>(EMPTY_ATLAS_MAP);
  const planets = useMemo(
    () => createVirtualPlanets2D(size.width, size.height),
    [size.width, size.height],
  );
  const wells = useMemo(() => createGravityWells(), []);
  const wellPositions = useMemo(
    () => new Float32Array(wells.length * 2),
    [wells],
  );
  const fieldRadius = getFieldRadius(size.width, size.height);

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

  /* This parent mounts (and therefore subscribes its frame callback) before
     any sprite child, so well positions are fresh when sprites step. */
  useFrame(({ clock }) => {
    resolveWellPositions(
      wells,
      clock.getElapsedTime(),
      size.width,
      size.height,
      wellPositions,
    );
  });

  return (
    <group>
      {planets.map((planet) => {
        const atlas = atlasMap.get(planet.assetKey);

        if (!atlas) {
          return null;
        }

        return (
          <PlanetSprite2D
            atlas={atlas}
            fieldRadius={fieldRadius}
            key={`${size.width}x${size.height}-${planet.id}`}
            planet={planet}
            wellPositions={wellPositions}
            wells={wells}
          />
        );
      })}
    </group>
  );
}
