import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial } from "three";
import { PlaneGeometry, Quaternion, Vector3 } from "three";
import { CAMERA_PROPS } from "../canvas.constants";
import getCameraFacingRotation from "../ui3d/utils/getCameraFacingRotation";
import {
  PLANETS,
  STARFIELD_DEPTH,
  STARFIELD_ORBIT_WELLS,
} from "./starfield.constants";
import {
  createVisibleBounds,
  getFieldRadius,
  getOrbitCenter,
  getOrbitWellFieldDirection,
  getOrbitalPosition,
  getVisibleBoundsAtZ,
  getVisibleBoundsAtZForPosition,
  isInsideBounds,
  lerp,
  mulberry32,
  pickWeightedIndex,
  sampleNormal,
  type Vec3Tuple,
} from "./starfield.math";
import {
  getPlanetAtlasKeys,
  loadPlanetAtlases,
  type PlanetAtlas,
} from "./planet-atlas";

const FULL_TURN_RADIANS = Math.PI * 2;

// Module-scoped scratches reused by every PlanetSprite useFrame call. The R3F
// frame loop runs each callback sequentially, so sharing these is safe and
// avoids per-sprite-per-frame allocations.
const PLANET_REFERENCE_BOUNDS = createVisibleBounds();
const PLANET_VISIBLE_BOUNDS = createVisibleBounds();
const PLANET_ORBIT_CENTER: Vec3Tuple = [0, 0, 0];
const PLANET_ROTATION: Vec3Tuple = [0, 0, 0];

// Every planet sprite is a 1x1 plane scaled per-sprite via `mesh.scale.set(...)`,
// so all 300 sprites can share a single geometry instance.
const PLANET_PLANE_GEOMETRY = new PlaneGeometry(1, 1);

function normalizeRadians(radians: number) {
  return (
    ((((radians + Math.PI) % FULL_TURN_RADIANS) + FULL_TURN_RADIANS) %
      FULL_TURN_RADIANS) -
    Math.PI
  );
}

function dampRadians(
  current: number,
  target: number,
  damping: number,
  deltaSeconds: number,
) {
  const delta = normalizeRadians(target - current);
  const progress = 1 - Math.exp(-damping * deltaSeconds);

  return normalizeRadians(current + delta * progress);
}

interface VirtualPlanet {
  angle: number;
  angularSpeed: number;
  assetKey: string;
  frameRate: number;
  frameTimeOffset: number;
  id: number;
  orbitRadiusRatio: number;
  orbitWellIndex: number;
  sizeScale: number;
  z: number;
}

function createVirtualPlanets(): VirtualPlanet[] {
  const random = mulberry32(PLANETS.seed);
  const atlasKeys = getPlanetAtlasKeys();

  return Array.from({ length: PLANETS.virtualCount }, (_, index) => {
    const depthProgress = sampleNormal(
      random,
      PLANETS.depth.mean,
      PLANETS.depth.stdDev,
      PLANETS.depth.min,
      PLANETS.depth.max,
    );
    const angularSpeed = sampleNormal(
      random,
      PLANETS.angularSpeedRadiansPerSecond.mean,
      PLANETS.angularSpeedRadiansPerSecond.stdDev,
      PLANETS.angularSpeedRadiansPerSecond.min,
      PLANETS.angularSpeedRadiansPerSecond.max,
    );
    const direction = random() > 0.5 ? 1 : -1;

    return {
      angle: random() * Math.PI * 2,
      angularSpeed: angularSpeed * direction,
      assetKey: atlasKeys[Math.floor(random() * atlasKeys.length)],
      frameRate: sampleNormal(
        random,
        PLANETS.frameRate.mean,
        PLANETS.frameRate.stdDev,
        PLANETS.frameRate.min,
        PLANETS.frameRate.max,
      ),
      frameTimeOffset: random() * 100,
      id: index,
      orbitRadiusRatio:
        PLANETS.minOrbitRadiusRatio +
        Math.sqrt(random()) * (1 - PLANETS.minOrbitRadiusRatio),
      orbitWellIndex: pickWeightedIndex(random, STARFIELD_ORBIT_WELLS),
      sizeScale: sampleNormal(
        random,
        PLANETS.sizeScale.mean,
        PLANETS.sizeScale.stdDev,
        PLANETS.sizeScale.min,
        PLANETS.sizeScale.max,
      ),
      z: lerp(
        STARFIELD_DEPTH.planets.nearestZ,
        STARFIELD_DEPTH.planets.farthestZ,
        depthProgress,
      ),
    };
  });
}

interface PlanetSpriteProps {
  atlas: PlanetAtlas;
  planet: VirtualPlanet;
}

