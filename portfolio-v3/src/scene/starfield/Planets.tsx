import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial } from "three";
import { PlaneGeometry, Quaternion, Vector3 } from "three";
import { CAMERA_PROPS } from "../canvas.constants";
import getCameraFacingRotation from "../ui3d/utils/getCameraFacingRotation";
import {
  type VolumetricPlanetTuning,
  type VolumetricStarfieldMode,
  type VolumetricStarfieldTuning,
} from "./starfield.constants";
import {
  createEntropySeed,
  createVisibleBounds,
  getCinematicOrbitalAngularSpeed,
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
import { getPlanetAtlasKeys, type PlanetAtlas } from "./planet-atlas";
import {
  ensurePlanetAtlasesLoading,
  subscribePlanetAtlases,
} from "./planet-atlas-cache";

const FULL_TURN_RADIANS = Math.PI * 2;

// Module-scoped scratches reused by every PlanetSprite useFrame call. The R3F
// frame loop runs each callback sequentially, so sharing these is safe and
// avoids per-sprite-per-frame allocations.
const PLANET_REFERENCE_BOUNDS = createVisibleBounds();
const PLANET_VISIBLE_BOUNDS = createVisibleBounds();
const PLANET_ORBIT_CENTER: Vec3Tuple = [0, 0, 0];
const PLANET_ROTATION: Vec3Tuple = [0, 0, 0];
const PLANET_SESSION_SEEDS: Record<VolumetricStarfieldMode, number> = {
  "3d": createEntropySeed(),
  ascii: createEntropySeed(),
};

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

function createVirtualPlanets(
  mode: VolumetricStarfieldMode,
  fieldTuning: VolumetricStarfieldTuning,
): VirtualPlanet[] {
  const tuning = fieldTuning.planets;
  const seed = fieldTuning.useDeterministicLayout
    ? tuning.seed
    : PLANET_SESSION_SEEDS[mode];
  const random = mulberry32(seed);
  const atlasKeys = getPlanetAtlasKeys();

  return Array.from({ length: tuning.virtualCount }, (_, index) => {
    const depthProgress = sampleNormal(
      random,
      tuning.depthDistribution.mean,
      tuning.depthDistribution.stdDev,
      tuning.depthDistribution.min,
      tuning.depthDistribution.max,
    );
    const baseAngularSpeed = sampleNormal(
      random,
      tuning.angularSpeedRadiansPerSecond.mean,
      tuning.angularSpeedRadiansPerSecond.stdDev,
      tuning.angularSpeedRadiansPerSecond.min,
      tuning.angularSpeedRadiansPerSecond.max,
    );
    const directionRandom = random();
    const angle = random() * Math.PI * 2;
    const assetKey = atlasKeys[Math.floor(random() * atlasKeys.length)];
    const frameRate = sampleNormal(
      random,
      tuning.frameRate.mean,
      tuning.frameRate.stdDev,
      tuning.frameRate.min,
      tuning.frameRate.max,
    );
    const frameTimeOffset = random() * 100;
    const orbitRadiusRatio =
      tuning.minOrbitRadiusRatio +
      Math.sqrt(random()) * (1 - tuning.minOrbitRadiusRatio);
    const orbitWellIndex = pickWeightedIndex(random, fieldTuning.orbitWells);
    const sizeScale = sampleNormal(
      random,
      tuning.sizeScale.mean,
      tuning.sizeScale.stdDev,
      tuning.sizeScale.min,
      tuning.sizeScale.max,
    );
    const z = lerp(
      tuning.depthBand.nearestZ,
      tuning.depthBand.farthestZ,
      depthProgress,
    );

    return {
      angle,
      angularSpeed: getCinematicOrbitalAngularSpeed({
        baseAngularSpeed,
        cameraZ: CAMERA_PROPS.position[2],
        directionRandom,
        orbitRadiusRatio,
        orbitWell: fieldTuning.orbitWells[orbitWellIndex],
        tuning: tuning.orbitalMotion,
        z,
      }),
      assetKey,
      frameRate,
      frameTimeOffset,
      id: index,
      orbitRadiusRatio,
      orbitWellIndex,
      sizeScale,
      z,
    };
  });
}

interface PlanetSpriteProps {
  atlas: PlanetAtlas;
  fieldTuning: VolumetricStarfieldTuning;
  planet: VirtualPlanet;
  tuning: VolumetricPlanetTuning;
}

function PlanetSpriteInner({
  atlas,
  fieldTuning,
  planet,
  tuning,
}: PlanetSpriteProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const spriteRotationRef = useRef<number | null>(null);
  const inverseFacingQuaternion = useMemo(() => new Quaternion(), []);
  const localLightDirection = useMemo(() => new Vector3(), []);
  const position = useMemo(() => new Vector3(), []);
  const worldLightDirection = useMemo(() => new Vector3(), []);
  const { camera, size } = useThree();
  /* Every clone needs independent UV offsets for sprite animation, but clones
     share the atlas Source and therefore one WebGLTexture. Do not dispose a
     clone on a render-mode swap: the module-level atlas cache intentionally
     keeps that shared GPU allocation alive for the page lifetime. */
  const texture = useMemo(() => atlas.texture.clone(), [atlas]);
  const planetWidth =
    atlas.frameWidth *
    tuning.pixelsToWorldUnit *
    planet.sizeScale *
    tuning.visualScale;
  const planetHeight =
    atlas.frameHeight *
    tuning.pixelsToWorldUnit *
    planet.sizeScale *
    tuning.visualScale;
  const planetRadius = Math.hypot(planetWidth, planetHeight) * 0.5;

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
      tuning.visibilityBuffer,
      PLANET_REFERENCE_BOUNDS,
    );
    getVisibleBoundsAtZ(
      camera,
      size,
      planet.z,
      tuning.visibilityBuffer,
      PLANET_VISIBLE_BOUNDS,
    );
    const fieldRadius = getFieldRadius(
      PLANET_REFERENCE_BOUNDS,
      fieldTuning.bounds.fieldRadiusMultiplier,
    );
    getOrbitCenter(
      planet.orbitWellIndex,
      PLANET_REFERENCE_BOUNDS,
      fieldRadius,
      fieldTuning.orbitWells,
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

    const isVisible = isInsideBounds(
      position,
      PLANET_VISIBLE_BOUNDS,
      planetRadius,
    );

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
    mesh.rotation.set(
      PLANET_ROTATION[0],
      PLANET_ROTATION[1],
      PLANET_ROTATION[2],
    );

    getOrbitWellFieldDirection(
      position,
      PLANET_REFERENCE_BOUNDS,
      fieldRadius,
      fieldTuning.orbitWells,
      worldLightDirection,
    );
    localLightDirection
      .copy(worldLightDirection)
      .applyQuaternion(inverseFacingQuaternion.copy(mesh.quaternion).invert());

    const targetSpriteRotation =
      Math.atan2(localLightDirection.y, localLightDirection.x) -
      tuning.rotation.illuminatedDirectionRadians;
    const spriteRotation =
      spriteRotationRef.current === null
        ? normalizeRadians(targetSpriteRotation)
        : dampRadians(
            spriteRotationRef.current,
            targetSpriteRotation,
            tuning.rotation.damping,
            delta,
          );

    spriteRotationRef.current = spriteRotation;
    mesh.rotateZ(spriteRotation);

    material.opacity = Math.min(
      tuning.maxOpacity,
      material.opacity + delta / tuning.fadeInSeconds,
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
        color={tuning.tint}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

const PlanetSprite = memo(PlanetSpriteInner);

const EMPTY_ATLAS_MAP: ReadonlyMap<string, PlanetAtlas> = new Map();

/* Session populations are sampled once, then retained across 2D detours and
   repeat 3D/ASCII transitions. Atlas textures remain in their existing shared
   cache; changing modes never starts another fetch or decode queue. */
const PLANET_POPULATION_CACHE = new Map<
  VolumetricStarfieldMode,
  VirtualPlanet[]
>();

function getVirtualPlanets(
  mode: VolumetricStarfieldMode,
  tuning: VolumetricStarfieldTuning,
) {
  const cached = PLANET_POPULATION_CACHE.get(mode);
  if (cached) {
    return cached;
  }

  const planets = createVirtualPlanets(mode, tuning);
  PLANET_POPULATION_CACHE.set(mode, planets);
  return planets;
}

export default function Planets({
  fieldTuning,
  mode,
}: {
  fieldTuning: VolumetricStarfieldTuning;
  mode: VolumetricStarfieldMode;
}) {
  const tuning = fieldTuning.planets;
  const planets = useMemo(
    () => getVirtualPlanets(mode, fieldTuning),
    [fieldTuning, mode],
  );
  const [atlasMap, setAtlasMap] =
    useState<ReadonlyMap<string, PlanetAtlas>>(EMPTY_ATLAS_MAP);

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
    <group>
      {planets.map((planet) => {
        const atlas = atlasMap.get(planet.assetKey);

        if (!atlas) {
          return null;
        }

        return (
          <PlanetSprite
            key={planet.id}
            atlas={atlas}
            fieldTuning={fieldTuning}
            planet={planet}
            tuning={tuning}
          />
        );
      })}
    </group>
  );
}
