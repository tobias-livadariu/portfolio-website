import { getSceneElapsedSeconds, getSceneTimeScale } from "../scene-time";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, InstancedBufferAttribute, InstancedMesh } from "three";
import { Color, Matrix4, PlaneGeometry } from "three";
import { getTwinkleMultiplier } from "../starfield/starfield.math";
import { STARS_2D } from "./starfield2d.constants";

const STAR_PLANE_GEOMETRY = new PlaneGeometry(1, 1);

interface Star2D {
  color: string;
  size: number;
  // Largest swing either side of the star's own colour.
  twinkleAmplitude: number;
  /* Cycles per second of the slower twinkle wave; 0 for a star that holds a
     steady brightness. */
  twinkleFrequency: number;
  // Starting points of the two twinkle waves, each from 0 to 1.
  twinklePhase: number;
  twinkleSecondaryPhase: number;
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
  const fieldRadius =
    (Math.hypot(viewportWidth, viewportHeight) / 2) *
    STARS_2D.fieldRadiusMultiplier;
  const count = Math.min(
    STARS_2D.maxCount,
    Math.max(
      STARS_2D.minCount,
      Math.round(Math.PI * fieldRadius ** 2 * STARS_2D.densityPerPx2),
    ),
  );

  return Array.from({ length: count }, () => {
    // sqrt sampling keeps the area density uniform across the disc.
    const radius = Math.sqrt(Math.random()) * fieldRadius;
    const angle = Math.random() * Math.PI * 2;
    const twinklePeriodSeconds =
      STARS_2D.twinkle.periodSeconds.min +
      Math.random() *
        (STARS_2D.twinkle.periodSeconds.max -
          STARS_2D.twinkle.periodSeconds.min);

    return {
      color:
        STARS_2D.colors[Math.floor(Math.random() * STARS_2D.colors.length)],
      size: pickStarSize(),
      twinkleAmplitude:
        STARS_2D.twinkle.amplitude.min +
        Math.random() *
          (STARS_2D.twinkle.amplitude.max - STARS_2D.twinkle.amplitude.min),
      twinkleFrequency:
        Math.random() < STARS_2D.twinkle.starFraction
          ? 1 / twinklePeriodSeconds
          : 0,
      twinklePhase: Math.random(),
      twinkleSecondaryPhase: Math.random(),
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });
}

/* Kept outside the component: the mesh ref is also read by the layout effect,
   and the hooks lint rule does not allow a frame callback to assign through
   a value an effect has used. */
function flagForUpload(attribute: InstancedBufferAttribute) {
  attribute.needsUpdate = true;
}

export default function Stars2D() {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<InstancedMesh>(null);
  const { size } = useThree();
  const stars = useMemo(
    () => createStars(size.width, size.height),
    [size.width, size.height],
  );
  // Only the stars that twinkle are visited and rewritten each frame.
  const twinkling = useMemo(() => {
    const color = new Color();
    const indices: number[] = [];
    const baseColors: number[] = [];

    stars.forEach((star, index) => {
      if (star.twinkleFrequency > 0) {
        color.set(star.color);
        indices.push(index);
        baseColors.push(color.r, color.g, color.b);
      }
    });

    return { baseColors, indices };
  }, [stars]);

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
        STARS_2D.orbitRadiansPerSecond *
        Math.min(delta, 0.1) *
        getSceneTimeScale();
    }

    const colors = meshRef.current?.instanceColor;

    if (!colors) {
      return;
    }

    if (twinkling.indices.length === 0) {
      return;
    }

    const elapsedSeconds = getSceneElapsedSeconds();

    for (let index = 0; index < twinkling.indices.length; index++) {
      const star = stars[twinkling.indices[index]];
      const multiplier = getTwinkleMultiplier(
        elapsedSeconds,
        star.twinkleFrequency,
        star.twinklePhase,
        star.twinkleSecondaryPhase,
        star.twinkleAmplitude,
      );
      const baseOffset = index * 3;

      colors.setXYZ(
        twinkling.indices[index],
        twinkling.baseColors[baseOffset] * multiplier,
        twinkling.baseColors[baseOffset + 1] * multiplier,
        twinkling.baseColors[baseOffset + 2] * multiplier,
      );
    }

    flagForUpload(colors);
  });

  return (
    <group
      position={[-size.width / 2, size.height / 2, STARS_2D.zOffset]}
      ref={groupRef}
    >
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
