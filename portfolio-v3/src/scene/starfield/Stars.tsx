import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, InstancedMesh, Object3D, Vector3 } from "three";
import {
  STAR_COLORS,
  STARFIELD_DEPTH,
  STARFIELD_ORBIT_WELLS,
  STARS,
} from "./starfield.constants";
import {
  getFieldRadius,
  getOrbitCenter,
  getOrbitalPosition,
  getVisibleBoundsAtZ,
  isInsideBounds,
  lerp,
  mulberry32,
  pickWeightedIndex,
  sampleNormal,
} from "./starfield.math";

interface VirtualStar {
  angle: number;
  angularSpeed: number;
  bucketIndex: number;
  color: string;
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
      color: STAR_COLORS[Math.floor(random() * STAR_COLORS.length)],
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
        STARFIELD_DEPTH.nearestZ,
        STARFIELD_DEPTH.farthestZ,
        depthProgress,
      ),
    };
  });
}

export default function Stars() {
  const meshRefs = useRef<(InstancedMesh | null)[]>([]);
  const stars = useMemo(createVirtualStars, []);
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const position = useMemo(() => new Vector3(), []);
  const { camera, size } = useThree();

  useFrame(({ clock }) => {
    const elapsedSeconds = clock.getElapsedTime();
    const fieldRadius = getFieldRadius(camera, size);
    const bucketCounts = STARS.emissiveIntensity.buckets.map(() => 0);

    for (const star of stars) {
      const orbitCenter = getOrbitCenter(star.orbitWellIndex, fieldRadius);
      const orbitRadius = star.orbitRadiusRatio * fieldRadius;
      const angle = star.angle + elapsedSeconds * star.angularSpeed;
      getOrbitalPosition(orbitCenter, orbitRadius, angle, star.z, position);

      const bounds = getVisibleBoundsAtZ(camera, size, star.z);
      if (!isInsideBounds(position, bounds, star.size)) {
        continue;
      }

      const mesh = meshRefs.current[star.bucketIndex];
      if (!mesh) {
        continue;
      }

      const instanceIndex = bucketCounts[star.bucketIndex]++;
      dummy.position.copy(position);
      dummy.rotation.set(0, 0, angle);
      dummy.scale.setScalar(star.size);
      dummy.updateMatrix();

      mesh.setMatrixAt(instanceIndex, dummy.matrix);
      mesh.setColorAt(instanceIndex, color.set(star.color));
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
      {STARS.emissiveIntensity.buckets.map((emissiveIntensity, bucketIndex) => (
        <instancedMesh
          key={emissiveIntensity}
          ref={(mesh) => {
            meshRefs.current[bucketIndex] = mesh;
          }}
          args={[undefined, undefined, STARS.virtualCount]}
          frustumCulled={false}
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
