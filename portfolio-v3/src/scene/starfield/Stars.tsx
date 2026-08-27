import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, InstancedMesh, Object3D, Vector3 } from "three";
import { CAMERA_PROPS } from "../canvas.constants";
import {
  MAX_VOLUMETRIC_STAR_BUCKET_COUNT,
  MAX_VOLUMETRIC_STAR_COUNT,
  type VolumetricStarfieldMode,
  type VolumetricStarfieldTuning,
  type VolumetricStarTuning,
} from "./starfield.constants";
import {
  createVisibleBounds,
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
  type Vec3Tuple,
} from "./starfield.math";

// Module-scoped scratches. Stars is a singleton component so it is safe to
// share these across re-mounts; mutating them inside useFrame avoids
// per-star-per-frame allocations (10k stars × 60fps).
const STAR_REFERENCE_BOUNDS = createVisibleBounds();
const STAR_VISIBLE_BOUNDS = createVisibleBounds();
const STAR_ORBIT_CENTER: Vec3Tuple = [0, 0, 0];

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
  fieldTuning: VolumetricStarfieldTuning,
): VirtualStar[] {
  const tuning = fieldTuning.stars;
  const random = mulberry32(tuning.seed);

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
    const angularSpeed = sampleNormal(
      random,
      tuning.angularSpeedRadiansPerSecond.mean,
      tuning.angularSpeedRadiansPerSecond.stdDev,
      tuning.angularSpeedRadiansPerSecond.min,
      tuning.angularSpeedRadiansPerSecond.max,
    );
    const direction = random() > 0.5 ? 1 : -1;

    return {
      angle: random() * Math.PI * 2,
      angularSpeed: angularSpeed * direction,
      bucketIndex: getNearestBucketIndex(emissiveIntensity, tuning),
      colorIndex: Math.floor(random() * tuning.colors.length),
      orbitRadiusRatio:
        tuning.minOrbitRadiusRatio +
        Math.sqrt(random()) * (1 - tuning.minOrbitRadiusRatio),
      orbitWellIndex: pickWeightedIndex(random, fieldTuning.orbitWells),
      size: sampleNormal(
        random,
        tuning.size.mean,
        tuning.size.stdDev,
        tuning.size.min,
        tuning.size.max,
      ),
      z: lerp(
        tuning.depthBand.nearestZ,
        tuning.depthBand.farthestZ,
        depthProgress,
      ),
    };
  });
}

/* Each mode's deterministic layout is built at most once per page lifetime.
   Returning to a mode reuses the cached array instead of sampling 10k stars. */
const STAR_POPULATION_CACHE = new Map<VolumetricStarfieldMode, VirtualStar[]>();

function getVirtualStars(
  mode: VolumetricStarfieldMode,
  tuning: VolumetricStarfieldTuning,
) {
  const cached = STAR_POPULATION_CACHE.get(mode);
  if (cached) {
    return cached;
  }

  const stars = createVirtualStars(tuning);
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
  const position = useMemo(() => new Vector3(), []);
  const { camera, size } = useThree();

  useFrame(({ clock }) => {
    const elapsedSeconds = clock.getElapsedTime();
    const bucketCounts = bucketCountsRef.current;
    bucketCounts.fill(0);

    for (const star of stars) {
      getVisibleBoundsAtZForPosition(
        camera,
        size,
        star.z,
        CAMERA_PROPS.position,
        fieldTuning.bounds.edgeBuffer,
        STAR_REFERENCE_BOUNDS,
      );
      const fieldRadius = getFieldRadius(
        STAR_REFERENCE_BOUNDS,
        fieldTuning.bounds.fieldRadiusMultiplier,
      );
      getOrbitCenter(
        star.orbitWellIndex,
        STAR_REFERENCE_BOUNDS,
        fieldRadius,
        fieldTuning.orbitWells,
        STAR_ORBIT_CENTER,
      );
      const orbitRadius = star.orbitRadiusRatio * fieldRadius;
      const angle = star.angle + elapsedSeconds * star.angularSpeed;
      getOrbitalPosition(
        STAR_ORBIT_CENTER,
        orbitRadius,
        angle,
        star.z,
        position,
      );

      getVisibleBoundsAtZ(
        camera,
        size,
        star.z,
        fieldTuning.bounds.edgeBuffer,
        STAR_VISIBLE_BOUNDS,
      );
      if (!isInsideBounds(position, STAR_VISIBLE_BOUNDS, star.size)) {
        continue;
      }

      const mesh = meshRefs.current[star.bucketIndex];
      if (!mesh) {
        continue;
      }

      const instanceIndex = bucketCounts[star.bucketIndex]++;
      dummy.position.copy(position);
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

      mesh.count = bucketCounts[i] ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
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
