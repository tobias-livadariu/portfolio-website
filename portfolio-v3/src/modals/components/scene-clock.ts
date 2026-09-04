/**
 * A clock private to one modal scene, started the first time that scene is
 * actually drawn rather than when the page loaded.
 *
 * The scenes share the canvas-wide R3F clock, which starts at page load. A
 * reader who scrolls to a scene a minute in would therefore meet it mid-swing:
 * the poster standing in for it depicts the pose at time zero, and the live
 * scene replacing it picks up wherever the global clock happens to be. Giving
 * each scene its own origin makes every scene begin its motion from its first
 * visible frame, so the poster it replaces is the frame it starts on.
 */
export interface SceneClock {
  /** A frozen clock never starts, holding its scene at time zero. */
  isFrozen: boolean;
  originSeconds: number | null;
}

export function createSceneClock(isFrozen = false): SceneClock {
  return { isFrozen, originSeconds: null };
}

/** Called by whatever composites the scene, on the frame it first draws it. */
export function startSceneClock(clock: SceneClock, elapsedSeconds: number) {
  if (!clock.isFrozen && clock.originSeconds === null) {
    clock.originSeconds = elapsedSeconds;
  }
}

export function hasSceneClockStarted(clock: SceneClock) {
  return clock.originSeconds !== null;
}

/** Seconds since the scene was first drawn; zero until then. */
export function getSceneTime(clock: SceneClock, elapsedSeconds: number) {
  return clock.originSeconds === null
    ? 0
    : elapsedSeconds - clock.originSeconds;
}

/**
 * Damping factor for a scene's eased motion.
 *
 * Before the clock starts there is no elapsed time to ease over, so the pose
 * snaps to its time-zero target. That is what makes a scene appear already at
 * rest instead of visibly settling out of a zeroed rotation on the frame the
 * reader first sees it.
 */
export function getSceneDamping(
  clock: SceneClock,
  deltaSeconds: number,
  strength: number,
) {
  return hasSceneClockStarted(clock)
    ? 1 - Math.exp(-deltaSeconds * strength)
    : 1;
}
