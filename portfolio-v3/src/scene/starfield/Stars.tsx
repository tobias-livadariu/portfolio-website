import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, DynamicDrawUsage, InstancedMesh, Object3D } from "three";
import { CAMERA_PROPS } from "../canvas.constants";
import {
  MAX_VOLUMETRIC_STAR_BUCKET_COUNT,
  MAX_VOLUMETRIC_STAR_COUNT,
  type VolumetricStarfieldMode,
  type VolumetricStarfieldTuning,
  type VolumetricStarTuning,
} from "./starfield.constants";
import {
  createEntropySeed,
  createVisibleBounds,
  getCinematicOrbitalAngularSpeed,
  getFieldRadius,
  getOrbitCenter,
  getVisibleBoundsAtZForPosition,
  lerp,
  mulberry32,
  pickWeightedIndex,
  sampleNormal,
  type Vec3Tuple,
} from "./starfield.math";

const STAR_SESSION_SEEDS: Record<VolumetricStarfieldMode, number> = {
  "3d": createEntropySeed(),
  ascii: createEntropySeed(),
};

interface VirtualStar {
  angle: number;
  angularSpeed: number;
  bucketIndex: number;
  colorIndex: number;
  orbitRadiusRatio: number;
  orbitWellIndex: number;
  size: number;
  z: number;
}

interface StarFrameLayout {
  centerX: Float64Array;
  centerY: Float64Array;
  orbitRadius: Float64Array;
  visibleHalfHeight: Float64Array;
  visibleHalfWidth: Float64Array;
}

/* Projection, well placement, and orbit radii only change when the canvas or
   field tuning changes. Precomputing them removes several trigonometric and
   bounds calculations from each of the 10k per-frame star updates. */
function createStarFrameLayout(
  stars: readonly VirtualStar[],
  camera: Parameters<typeof getVisibleBoundsAtZForPosition>[0],
  size: { width: number; height: number },
  fieldTuning: VolumetricStarfieldTuning,
): StarFrameLayout {
  const centerX = new Float64Array(stars.length);
  const centerY = new Float64Array(stars.length);
  const orbitRadius = new Float64Array(stars.length);
  const visibleHalfHeight = new Float64Array(stars.length);
  const visibleHalfWidth = new Float64Array(stars.length);
  const referenceBounds = createVisibleBounds();
  const orbitCenter: Vec3Tuple = [0, 0, 0];

  for (let index = 0; index < stars.length; index++) {
    const star = stars[index];
    getVisibleBoundsAtZForPosition(
      camera,
      size,
      star.z,
      CAMERA_PROPS.position,
      fieldTuning.bounds.edgeBuffer,
      referenceBounds,
    );
    const fieldRadius = getFieldRadius(
      referenceBounds,
      fieldTuning.bounds.fieldRadiusMultiplier,
    );
    getOrbitCenter(
      star.orbitWellIndex,
      referenceBounds,
      fieldRadius,
      fieldTuning.orbitWells,
      orbitCenter,
    );

    centerX[index] = orbitCenter[0];
    centerY[index] = orbitCenter[1];
    orbitRadius[index] = star.orbitRadiusRatio * fieldRadius;
    visibleHalfHeight[index] =
      (referenceBounds.top - referenceBounds.bottom) * 0.5;
    visibleHalfWidth[index] =
      (referenceBounds.right - referenceBounds.left) * 0.5;
  }

  return {
    centerX,
    centerY,
    orbitRadius,
    visibleHalfHeight,
    visibleHalfWidth,
  };
}

