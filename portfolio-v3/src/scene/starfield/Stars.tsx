import { getSceneElapsedSeconds } from "../scene-time";
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  DynamicDrawUsage,
  InstancedMesh,
  type WebGLProgramParametersWithUniforms,
} from "three";
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
  getFieldVolume,
  getOrbitCenter,
  getPopulationCount,
  getSmallScreenDensityMultiplier,
  getTwinkleMultiplier,
  getVisibleBoundsAtZForPosition,
  lerp,
  mulberry32,
  pickWeightedIndex,
  sampleBiasedDistance,
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
  // Largest swing either side of the star's own brightness.
  twinkleAmplitude: number;
  /* Cycles per second of the slower twinkle wave; 0 for a star that holds a
     steady brightness. */
  twinkleFrequency: number;
  // Starting points of the two twinkle waves, each from 0 to 1.
  twinklePhase: number;
  twinkleSecondaryPhase: number;
  z: number;
}

/* Twinkle timing draws from its own generator, salted from the layout seed,
   so adding it leaves every star's position, size, and colour as they were. */
const TWINKLE_SEED_SALT = 0x85ebca6b;
// Per-instance brightness multiplier read by the patched star shader.
const TWINKLE_ATTRIBUTE = "instanceTwinkle";

/* Scales a star's finished colour by its twinkle value. The stock material
   can only tint the lit part of a star per instance, not its glow, so the
   multiplier is applied to the two together at the very end. */
