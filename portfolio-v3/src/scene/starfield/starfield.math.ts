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
): VisibleBounds {
  return getVisibleBoundsAtZForPosition(
    camera,
    canvasSize,
    z,
    [camera.position.x, camera.position.y, camera.position.z],
    buffer,
  );
}

export function getVisibleBoundsAtZForPosition(
  camera: Camera,
  canvasSize: { width: number; height: number },
  z: number,
  cameraPosition: ReadonlyVec3,
  buffer: number = STARFIELD_BOUNDS.edgeBuffer,
): VisibleBounds {
  let visibleHeight = 0;
  let visibleWidth = 0;

  if (camera instanceof PerspectiveCamera) {
    const distance = Math.abs(cameraPosition[2] - z);
    visibleHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * distance;
    visibleWidth = visibleHeight * (canvasSize.width / canvasSize.height);
  }

  return {
    bottom: cameraPosition[1] - visibleHeight / 2 - buffer,
    left: cameraPosition[0] - visibleWidth / 2 - buffer,
    right: cameraPosition[0] + visibleWidth / 2 + buffer,
    top: cameraPosition[1] + visibleHeight / 2 + buffer,
  };
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
): ReadonlyVec3 {
  const well = STARFIELD_ORBIT_WELLS[orbitWellIndex];
  const offset = well.distance * fieldRadius;

  if (well.side === "left") {
    return [
      bounds.left - offset,
      lerp(bounds.bottom, bounds.top, well.position),
      0,
    ];
  }

  if (well.side === "right") {
    return [
      bounds.right + offset,
      lerp(bounds.bottom, bounds.top, well.position),
      0,
    ];
  }

  if (well.side === "top") {
    return [
      lerp(bounds.left, bounds.right, well.position),
      bounds.top + offset,
      0,
    ];
  }

  return [
    lerp(bounds.left, bounds.right, well.position),
    bounds.bottom - offset,
    0,
  ];
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
