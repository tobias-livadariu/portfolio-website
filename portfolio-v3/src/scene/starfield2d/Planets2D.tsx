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
import { clamp, lerp, sampleNormal } from "../starfield/starfield.math";
import { getTwoDimensionalMenuExclusionRadiusPx } from "../ui3d/main-menu.constants";
import { PLANETS_2D } from "./starfield2d.constants";

const PLANET_PLANE_GEOMETRY = new PlaneGeometry(1, 1);

interface VirtualPlanet2D {
  assetKey: string;
  frameRate: number;
  frameTimeOffset: number;
  id: number;
  sizeScale: number;
  spawnAngle: number;
  spawnRadius: number;
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
  if (!PLANETS_2D.enabled) {
    return [];
  }

  const atlasKeys = getPlanetAtlasKeys();
  const fieldRadius = getFieldRadius(viewportWidth, viewportHeight);
  const exclusionRadius = Math.min(
    fieldRadius,
    getTwoDimensionalMenuExclusionRadiusPx(viewportWidth, viewportHeight),
  );
  const count = Math.min(
    PLANETS_2D.maximumCount,
    Math.max(
      PLANETS_2D.minimumCount,
      Math.round(
        Math.PI *
          (fieldRadius ** 2 - exclusionRadius ** 2) *
          (PLANETS_2D.densityPerMegapixel / 1_000_000) *
          PLANETS_2D.densityMultiplier,
      ),
    ),
  );

  return Array.from({ length: count }, (_, index) => {
    const frameRate = sampleNormal(
      Math.random,
      PLANETS_2D.frameRate.mean,
      PLANETS_2D.frameRate.stdDev,
      PLANETS_2D.frameRate.min,
      PLANETS_2D.frameRate.max,
    );

    return {
      assetKey: atlasKeys[Math.floor(Math.random() * atlasKeys.length)],
      frameRate,
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
      spawnRadius: sampleRingRadius(fieldRadius, exclusionRadius),
    };
  });
}

interface CircularPlanetBody {
  alpha: number;
  angle: number;
  angularSpeed: number;
  radius: number;
  rotation: number;
}

function getFirstVisibleOrbitAngle(
  radius: number,
  planetHalfSize: number,
  viewportHeight: number,
) {
  const expandedViewportBottom = viewportHeight + planetHalfSize;
  if (radius <= expandedViewportBottom) {
    const leftEdgeLead = Math.asin(
      clamp(planetHalfSize / Math.max(radius, 1), 0, 1),
    );

    return Math.PI * 1.5 - leftEdgeLead;
  }

  const bottomEdgeOffset = Math.acos(
    clamp(expandedViewportBottom / radius, 0, 1),
  );

  return Math.PI * 1.5 + bottomEdgeOffset;
}

function getNormalizedSizeScale(sizeScale: number) {
  const sizeRange = PLANETS_2D.sizeScale.max - PLANETS_2D.sizeScale.min;

  return clamp(
    (sizeScale - PLANETS_2D.sizeScale.min) / Math.max(sizeRange, 0.0001),
    0,
    1,
  );
}

function getOrbitAngularSpeed(sizeScale: number) {
  const normalizedSize = getNormalizedSizeScale(sizeScale);
  const speedProgress = lerp(
    Math.random(),
    normalizedSize,
    clamp(PLANETS_2D.orbitSpeed.apparentSizeInfluence, 0, 1),
  );
  const speedMultiplier = lerp(
    PLANETS_2D.orbitSpeed.minimumBaselineMultiplier,
    PLANETS_2D.orbitSpeed.maximumBaselineMultiplier,
    speedProgress,
  );

  return (
    ((PLANETS_2D.orbitSpeed.baselineDegreesPerSecond * Math.PI) / 180) *
    speedMultiplier
  );
}

