import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, InstancedMesh } from "three";
import { Color, Matrix4, PlaneGeometry } from "three";
import { STAR_COLORS } from "../starfield/starfield.constants";
import { STARS_2D } from "./starfield2d.constants";

const STAR_PLANE_GEOMETRY = new PlaneGeometry(1, 1);

interface Star2D {
  color: string;
  size: number;
  x: number;
  y: number;
}

function pickStarSize() {
  const roll = Math.random();
  let cumulative = 0;

  for (const { size, weight } of STARS_2D.sizes) {
    cumulative += weight;

    if (roll < cumulative) {
      return size;
    }
  }

  return STARS_2D.sizes[STARS_2D.sizes.length - 1].size;
}

function createStars(viewportWidth: number, viewportHeight: number): Star2D[] {
  const count = Math.min(
    STARS_2D.maxCount,
    Math.max(
      STARS_2D.minCount,
      Math.round(viewportWidth * viewportHeight * STARS_2D.densityPerPx2),
    ),
  );
  const fieldRadius =
    (Math.hypot(viewportWidth, viewportHeight) / 2) *
    STARS_2D.fieldRadiusMultiplier;

  return Array.from({ length: count }, () => {
    // sqrt sampling keeps the area density uniform across the disc.
    const radius = Math.sqrt(Math.random()) * fieldRadius;
    const angle = Math.random() * Math.PI * 2;

    return {
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      size: pickStarSize(),
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });
}

export default function Stars2D() {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<InstancedMesh>(null);
  const { size } = useThree();
  const stars = useMemo(
    () => createStars(size.width, size.height),
    [size.width, size.height],
  );

  useEffect(() => {
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    const matrix = new Matrix4();
    const color = new Color();

    stars.forEach((star, index) => {
      matrix.makeScale(star.size, star.size, 1);
      matrix.setPosition(star.x, star.y, 0);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, color.set(star.color));
    });

    mesh.instanceMatrix.needsUpdate = true;

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [stars]);

  useFrame((_, delta) => {
    const group = groupRef.current;

    if (group) {
      group.rotation.z +=
        STARS_2D.orbitRadiansPerSecond * Math.min(delta, 0.1);
    }
  });

  return (
    <group position-z={STARS_2D.zOffset} ref={groupRef}>
      <instancedMesh
        args={[STAR_PLANE_GEOMETRY, undefined, stars.length]}
        frustumCulled={false}
        key={stars.length}
        ref={meshRef}
        renderOrder={0}
      >
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