function getNearestBucketIndex(value: number, tuning: VolumetricStarTuning) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < tuning.emissiveIntensity.buckets.length; i++) {
    const distance = Math.abs(value - tuning.emissiveIntensity.buckets[i]);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

function createVirtualStars(
  mode: VolumetricStarfieldMode,
  fieldTuning: VolumetricStarfieldTuning,
): VirtualStar[] {
  const tuning = fieldTuning.stars;
  const seed = fieldTuning.useDeterministicLayout
    ? tuning.seed
    : STAR_SESSION_SEEDS[mode];
  const random = mulberry32(seed);

  return Array.from({ length: tuning.virtualCount }, () => {
    const depthProgress = sampleNormal(
      random,
      tuning.depthDistribution.mean,
      tuning.depthDistribution.stdDev,
      tuning.depthDistribution.min,
      tuning.depthDistribution.max,
    );
    const emissiveIntensity = sampleNormal(
      random,
      tuning.emissiveIntensity.mean,
      tuning.emissiveIntensity.stdDev,
      tuning.emissiveIntensity.min,
      tuning.emissiveIntensity.max,
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
    const colorIndex = Math.floor(random() * tuning.colors.length);
    const orbitRadiusRatio =
      tuning.minOrbitRadiusRatio +
      Math.sqrt(random()) * (1 - tuning.minOrbitRadiusRatio);
    const orbitWellIndex = pickWeightedIndex(random, fieldTuning.orbitWells);
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
      bucketIndex: getNearestBucketIndex(emissiveIntensity, tuning),
      colorIndex,
      orbitRadiusRatio,
      orbitWellIndex,
      size: sampleNormal(
        random,
        tuning.size.mean,
        tuning.size.stdDev,
        tuning.size.min,
        tuning.size.max,
      ),
      z,
    };
  });
}

/* Each mode's session layout is built at most once per page lifetime. Returning
   to a mode reuses the cached array instead of sampling 10k stars again. */
const STAR_POPULATION_CACHE = new Map<VolumetricStarfieldMode, VirtualStar[]>();

function getVirtualStars(
  mode: VolumetricStarfieldMode,
  tuning: VolumetricStarfieldTuning,
) {
  const cached = STAR_POPULATION_CACHE.get(mode);
  if (cached) {
    return cached;
  }

  const stars = createVirtualStars(mode, tuning);
  STAR_POPULATION_CACHE.set(mode, stars);
  return stars;
}

export default function Stars({
  fieldTuning,
  mode,
}: {
  fieldTuning: VolumetricStarfieldTuning;
  mode: VolumetricStarfieldMode;
}) {
  const tuning = fieldTuning.stars;
  const meshRefs = useRef<(InstancedMesh | null)[]>([]);
  const stars = useMemo(
    () => getVirtualStars(mode, fieldTuning),
    [fieldTuning, mode],
  );
  const bucketCountsRef = useRef(
    new Uint32Array(MAX_VOLUMETRIC_STAR_BUCKET_COUNT),
  );
  const colorObjects = useMemo(
    () => tuning.colors.map((value) => new Color(value)),
    [tuning],
  );
  const dummy = useMemo(() => new Object3D(), []);
  const { camera, size } = useThree();
  const frameLayout = useMemo(
    () => createStarFrameLayout(stars, camera, size, fieldTuning),
    [camera, fieldTuning, size, stars],
  );

  useFrame(({ clock }) => {
    const elapsedSeconds = clock.getElapsedTime();
    const bucketCounts = bucketCountsRef.current;
    bucketCounts.fill(0);

    for (let starIndex = 0; starIndex < stars.length; starIndex++) {
      const star = stars[starIndex];
      const angle = star.angle + elapsedSeconds * star.angularSpeed;
      const x =
        frameLayout.centerX[starIndex] +
        Math.cos(angle) * frameLayout.orbitRadius[starIndex];
      const y =
        frameLayout.centerY[starIndex] +
        Math.sin(angle) * frameLayout.orbitRadius[starIndex];
      const halfWidth = frameLayout.visibleHalfWidth[starIndex];
      const halfHeight = frameLayout.visibleHalfHeight[starIndex];

      if (
        x < camera.position.x - halfWidth - star.size ||
        x > camera.position.x + halfWidth + star.size ||
        y < camera.position.y - halfHeight - star.size ||
        y > camera.position.y + halfHeight + star.size
      ) {
        continue;
      }

      const mesh = meshRefs.current[star.bucketIndex];
      if (!mesh) {
        continue;
      }

      const instanceIndex = bucketCounts[star.bucketIndex]++;
      dummy.position.set(x, y, star.z);
      dummy.rotation.set(0, 0, angle);
      dummy.scale.setScalar(star.size * tuning.visualScale);
      dummy.updateMatrix();

      mesh.setMatrixAt(instanceIndex, dummy.matrix);
      mesh.setColorAt(instanceIndex, colorObjects[star.colorIndex]);
    }

    for (let i = 0; i < meshRefs.current.length; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) {
        continue;
      }

      const visibleCount = bucketCounts[i] ?? 0;
      mesh.count = visibleCount;
      mesh.instanceMatrix.clearUpdateRanges();
      if (visibleCount > 0) {
        mesh.instanceMatrix.addUpdateRange(0, visibleCount * 16);
        mesh.instanceMatrix.needsUpdate = true;
      }
      if (mesh.instanceColor) {
        if (mesh.instanceColor.usage !== DynamicDrawUsage) {
          mesh.instanceColor.setUsage(DynamicDrawUsage);
        }
        mesh.instanceColor.clearUpdateRanges();
        if (visibleCount > 0) {
          mesh.instanceColor.addUpdateRange(0, visibleCount * 3);
          mesh.instanceColor.needsUpdate = true;
        }
      }
    }
  });

  return (
    <group>
      {tuning.emissiveIntensity.buckets.map(
        (emissiveIntensity, bucketIndex) => (
          <instancedMesh
            key={bucketIndex}
            ref={(mesh) => {
              meshRefs.current[bucketIndex] = mesh;
              mesh?.instanceMatrix.setUsage(DynamicDrawUsage);
            }}
            args={[undefined, undefined, MAX_VOLUMETRIC_STAR_COUNT]}
            frustumCulled={false}
            renderOrder={0}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={tuning.colors[0]}
              emissive={tuning.colors[0]}
              emissiveIntensity={emissiveIntensity}
              roughness={1}
              metalness={0}
              toneMapped={false}
              vertexColors
            />
          </instancedMesh>
        ),
      )}
    </group>
  );
}
