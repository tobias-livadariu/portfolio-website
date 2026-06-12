import { GRAVITY_WELLS_2D, PLANETS_2D } from "./starfield2d.constants";

export interface GravityWell {
  baseXFraction: number;
  baseYFraction: number;
  driftPhaseX: number;
  driftPhaseY: number;
  driftSpeedX: number;
  driftSpeedY: number;
  strength: number;
}

export interface Planet2DBody {
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function createGravityWells(): GravityWell[] {
  const { count, driftRadiansPerSecond, placementFraction, strength } =
    GRAVITY_WELLS_2D;

  return Array.from({ length: count }, () => ({
    baseXFraction: randomInRange(placementFraction.min, placementFraction.max),
    baseYFraction: randomInRange(placementFraction.min, placementFraction.max),
    driftPhaseX: Math.random() * Math.PI * 2,
    driftPhaseY: Math.random() * Math.PI * 2,
    driftSpeedX: randomInRange(
      driftRadiansPerSecond.min,
      driftRadiansPerSecond.max,
    ),
    driftSpeedY: randomInRange(
      driftRadiansPerSecond.min,
      driftRadiansPerSecond.max,
    ),
    strength: randomInRange(strength.min, strength.max),
  }));
}

/* Writes the current centered-pixel positions of every well into `out` as
   x,y pairs. Base positions are stored as viewport fractions so resizes need
   no well migration. */
export function resolveWellPositions(
  wells: GravityWell[],
  elapsedSeconds: number,
  viewportWidth: number,
  viewportHeight: number,
  out: Float32Array,
) {
  const { driftAmplitudePx } = GRAVITY_WELLS_2D;

  for (let index = 0; index < wells.length; index++) {
    const well = wells[index];

    out[index * 2] =
      (well.baseXFraction - 0.5) * viewportWidth +
      Math.sin(elapsedSeconds * well.driftSpeedX + well.driftPhaseX) *
        driftAmplitudePx;
    out[index * 2 + 1] =
      (well.baseYFraction - 0.5) * viewportHeight +
      Math.sin(elapsedSeconds * well.driftSpeedY + well.driftPhaseY) *
        driftAmplitudePx;
  }
}

/* Advances one planet body under softened inverse-square attraction toward
   every well, with velocity damping and a hard speed clamp. The combination
   keeps motion wandering and chaotic but never fast or divergent. */
export function stepPlanetBody(
  body: Planet2DBody,
  wells: GravityWell[],
  wellPositions: Float32Array,
  deltaSeconds: number,
) {
  const { softeningPx } = GRAVITY_WELLS_2D;
  const {
    centerRepulsionPxPerSecond2,
    exclusionRadiusPx,
    maxSpeedPxPerSecond,
    velocityDampingPerSecond,
  } = PLANETS_2D;
  const softening2 = softeningPx * softeningPx;
  let accelerationX = 0;
  let accelerationY = 0;

  for (let index = 0; index < wells.length; index++) {
    const deltaX = wellPositions[index * 2] - body.x;
    const deltaY = wellPositions[index * 2 + 1] - body.y;
    const softenedDistance2 = deltaX * deltaX + deltaY * deltaY + softening2;
    const inverse =
      wells[index].strength /
      (softenedDistance2 * Math.sqrt(softenedDistance2));

    accelerationX += deltaX * inverse;
    accelerationY += deltaY * inverse;
  }

  const centerDistance = Math.hypot(body.x, body.y);

  if (centerDistance < exclusionRadiusPx && centerDistance > 1e-3) {
    const repulsion =
      (centerRepulsionPxPerSecond2 * (1 - centerDistance / exclusionRadiusPx)) /
      centerDistance;

    accelerationX += body.x * repulsion;
    accelerationY += body.y * repulsion;
  }

  const damping = Math.exp(-velocityDampingPerSecond * deltaSeconds);

  body.vx = (body.vx + accelerationX * deltaSeconds) * damping;
  body.vy = (body.vy + accelerationY * deltaSeconds) * damping;

  const speed = Math.hypot(body.vx, body.vy);

  if (speed > maxSpeedPxPerSecond) {
    const scale = maxSpeedPxPerSecond / speed;

    body.vx *= scale;
    body.vy *= scale;
  }

  body.x += body.vx * deltaSeconds;
  body.y += body.vy * deltaSeconds;
  body.rotation += body.rotationSpeed * deltaSeconds;
}
