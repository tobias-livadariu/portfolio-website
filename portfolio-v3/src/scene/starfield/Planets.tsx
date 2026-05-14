import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial } from "three";
import { Vector3 } from "three";
import type { ReadonlyVec3 } from "../../types/geometry";
import { CAMERA_PROPS } from "../canvas.constants";
import getCameraFacingRotation from "../ui3d/utils/getCameraFacingRotation";
import {
  PLANETS,
  STARFIELD_DEPTH,
  STARFIELD_ORBIT_WELLS,
} from "./starfield.constants";
import {
  getFieldRadius,
  getOrbitCenter,
  getOrbitalPosition,
  getVisibleBoundsAtZ,
  getVisibleBoundsAtZForPosition,
  isInsideBounds,
  lerp,
  mulberry32,
  pickWeightedIndex,
  sampleNormal,
} from "./starfield.math";
import {
  getPlanetAtlasKeys,
  loadPlanetAtlases,
  type PlanetAtlas,
} from "./planet-atlas";

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

function PlanetSprite({ atlas, planet }: PlanetSpriteProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const position = useMemo(() => new Vector3(), []);
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
    const referenceBounds = getVisibleBoundsAtZForPosition(
      camera,
      size,
      planet.z,
      CAMERA_PROPS.position,
      PLANETS.visibilityBuffer,
    );
    const visibleBounds = getVisibleBoundsAtZ(
      camera,
      size,
      planet.z,
      PLANETS.visibilityBuffer,
    );
    const fieldRadius = getFieldRadius(referenceBounds);
    const orbitCenter = getOrbitCenter(
      planet.orbitWellIndex,
      referenceBounds,
      fieldRadius,
    );
    const orbitRadius = planet.orbitRadiusRatio * fieldRadius;
    const angle = planet.angle + elapsedSeconds * planet.angularSpeed;
    getOrbitalPosition(orbitCenter, orbitRadius, angle, planet.z, position);

    const isVisible = isInsideBounds(position, visibleBounds, planetRadius);

    mesh.visible = isVisible;
    if (!isVisible) {
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

    const rotation = getCameraFacingRotation(
      [position.x, position.y, position.z] satisfies ReadonlyVec3,
      [camera.position.x, camera.position.y, camera.position.z],
    );
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);

    material.opacity = Math.min(
      1,
      material.opacity + delta / PLANETS.fadeInSeconds,
    );
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
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

export default function Planets() {
  const planets = useMemo(() => createVirtualPlanets(), []);
  const loadedAtlasesRef = useRef<PlanetAtlas[]>([]);
  const [loadedAtlases, setLoadedAtlases] = useState<PlanetAtlas[]>([]);
  const atlasMap = useMemo(
    () => new Map(loadedAtlases.map((atlas) => [atlas.key, atlas])),
    [loadedAtlases],
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadPlanetAtlases((atlas) => {
      if (controller.signal.aborted) {
        return;
      }

      loadedAtlasesRef.current.push(atlas);
      setLoadedAtlases([...loadedAtlasesRef.current]);
    }, controller.signal);

    return () => {
      controller.abort();
      for (const atlas of loadedAtlasesRef.current) {
        atlas.texture.dispose();
      }
      loadedAtlasesRef.current = [];
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
