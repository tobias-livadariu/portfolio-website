import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, InstancedMesh, Object3D, Vector3 } from "three";
import { CAMERA_PROPS } from "../canvas.constants";
import {
  STAR_COLORS,
  STARFIELD_DEPTH,
  STARFIELD_ORBIT_WELLS,
  STARS,
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

const STAR_COLOR_OBJECTS = STAR_COLORS.map((value) => new Color(value));

// Module-scoped scratches. Stars is a singleton component so it is safe to
// share these across re-mounts; mutating them inside useFrame avoids
// per-star-per-frame allocations (10k stars × 60fps).
const STAR_REFERENCE_BOUNDS = createVisibleBounds();
const STAR_VISIBLE_BOUNDS = createVisibleBounds();
const STAR_ORBIT_CENTER: Vec3Tuple = [0, 0, 0];
const STAR_BUCKET_COUNTS = new Uint32Array(STARS.emissiveIntensity.buckets.length);

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

function getNearestBucketIndex(value: number) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < STARS.emissiveIntensity.buckets.length; i++) {
    const distance = Math.abs(value - STARS.emissiveIntensity.buckets[i]);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

function createVirtualStars(): VirtualStar[] {
  const random = mulberry32(STARS.seed);

  return Array.from({ length: STARS.virtualCount }, () => {
    const depthProgress = sampleNormal(
      random,
      STARS.depth.mean,
      STARS.depth.stdDev,
      STARS.depth.min,
      STARS.depth.max,
    );
    const emissiveIntensity = sampleNormal(
      random,
      STARS.emissiveIntensity.mean,
      STARS.emissiveIntensity.stdDev,
      STARS.emissiveIntensity.min,
      STARS.emissiveIntensity.max,
    );
    const angularSpeed = sampleNormal(
      random,
      STARS.angularSpeedRadiansPerSecond.mean,
      STARS.angularSpeedRadiansPerSecond.stdDev,
      STARS.angularSpeedRadiansPerSecond.min,
      STARS.angularSpeedRadiansPerSecond.max,
    );
    const direction = random() > 0.5 ? 1 : -1;

    return {
      angle: random() * Math.PI * 2,
      angularSpeed: angularSpeed * direction,
      bucketIndex: getNearestBucketIndex(emissiveIntensity),
      colorIndex: Math.floor(random() * STAR_COLORS.length),
      orbitRadiusRatio:
        STARS.minOrbitRadiusRatio +
        Math.sqrt(random()) * (1 - STARS.minOrbitRadiusRatio),
      orbitWellIndex: pickWeightedIndex(random, STARFIELD_ORBIT_WELLS),
      size: sampleNormal(
        random,
        STARS.size.mean,
        STARS.size.stdDev,
        STARS.size.min,
        STARS.size.max,
      ),
      z: lerp(
        STARFIELD_DEPTH.stars.nearestZ,
        STARFIELD_DEPTH.stars.farthestZ,
        depthProgress,
      ),
    };
  });
}

export default function Stars() {
  const meshRefs = useRef<(InstancedMesh | null)[]>([]);
  const stars = useMemo(() => createVirtualStars(), []);
  const dummy = useMemo(() => new Object3D(), []);
  const position = useMemo(() => new Vector3(), []);
  const { camera, size } = useThree();

  useFrame(({ clock }) => {
    const elapsedSeconds = clock.getElapsedTime();
    STAR_BUCKET_COUNTS.fill(0);

    for (const star of stars) {
      getVisibleBoundsAtZForPosition(
        camera,
        size,
        star.z,
        CAMERA_PROPS.position,
        undefined,
        STAR_REFERENCE_BOUNDS,
      );
      const fieldRadius = getFieldRadius(STAR_REFERENCE_BOUNDS);
      getOrbitCenter(
        star.orbitWellIndex,
        STAR_REFERENCE_BOUNDS,
        fieldRadius,
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

      getVisibleBoundsAtZ(camera, size, star.z, undefined, STAR_VISIBLE_BOUNDS);
      if (!isInsideBounds(position, STAR_VISIBLE_BOUNDS, star.size)) {
        continue;
      }

      const mesh = meshRefs.current[star.bucketIndex];
      if (!mesh) {
        continue;
      }

      const instanceIndex = STAR_BUCKET_COUNTS[star.bucketIndex]++;
      dummy.position.copy(position);
      dummy.rotation.set(0, 0, angle);
      dummy.scale.setScalar(star.size);
      dummy.updateMatrix();

      mesh.setMatrixAt(instanceIndex, dummy.matrix);
      mesh.setColorAt(instanceIndex, STAR_COLOR_OBJECTS[star.colorIndex]);
    }

    for (let i = 0; i < meshRefs.current.length; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) {
        continue;
      }

      mesh.count = STAR_BUCKET_COUNTS[i] ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {STARS.emissiveIntensity.buckets.map((emissiveIntensity, bucketIndex) => (
        <instancedMesh
          key={emissiveIntensity}
          ref={(mesh) => {
            meshRefs.current[bucketIndex] = mesh;
          }}
          args={[undefined, undefined, STARS.virtualCount]}
          frustumCulled={false}
          renderOrder={0}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={STAR_COLORS[0]}
            emissive={STAR_COLORS[0]}
            emissiveIntensity={emissiveIntensity}
            roughness={1}
            metalness={0}
            toneMapped={false}
            vertexColors
          />
        </instancedMesh>
      ))}
    </group>
  );
}
