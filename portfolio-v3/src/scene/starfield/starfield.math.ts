import type { Camera } from "three";
import { PerspectiveCamera, Vector3 } from "three";
import type { ReadonlyVec3 } from "../../types/geometry";
import type { StarfieldOrbitWell } from "./starfield.constants";

export interface CinematicOrbitalMotionTuning {
  coherentDirectionProbability: number;
  keplerianFalloffInfluence: number;
  maximumAngularSpeedRadiansPerSecond: number;
  maximumSpeedMultiplier: number;
  minimumAngularSpeedRadiansPerSecond: number;
  minimumSpeedMultiplier: number;
  referenceDepthZ: number;
  referenceOrbitRadiusRatio: number;
  wellMassInfluence: number;
}

export interface VisibleBounds {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export type Vec3Tuple = [number, number, number];

export function createVisibleBounds(): VisibleBounds {
  return { bottom: 0, left: 0, right: 0, top: 0 };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

export function mulberry32(seed: number) {
  return function nextRandom() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/* Produces a page-session seed without replacing the seeded generator used by
   population creation. This gives nondeterministic profiles a fresh layout on
   reload while keeping them stable across remounts, resizes, and mode changes. */
export function createEntropySeed() {
  const values = new Uint32Array(1);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
    return values[0];
  }

  return Math.floor(Math.random() * 0x1_0000_0000);
}

export function sampleNormal(
  random: () => number,
  mean: number,
  stdDev: number,
  min: number,
  max: number,
) {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  const standardNormal =
    Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2);
  return clamp(mean + standardNormal * stdDev, min, max);
}

export function pickWeightedIndex(
  random: () => number,
  entries: readonly { weight: number }[],
) {
  const totalWeight = entries.reduce((total, entry) => total + entry.weight, 0);
  let threshold = random() * totalWeight;

  for (let i = 0; i < entries.length; i++) {
    threshold -= entries[i].weight;
    if (threshold <= 0) {
      return i;
    }
  }

  return entries.length - 1;
}

/* A circular Kepler orbit has angular speed sqrt(mu / radius^3). The renderer's
   perspective-plane radius grows linearly with camera distance, so
   `orbitRadiusRatio * cameraDistance` is a viewport-independent proxy for its
   semi-major axis. Applying the relationship once while creating a population
   gives us physically legible depth without adding work to the frame loop. */
export function getCinematicOrbitalAngularSpeed({
  baseAngularSpeed,
  cameraZ,
  directionRandom,
  orbitRadiusRatio,
  orbitWell,
  tuning,
  z,
}: {
  baseAngularSpeed: number;
  cameraZ: number;
  directionRandom: number;
  orbitRadiusRatio: number;
  orbitWell: StarfieldOrbitWell;
  tuning: CinematicOrbitalMotionTuning;
  z: number;
}) {
  const referenceSemiMajorAxis =
    Math.max(tuning.referenceOrbitRadiusRatio, Number.EPSILON) *
    Math.max(Math.abs(cameraZ - tuning.referenceDepthZ), Number.EPSILON);
  const semiMajorAxis =
    Math.max(orbitRadiusRatio, Number.EPSILON) *
    Math.max(Math.abs(cameraZ - z), Number.EPSILON);
  const fullKeplerianMultiplier = Math.pow(
    referenceSemiMajorAxis / semiMajorAxis,
    1.5,
  );
  const radiusMultiplier = clamp(
    lerp(
      1,
      fullKeplerianMultiplier,
      clamp(tuning.keplerianFalloffInfluence, 0, 1),
    ),
    tuning.minimumSpeedMultiplier,
    tuning.maximumSpeedMultiplier,
  );
  const wellMassMultiplier = lerp(
    1,
    Math.sqrt(Math.max(orbitWell.weight, 0)),
    clamp(tuning.wellMassInfluence, 0, 1),
  );
  const angularSpeed = clamp(
    Math.abs(baseAngularSpeed) * radiusMultiplier * wellMassMultiplier,
    tuning.minimumAngularSpeedRadiansPerSecond,
    tuning.maximumAngularSpeedRadiansPerSecond,
  );
  const followsWellDirection =
    directionRandom < clamp(tuning.coherentDirectionProbability, 0, 1);
  const direction = followsWellDirection
    ? orbitWell.rotationDirection
    : -orbitWell.rotationDirection;

  return angularSpeed * direction;
}

/* Kepler's equation, M = E - e·sin(E), relates the mean anomaly M (an angle
   that advances uniformly with time) to the eccentric anomaly E (where the
   body actually is on its ellipse). It has no closed-form solution for E, so
   it is refined with Newton's method. Five steps from M + e·sin(M) converge
   far below a pixel for every eccentricity the starfield uses (e < 0.8). */
export function solveKeplerEquation(meanAnomaly: number, eccentricity: number) {
  const fullTurn = Math.PI * 2;
  const wrappedMeanAnomaly =
    ((((meanAnomaly + Math.PI) % fullTurn) + fullTurn) % fullTurn) - Math.PI;
  let eccentricAnomaly =
    wrappedMeanAnomaly + eccentricity * Math.sin(wrappedMeanAnomaly);

  for (let iteration = 0; iteration < 5; iteration++) {
    eccentricAnomaly -=
      (eccentricAnomaly -
        eccentricity * Math.sin(eccentricAnomaly) -
        wrappedMeanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
  }

  return eccentricAnomaly;
}

export function getVisibleBoundsAtZ(
  camera: Camera,
  canvasSize: { width: number; height: number },
  z: number,
  buffer: number,
  target: VisibleBounds = createVisibleBounds(),
): VisibleBounds {
  return getVisibleBoundsAtZForPosition(
    camera,
    canvasSize,
    z,
    SCRATCH_CAMERA_POSITION_TUPLE(camera),
    buffer,
    target,
  );
}

const CAMERA_POSITION_SCRATCH: Vec3Tuple = [0, 0, 0];

function SCRATCH_CAMERA_POSITION_TUPLE(camera: Camera): Vec3Tuple {
  CAMERA_POSITION_SCRATCH[0] = camera.position.x;
  CAMERA_POSITION_SCRATCH[1] = camera.position.y;
  CAMERA_POSITION_SCRATCH[2] = camera.position.z;
  return CAMERA_POSITION_SCRATCH;
}

export function getVisibleBoundsAtZForPosition(
  camera: Camera,
  canvasSize: { width: number; height: number },
  z: number,
  cameraPosition: ReadonlyVec3,
  buffer: number,
  target: VisibleBounds = createVisibleBounds(),
): VisibleBounds {
  let visibleHeight = 0;
  let visibleWidth = 0;

  if (camera instanceof PerspectiveCamera) {
    const distance = Math.abs(cameraPosition[2] - z);
    visibleHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * distance;
    visibleWidth = visibleHeight * (canvasSize.width / canvasSize.height);
  }

  target.bottom = cameraPosition[1] - visibleHeight / 2 - buffer;
  target.left = cameraPosition[0] - visibleWidth / 2 - buffer;
  target.right = cameraPosition[0] + visibleWidth / 2 + buffer;
  target.top = cameraPosition[1] + visibleHeight / 2 + buffer;

  return target;
}

export function getFieldRadius(
  bounds: VisibleBounds,
  fieldRadiusMultiplier: number,
) {
  const width = bounds.right - bounds.left;
  const height = bounds.top - bounds.bottom;
  return Math.hypot(width, height) * fieldRadiusMultiplier * 0.5;
}

export function getOrbitCenter(
  orbitWellIndex: number,
  bounds: VisibleBounds,
  fieldRadius: number,
  orbitWells: readonly StarfieldOrbitWell[],
  target: Vec3Tuple = [0, 0, 0],
): Vec3Tuple {
  const well = orbitWells[orbitWellIndex];
  const offset = well.distance * fieldRadius;

  if (well.side === "left") {
    target[0] = bounds.left - offset;
    target[1] = lerp(bounds.bottom, bounds.top, well.position);
    target[2] = 0;
    return target;
  }

  if (well.side === "right") {
    target[0] = bounds.right + offset;
    target[1] = lerp(bounds.bottom, bounds.top, well.position);
    target[2] = 0;
    return target;
  }

  if (well.side === "top") {
    target[0] = lerp(bounds.left, bounds.right, well.position);
    target[1] = bounds.top + offset;
    target[2] = 0;
    return target;
  }

  target[0] = lerp(bounds.left, bounds.right, well.position);
  target[1] = bounds.bottom - offset;
  target[2] = 0;
  return target;
}

export function getOrbitalPosition(
  center: ReadonlyVec3,
  orbitRadius: number,
  angle: number,
  z: number,
  target: Vector3,
) {
  target.set(
    center[0] + Math.cos(angle) * orbitRadius,
    center[1] + Math.sin(angle) * orbitRadius,
    z,
  );
  return target;
}

export function getOrbitWellFieldDirection(
  position: Vector3,
  bounds: VisibleBounds,
  fieldRadius: number,
  orbitWells: readonly StarfieldOrbitWell[],
  target: Vector3,
) {
  target.set(0, 0, 0);

  for (const well of orbitWells) {
    const offset = well.distance * fieldRadius;
    let centerX: number;
    let centerY: number;

    if (well.side === "left") {
      centerX = bounds.left - offset;
      centerY = lerp(bounds.bottom, bounds.top, well.position);
    } else if (well.side === "right") {
      centerX = bounds.right + offset;
      centerY = lerp(bounds.bottom, bounds.top, well.position);
    } else if (well.side === "top") {
      centerX = lerp(bounds.left, bounds.right, well.position);
      centerY = bounds.top + offset;
    } else {
      centerX = lerp(bounds.left, bounds.right, well.position);
      centerY = bounds.bottom - offset;
    }

    const dx = centerX - position.x;
    const dy = centerY - position.y;
    const distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);
    const influence =
      well.weight / Math.max(distanceSquared * distance, Number.EPSILON);

    target.x += dx * influence;
    target.y += dy * influence;
  }

  if (target.lengthSq() <= Number.EPSILON) {
    target.set(0, 1, 0);
  } else {
    target.normalize();
  }

  return target;
}

export function isInsideBounds(
  position: Vector3,
  bounds: VisibleBounds,
  radius = 0,
) {
  return (
    position.x >= bounds.left - radius &&
    position.x <= bounds.right + radius &&
    position.y >= bounds.bottom - radius &&
    position.y <= bounds.top + radius
  );
}

const TWINKLE_FULL_TURN = Math.PI * 2;
/* Two sine waves whose frequencies are in the golden ratio never fall back
   into step, so their sum wanders without a visible loop. */
const TWINKLE_GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

/* Brightness multiplier of a twinkling star, centred on 1.

   The slower wave carries most of the swing and the quicker one roughens it,
   which reads as shimmer instead of a pulse. Both are continuous in time, so
   the value can never jump from one frame to the next. */
export function getTwinkleMultiplier(
  elapsedSeconds: number,
  frequency: number,
  phase: number,
  secondaryPhase: number,
  amplitude: number,
) {
  const turns = elapsedSeconds * frequency;

  return (
    1 +
    amplitude *
      (0.62 * Math.sin(TWINKLE_FULL_TURN * (turns + phase)) +
        0.38 *
          Math.sin(
            TWINKLE_FULL_TURN * (turns * TWINKLE_GOLDEN_RATIO + secondaryPhase),
          ))
  );
}

/* Volume of the space a population is laid out in.

   At a distance d from the camera, orbits are sized against a disc whose
   radius is `fieldRadiusMultiplier` times half the diagonal of the buffered
   view (see `getFieldRadius`). Stacking those discs between the nearest and
   farthest distance gives a cone-like slab. With half-width w(d) = t·a·d + b
   and half-height h(d) = t·d + b, the disc area is π·m²·(w² + h²), which
   integrates in closed form. Sizing a population from this volume keeps its
   on-screen density the same on any screen shape. */
export function getFieldVolume({
  aspect,
  buffer,
  farthestDistance,
  fieldRadiusMultiplier,
  nearestDistance,
  tanHalfFov,
}: {
  // Viewport width over height.
  aspect: number;
  // World-space padding added around the view at every depth.
  buffer: number;
  farthestDistance: number;
  fieldRadiusMultiplier: number;
  nearestDistance: number;
  // Tangent of half the camera's vertical field of view.
  tanHalfFov: number;
}) {
  const integrateSquaredHalfExtent = (slope: number) =>
    (Math.pow(slope * farthestDistance + buffer, 3) -
      Math.pow(slope * nearestDistance + buffer, 3)) /
    (3 * slope);

  return (
    Math.PI *
    fieldRadiusMultiplier *
    fieldRadiusMultiplier *
    (integrateSquaredHalfExtent(tanHalfFov * aspect) +
      integrateSquaredHalfExtent(tanHalfFov))
  );
}

/* How many bodies a density asks for in a given field volume, held to the
   population's ceiling. */
export function getPopulationCount(
  densityPer1000CubicUnits: number,
  fieldVolume: number,
  maximumCount: number,
) {
  return clamp(
    Math.round((densityPer1000CubicUnits / 1000) * fieldVolume),
    0,
    maximumCount,
  );
}

/* Picks a distance from the camera for one body.

   Space widens with distance, so bodies scattered evenly through it land at
   distance d with probability proportional to d². `cameraBias` lowers that
   exponent: the density used is d^(2 - cameraBias), sampled by inverting its
   integral. 0 is the even scatter, 2 is even by distance, larger values crowd
   the camera, and negative values push the population deeper. */
export function sampleBiasedDistance(
  uniform: number,
  nearestDistance: number,
  farthestDistance: number,
  cameraBias: number,
) {
  const power = 3 - cameraBias;

  // The integral of 1/d is a logarithm, not a power.
  if (Math.abs(power) < 1e-6) {
    return (
      nearestDistance * Math.pow(farthestDistance / nearestDistance, uniform)
    );
  }

  return Math.pow(
    lerp(
      Math.pow(nearestDistance, power),
      Math.pow(farthestDistance, power),
      uniform,
    ),
    1 / power,
  );
}
