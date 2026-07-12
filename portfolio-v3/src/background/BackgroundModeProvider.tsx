import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ensurePlanetAtlasesLoading,
  whenFirstPlanetAtlasReady,
} from "../scene/starfield/planet-atlas-cache";
import { preloadStarfield2D } from "../scene/starfield2d/preload-starfield2d";
import {
  BACKGROUND_TRANSITION,
  BackgroundModeContext,
  type BackgroundMode,
  type SeedPoint,
  type TransitionPhase,
} from "./background-mode-core";

interface BackgroundModeState {
  phase: TransitionPhase;
  seedPoint: SeedPoint | null;
  targetMode: BackgroundMode;
  visualMode: BackgroundMode;
}

interface PendingSceneReady {
  mode: BackgroundMode;
  promise: Promise<void>;
  resolve: () => void;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createPendingSceneReady(mode: BackgroundMode): PendingSceneReady {
  let resolve!: () => void;
  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { mode, promise, resolve };
}

export function BackgroundModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BackgroundModeState>(() => {
    return {
      phase: "idle",
      seedPoint: null,
      targetMode: "3d",
      visualMode: "3d",
    };
  });
  const stateRef = useRef(state);
  const pendingSceneReadyRef = useRef<PendingSceneReady | null>(null);
  const coveredGenerationRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /* Render modes are session-only and every load starts from canonical 3D.
     Warm the 2D chunk and shared atlases so its first transition is ready. */
  useEffect(() => {
    try {
      localStorage.removeItem("portfolio:background-mode");
    } catch {
      /* Removing the legacy persisted preference is best-effort. */
    }

    void preloadStarfield2D();
    ensurePlanetAtlasesLoading();
  }, []);

  const requestMode = useCallback((target: BackgroundMode, seed: SeedPoint) => {
    if (
      stateRef.current.phase !== "idle" ||
      stateRef.current.visualMode === target
    ) {
      return;
    }

    pendingSceneReadyRef.current = createPendingSceneReady(target);

    if (target === "2d") {
      /* Overlap chunk + atlas loading with the cover animation. */
      void preloadStarfield2D();
      ensurePlanetAtlasesLoading();
    }

    setState((previous) => ({
      ...previous,
      phase: "covering",
      seedPoint: seed,
      targetMode: target,
    }));
  }, []);

  const notifyCovered = useCallback(() => {
    const current = stateRef.current;

    if (current.phase !== "covering") {
      return;
    }

    const target = current.targetMode;

    setState((previous) => ({
      ...previous,
      phase: "covered",
      visualMode: target,
    }));

    const generation = ++coveredGenerationRef.current;
    const waits: Promise<unknown>[] = [
      delay(BACKGROUND_TRANSITION.minCoveredHoldMs),
    ];
    const pending = pendingSceneReadyRef.current;

    if (pending && pending.mode === target) {
      waits.push(pending.promise);
    }

    if (target === "2d") {
      waits.push(whenFirstPlanetAtlasReady());
    }

    void Promise.race([
      Promise.all(waits),
      delay(BACKGROUND_TRANSITION.sceneReadyTimeoutMs),
    ]).then(() => {
      if (coveredGenerationRef.current !== generation) {
        return;
      }

      setState((previous) =>
        previous.phase === "covered"
          ? { ...previous, phase: "clearing" }
          : previous,
      );
    });
  }, []);

  const notifyCleared = useCallback(() => {
    setState((previous) =>
      previous.phase === "clearing"
        ? { ...previous, phase: "idle", seedPoint: null }
        : previous,
    );
  }, []);

  const notifySceneReady = useCallback((mode: BackgroundMode) => {
    const pending = pendingSceneReadyRef.current;

    if (pending && pending.mode === mode) {
      pending.resolve();
      pendingSceneReadyRef.current = null;
    }
  }, []);

  const value = useMemo(
    () => ({
      isTransitioning: state.phase !== "idle",
      notifyCleared,
      notifyCovered,
      notifySceneReady,
      phase: state.phase,
      requestMode,
      seedPoint: state.seedPoint,
      targetMode: state.targetMode,
      visualMode: state.visualMode,
    }),
    [notifyCleared, notifyCovered, notifySceneReady, requestMode, state],
  );

  return (
    <BackgroundModeContext.Provider value={value}>
      {children}
    </BackgroundModeContext.Provider>
  );
}