function addTwinkleToStarShader(shader: WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      `#include <common>
attribute float ${TWINKLE_ATTRIBUTE};
varying float vTwinkle;`,
    )
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
vTwinkle = ${TWINKLE_ATTRIBUTE};`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
varying float vTwinkle;`,
    )
    .replace(
      "#include <opaque_fragment>",
      `outgoingLight *= vTwinkle;
#include <opaque_fragment>`,
    );
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
  const twinkleRandom = mulberry32((seed ^ TWINKLE_SEED_SALT) >>> 0);

  /* The whole ceiling is sampled once. A screen draws the first N of it, so
     resizing only adds or removes stars at the end of the list. */
  return Array.from({ length: tuning.population.maximumCount }, () => {
    // All five are drawn for every star so the sequence never depends on
    // which stars happen to twinkle.
    const twinkles = twinkleRandom() < tuning.twinkle.starFraction;
    const twinklePeriodSeconds = lerp(
      tuning.twinkle.periodSeconds.min,
      tuning.twinkle.periodSeconds.max,
      twinkleRandom(),
    );
    const twinklePhase = twinkleRandom();
    const twinkleSecondaryPhase = twinkleRandom();
    const twinkleAmplitude = lerp(
      tuning.twinkle.amplitude.min,
      tuning.twinkle.amplitude.max,
      twinkleRandom(),
    );
    const z =
      CAMERA_PROPS.position[2] -
      sampleBiasedDistance(
        random(),
        CAMERA_PROPS.position[2] - tuning.depthBand.nearestZ,
        CAMERA_PROPS.position[2] - tuning.depthBand.farthestZ,
        tuning.population.cameraBias,
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
      twinkleAmplitude,
      twinkleFrequency: twinkles ? 1 / twinklePeriodSeconds : 0,
      twinklePhase,
      twinkleSecondaryPhase,
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
  /* One brightness value per instance, per bucket mesh. Filled with 1 so a
     slot drawn before its first update is a steady star, not a black one. */
  const twinkleArrays = useMemo(
    () =>
      tuning.emissiveIntensity.buckets.map(() =>
        new Float32Array(MAX_VOLUMETRIC_STAR_COUNT).fill(1),
      ),
    [tuning],
  );
  const colorObjects = useMemo(
    () => tuning.colors.map((value) => new Color(value)),
    [tuning],
  );
  const { camera, size } = useThree();
  const frameLayout = useMemo(
    () => createStarFrameLayout(stars, camera, size, fieldTuning),
    [camera, fieldTuning, size, stars],
  );
  /* How many of the sampled stars this screen draws: the configured density
     times the volume of space the star field fills at this aspect ratio,
     raised on small screens by the population's `smallScreenBoost`. */
  const activeCount = useMemo(
    () =>
      getPopulationCount(
        tuning.population.densityPer1000CubicUnits *
          getSmallScreenDensityMultiplier(
            size.width * size.height,
            tuning.population.smallScreenBoost,
          ),
        getFieldVolume({
          aspect: size.width / Math.max(1, size.height),
          buffer: fieldTuning.bounds.edgeBuffer,
          farthestDistance:
            CAMERA_PROPS.position[2] - tuning.depthBand.farthestZ,
          fieldRadiusMultiplier: fieldTuning.bounds.fieldRadiusMultiplier,
          nearestDistance: CAMERA_PROPS.position[2] - tuning.depthBand.nearestZ,
          tanHalfFov: Math.tan((CAMERA_PROPS.fov * Math.PI) / 360),
        }),
        Math.min(tuning.population.maximumCount, stars.length),
      ),
    [fieldTuning, size.height, size.width, stars.length, tuning],
  );

  useFrame(() => {
    const elapsedSeconds = getSceneElapsedSeconds();
    const bucketCounts = bucketCountsRef.current;
    bucketCounts.fill(0);

    for (let starIndex = 0; starIndex < activeCount; starIndex++) {
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

      /* The arithmetic Matrix4.compose() performs for a Z-only quaternion and
         a uniform scale, written straight into the instance buffer. Routing
         every star through an Object3D (Euler -> Quaternion -> Matrix4 ->
         copy) cost several object updates per star per frame. */
      const quaternionZ = Math.sin(angle / 2);
      const quaternionZ2 = quaternionZ + quaternionZ;
      const zz = quaternionZ * quaternionZ2;
      const wz = Math.cos(angle / 2) * quaternionZ2;
      const scale = star.size * tuning.visualScale;
      const matrix = mesh.instanceMatrix.array;
      const matrixOffset = instanceIndex * 16;

      matrix[matrixOffset] = (1 - zz) * scale;
      matrix[matrixOffset + 1] = wz * scale;
      matrix[matrixOffset + 2] = 0;
      matrix[matrixOffset + 3] = 0;
      matrix[matrixOffset + 4] = -wz * scale;
      matrix[matrixOffset + 5] = (1 - zz) * scale;
      matrix[matrixOffset + 6] = 0;
      matrix[matrixOffset + 7] = 0;
      matrix[matrixOffset + 8] = 0;
      matrix[matrixOffset + 9] = 0;
      matrix[matrixOffset + 10] = scale;
      matrix[matrixOffset + 11] = 0;
      matrix[matrixOffset + 12] = x;
      matrix[matrixOffset + 13] = y;
      matrix[matrixOffset + 14] = star.z;
      matrix[matrixOffset + 15] = 1;

      mesh.geometry.attributes[TWINKLE_ATTRIBUTE].array[instanceIndex] =
        star.twinkleFrequency > 0
          ? getTwinkleMultiplier(
              elapsedSeconds,
              star.twinkleFrequency,
              star.twinklePhase,
              star.twinkleSecondaryPhase,
              star.twinkleAmplitude,
            )
          : 1;

      if (!mesh.instanceColor) {
        // setColorAt() lazily allocates the attribute (and the shader variant).
        mesh.setColorAt(instanceIndex, colorObjects[star.colorIndex]);
      } else {
        const color = colorObjects[star.colorIndex];
        const colors = mesh.instanceColor.array;
        const colorOffset = instanceIndex * 3;

        colors[colorOffset] = color.r;
        colors[colorOffset + 1] = color.g;
        colors[colorOffset + 2] = color.b;
      }
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
      const twinkleAttribute = mesh.geometry.attributes[TWINKLE_ATTRIBUTE];
      if ("clearUpdateRanges" in twinkleAttribute) {
        twinkleAttribute.clearUpdateRanges();
        if (visibleCount > 0) {
          twinkleAttribute.addUpdateRange(0, visibleCount);
          twinkleAttribute.needsUpdate = true;
        }
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
            <boxGeometry args={[1, 1, 1]}>
              <instancedBufferAttribute
                args={[twinkleArrays[bucketIndex], 1]}
                attach={`attributes-${TWINKLE_ATTRIBUTE}`}
                usage={DynamicDrawUsage}
              />
            </boxGeometry>
            <meshStandardMaterial
              onBeforeCompile={addTwinkleToStarShader}
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