function createBody(
  planet: VirtualPlanet2D,
  planetSize: number,
  viewportHeight: number,
): CircularPlanetBody {
  const angularSpeed = getOrbitAngularSpeed(planet.sizeScale);
  const fadeDurationSeconds =
    1 / Math.max(PLANETS_2D.fadeInAlphaPerSecond, 0.0001);
  const fadeLeadRadians =
    angularSpeed * fadeDurationSeconds * PLANETS_2D.offscreenFadeLeadMultiplier;
  const paddingLeadRadians =
    PLANETS_2D.offscreenSpawnPaddingPx / Math.max(planet.spawnRadius, 1);
  const safeOffscreenSpawnAngle =
    getFirstVisibleOrbitAngle(
      planet.spawnRadius,
      planetSize * 0.5,
      viewportHeight,
    ) - Math.max(fadeLeadRadians, paddingLeadRadians);
  /* Treat the random angle as elapsed orbit phase measured from a safe
     offscreen point. This starts with an evenly distributed field while
     guaranteeing every partially transparent planet is still off screen. */
  const initialPhaseRadians = planet.spawnAngle;
  const prewarmedAlpha = Math.min(
    1,
    (initialPhaseRadians / Math.max(angularSpeed, 0.0001)) *
      PLANETS_2D.fadeInAlphaPerSecond,
  );

  return {
    alpha: prewarmedAlpha,
    angle: safeOffscreenSpawnAngle + initialPhaseRadians,
    angularSpeed,
    radius: planet.spawnRadius,
    rotation:
      safeOffscreenSpawnAngle +
      initialPhaseRadians +
      (PLANETS_2D.lightFacingRotationOffsetDegrees * Math.PI) / 180,
  };
}

interface PlanetSprite2DProps {
  atlas: PlanetAtlas;
  planet: VirtualPlanet2D;
  viewportHeight: number;
  viewportWidth: number;
}

function PlanetSprite2DInner({
  atlas,
  planet,
  viewportHeight,
  viewportWidth,
}: PlanetSprite2DProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const bodyRef = useRef<CircularPlanetBody | null>(null);
  const lastFrameIndexRef = useRef(-1);
  /* UV transforms are per-planet, while the clone's atlas Source and its GPU
     allocation are shared with 3D/ASCII. The atlas cache owns that source for
     the page lifetime, so disposing clones here would force costly re-uploads
     every time the user changes render mode. */
  const texture = useMemo(() => atlas.texture.clone(), [atlas]);
  const planetSize = atlas.frameWidth * planet.sizeScale;
  const apparentDepth =
    getNormalizedSizeScale(planet.sizeScale) * PLANETS_2D.apparentDepthRangePx;

  if (bodyRef.current === null) {
    bodyRef.current = createBody(planet, planetSize, viewportHeight);
  }

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    const body = bodyRef.current;

    if (!mesh || !material || !body) {
      return;
    }

    const deltaSeconds = Math.min(delta, 1 / 30);

    body.angle =
      (body.angle + body.angularSpeed * deltaSeconds) % (Math.PI * 2);
    body.rotation =
      body.angle +
      (PLANETS_2D.lightFacingRotationOffsetDegrees * Math.PI) / 180;

    body.alpha = Math.min(
      1,
      body.alpha + deltaSeconds * PLANETS_2D.fadeInAlphaPerSecond,
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
    if (!isOnScreen) {
      return;
    }

    const frameIndex =
      Math.floor(
        (clock.getElapsedTime() + planet.frameTimeOffset) * planet.frameRate,
      ) % atlas.frames.length;
    if (frameIndex !== lastFrameIndexRef.current) {
      const frame = atlas.frames[frameIndex];
      texture.repeat.set(
        frame.w / atlas.textureWidth,
        frame.h / atlas.textureHeight,
      );
      texture.offset.set(
        frame.x / atlas.textureWidth,
        1 - (frame.y + frame.h) / atlas.textureHeight,
      );
      lastFrameIndexRef.current = frameIndex;
    }

    mesh.position.set(x, y, apparentDepth);
    mesh.rotation.z = body.rotation;
    material.opacity = body.alpha;
  });

  return (
    <mesh
      frustumCulled={false}
      geometry={PLANET_PLANE_GEOMETRY}
      ref={meshRef}
      renderOrder={1}
      scale={[planetSize, planetSize, 1]}
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
  planet: VirtualPlanet2D;
  viewportHeight: number;
  viewportWidth: number;
}

function PlanetSlot2D({
  atlasMap,
  planet,
  viewportHeight,
  viewportWidth,
}: PlanetSlot2DProps) {
  const atlas = atlasMap.get(planet.assetKey);

  if (!atlas) {
    return null;
  }

  return (
    <PlanetSprite2D
      atlas={atlas}
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
            planet={planet}
            key={`${size.width}x${size.height}-${planet.id}`}
            viewportHeight={size.height}
            viewportWidth={size.width}
          />
        );
      })}
    </group>
  );
}
