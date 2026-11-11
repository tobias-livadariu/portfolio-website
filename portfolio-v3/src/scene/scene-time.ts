/* One clock for everything that moves in the background scene and the 3D
   menu.

   It normally runs at real speed. A render-mode transition eases it down to
   rest before the outgoing scene is handed over, then back up as the incoming
   scene appears, so nothing is ever stopped dead or started with a jerk.
   Because every consumer reads the same elapsed value, the whole picture
   slows and resumes together. */

export const SCENE_TIME_TUNING = {
  /* How long the outgoing scene takes to glide to rest once a render mode is
     chosen. Must be shorter than the shortest cover animation, so the scene
     is still by the time it is handed over. */
  settleMs: 480,
  /* How long the incoming scene takes to reach full speed. It starts the
     moment the new scene is mounted, before any of it is visible, so the
     first sliver uncovered is already moving. */
  resumeMs: 420,
} as const;

const state = {
  elapsedSeconds: 0,
  scale: 1,
  easeFrom: 1,
  easeTo: 1,
  easeElapsedMs: 0,
  easeDurationMs: 0,
};

function smoothstep(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

/* Advances the clock by one rendered frame. Called once per frame by
   `SceneTransitionBridge`, before anything reads the time. */
export function advanceSceneTime(realDeltaSeconds: number) {
  if (state.easeElapsedMs < state.easeDurationMs) {
    state.easeElapsedMs = Math.min(
      state.easeDurationMs,
      state.easeElapsedMs + realDeltaSeconds * 1000,
    );
    state.scale =
      state.easeFrom +
      (state.easeTo - state.easeFrom) *
        smoothstep(state.easeElapsedMs / state.easeDurationMs);
  } else {
    state.scale = state.easeTo;
  }

  state.elapsedSeconds += realDeltaSeconds * state.scale;
}

/* Seconds of scene motion so far. Use this instead of the renderer's clock
   for anything that should slow down and resume with the scene. */
export function getSceneElapsedSeconds() {
  return state.elapsedSeconds;
}

/* Current speed of the scene: 1 is normal, 0 is at rest. Multiply a frame
   delta by this when motion is accumulated rather than derived from time. */
export function getSceneTimeScale() {
  return state.scale;
}

/* Eases the scene's speed toward `target` over `durationMs`, starting from
   whatever speed it has now, so a change of direction never jumps. */
export function easeSceneTimeScale(target: number, durationMs: number) {
  if (state.easeTo === target) {
    return;
  }

  state.easeFrom = state.scale;
  state.easeTo = target;
  state.easeElapsedMs = 0;
  state.easeDurationMs = Math.max(0, durationMs);

  if (state.easeDurationMs === 0) {
    state.scale = target;
  }
}