function PlanetSpriteInner({ atlas, planet }: PlanetSpriteProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const spriteRotationRef = useRef<number | null>(null);
  const inverseFacingQuaternion = useMemo(() => new Quaternion(), []);
  const localLightDirection = useMemo(() => new Vector3(), []);
  const position = useMemo(() => new Vector3(), []);
  const worldLightDirection = useMemo(() => new Vector3(), []);
  const { camera, size } = useThree();
  const texture = useMemo(() => atlas.texture.clone(), [atlas]);
  const planetWidth =
    atlas.frameWidth * PLANETS.pixelsToWorldUnit * planet.sizeScale;
  const planetHeight =
    atlas.frameHeight * PLANETS.pixelsToWorldUnit * planet.sizeScale;
  const planetRadius = Math.hypot(planetWidth, planetHeight) * 0.5;

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;

    if (!mesh || !material) {
      return;
    }

    const elapsedSeconds = clock.getElapsedTime();
    getVisibleBoundsAtZForPosition(
      camera,
      size,
      planet.z,
      CAMERA_PROPS.position,
      PLANETS.visibilityBuffer,
      PLANET_REFERENCE_BOUNDS,
    );
    getVisibleBoundsAtZ(
      camera,
      size,
      planet.z,
      PLANETS.visibilityBuffer,
      PLANET_VISIBLE_BOUNDS,
    );
    const fieldRadius = getFieldRadius(PLANET_REFERENCE_BOUNDS);
    getOrbitCenter(
      planet.orbitWellIndex,
      PLANET_REFERENCE_BOUNDS,
      fieldRadius,
      PLANET_ORBIT_CENTER,
    );
    const orbitRadius = planet.orbitRadiusRatio * fieldRadius;
    const angle = planet.angle + elapsedSeconds * planet.angularSpeed;
    getOrbitalPosition(
      PLANET_ORBIT_CENTER,
      orbitRadius,
      angle,
      planet.z,
      position,
    );

    const isVisible = isInsideBounds(position, PLANET_VISIBLE_BOUNDS, planetRadius);

    mesh.visible = isVisible;
    if (!isVisible) {
      spriteRotationRef.current = null;
      return;
    }

    const frameIndex =
      Math.floor((elapsedSeconds + planet.frameTimeOffset) * planet.frameRate) %
      atlas.frames.length;
    const frame = atlas.frames[frameIndex];
    texture.repeat.set(
      frame.w / atlas.textureWidth,
      frame.h / atlas.textureHeight,
    );
    texture.offset.set(
      frame.x / atlas.textureWidth,
      1 - (frame.y + frame.h) / atlas.textureHeight,
    );

    mesh.position.copy(position);
    mesh.scale.set(planetWidth, planetHeight, 1);

    getCameraFacingRotation(position, camera.position, PLANET_ROTATION);
    mesh.rotation.set(PLANET_ROTATION[0], PLANET_ROTATION[1], PLANET_ROTATION[2]);

    getOrbitWellFieldDirection(
      position,
      PLANET_REFERENCE_BOUNDS,
      fieldRadius,
      worldLightDirection,
    );
    localLightDirection.copy(worldLightDirection).applyQuaternion(
      inverseFacingQuaternion.copy(mesh.quaternion).invert(),
    );

    const targetSpriteRotation =
      Math.atan2(localLightDirection.y, localLightDirection.x) -
      PLANETS.rotation.illuminatedDirectionRadians;
    const spriteRotation =
      spriteRotationRef.current === null
        ? normalizeRadians(targetSpriteRotation)
        : dampRadians(
            spriteRotationRef.current,
            targetSpriteRotation,
            PLANETS.rotation.damping,
            delta,
          );

    spriteRotationRef.current = spriteRotation;
    mesh.rotateZ(spriteRotation);

    material.opacity = Math.min(
      1,
      material.opacity + delta / PLANETS.fadeInSeconds,
    );
  });

  return (
    <mesh
      ref={meshRef}
      geometry={PLANET_PLANE_GEOMETRY}
      frustumCulled={false}
      renderOrder={1}
    >
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0}
        alphaTest={0.02}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

const PlanetSprite = memo(PlanetSpriteInner);

const EMPTY_ATLAS_MAP: ReadonlyMap<string, PlanetAtlas> = new Map();

export default function Planets() {
  const planets = useMemo(() => createVirtualPlanets(), []);
  const [atlasMap, setAtlasMap] =
    useState<ReadonlyMap<string, PlanetAtlas>>(EMPTY_ATLAS_MAP);

  useEffect(() => {
    const controller = new AbortController();
    const owned: PlanetAtlas[] = [];

    void loadPlanetAtlases((atlas) => {
      if (controller.signal.aborted) {
        return;
      }

      owned.push(atlas);
      setAtlasMap((previous) => {
        const next = new Map(previous);
        next.set(atlas.key, atlas);
        return next;
      });
    }, controller.signal);

    return () => {
      controller.abort();
      for (const atlas of owned) {
        atlas.texture.dispose();
      }
    };
  }, []);

  return (
    <group>
      {planets.map((planet) => {
        const atlas = atlasMap.get(planet.assetKey);

        if (!atlas) {
          return null;
        }

        return <PlanetSprite key={planet.id} atlas={atlas} planet={planet} />;
      })}
    </group>
  );
}
