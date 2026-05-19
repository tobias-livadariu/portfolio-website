import type { Camera } from "three";
import { PerspectiveCamera, Vector3 } from "three";
import type { ReadonlyVec3 } from "../../types/geometry";
import { STARFIELD_BOUNDS, STARFIELD_ORBIT_WELLS } from "./starfield.constants";

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

export function getVisibleBoundsAtZ(
  camera: Camera,
  canvasSize: { width: number; height: number },
  z: number,
  buffer: number = STARFIELD_BOUNDS.edgeBuffer,
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
  buffer: number = STARFIELD_BOUNDS.edgeBuffer,
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

export function getFieldRadius(bounds: VisibleBounds) {
  const width = bounds.right - bounds.left;
  const height = bounds.top - bounds.bottom;
  return (
    Math.hypot(width, height) * STARFIELD_BOUNDS.fieldRadiusMultiplier * 0.5
  );
}

export function getOrbitCenter(
  orbitWellIndex: number,
  bounds: VisibleBounds,
  fieldRadius: number,
  target: Vec3Tuple = [0, 0, 0],
): Vec3Tuple {
  const well = STARFIELD_ORBIT_WELLS[orbitWellIndex];
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
  target: Vector3,
) {
  target.set(0, 0, 0);

  for (const well of STARFIELD_ORBIT_WELLS) {
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
