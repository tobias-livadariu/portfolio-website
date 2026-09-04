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
  const [isInitialRevealComplete, setIsInitialRevealComplete] = useState(false);
  const [isRenderModeInputLocked, setRenderModeInputLocked] = useState(false);
  const [state, setState] = useState<BackgroundModeState>(() => {
    return {
      /* Startup is the already-covered midpoint of a normal transition. The
         first composed 3D frame advances directly into DEEP's real clearing
         phase, so no interactive UI can precede the scene it controls. */
      phase: "covered",
      seedPoint: null,
      targetMode: "3d",
      visualMode: "3d",
    };
  });
  const stateRef = useRef(state);
  const pendingSceneReadyRef = useRef<PendingSceneReady | null>(null);
  const coveredGenerationRef = useRef(0);
  const initialRevealStartedRef = useRef(false);
  const initialRevealCompleteRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /* Render modes are session-only and every load starts from canonical 3D. */
  useEffect(() => {
    try {
      localStorage.removeItem("portfolio:background-mode");
    } catch {
      /* Removing the legacy persisted preference is best-effort. */
    }
  }, []);

  /* The 2D implementation is not needed to compose the initial 3D frame.
     Warm its small chunk after the cover has cleared so parsing it cannot
     compete with startup on a slow main thread. A direct 2D request still
     starts this same cached import immediately in requestMode below. */
  useEffect(() => {
    if (!isInitialRevealComplete) {
      return;
    }

    const preload = () => void preloadStarfield2D();

    if (typeof window.requestIdleCallback === "function") {
      const callbackId = window.requestIdleCallback(preload, { timeout: 1000 });

      return () => window.cancelIdleCallback(callbackId);
    }

    const timeoutId = window.setTimeout(preload, 200);
    return () => window.clearTimeout(timeoutId);
  }, [isInitialRevealComplete]);

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

    if (!initialRevealCompleteRef.current) {
      initialRevealCompleteRef.current = true;
      setIsInitialRevealComplete(true);
    }
  }, []);

  const notifySceneReady = useCallback((mode: BackgroundMode) => {
    if (!initialRevealCompleteRef.current) {
      if (
        mode === "3d" &&
        !initialRevealStartedRef.current &&
        stateRef.current.phase === "covered"
      ) {
        initialRevealStartedRef.current = true;
        setState((previous) =>
          previous.phase === "covered"
            ? { ...previous, phase: "clearing" }
            : previous,
        );
      }

      return;
    }

    const pending = pendingSceneReadyRef.current;

    if (pending && pending.mode === mode) {
      pending.resolve();
      pendingSceneReadyRef.current = null;
    }
  }, []);

  /* Scene readiness is the fast path. This deadline is deliberately
     independent of WebGL: context creation/loss can prevent useFrame from
     ever running on weaker devices, but the DOM portfolio must remain usable. */
  useEffect(() => {
    if (isInitialRevealComplete || initialRevealStartedRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (
        initialRevealCompleteRef.current ||
        initialRevealStartedRef.current ||
        stateRef.current.phase !== "covered"
      ) {
        return;
      }

      initialRevealStartedRef.current = true;
      setState((previous) =>
        previous.phase === "covered"
          ? { ...previous, phase: "clearing" }
          : previous,
      );
    }, BACKGROUND_TRANSITION.startupSceneReadyTimeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [isInitialRevealComplete]);

  const value = useMemo(
    () => ({
      isInitialRevealComplete,
      isRenderModeInputLocked,
      isTransitioning: state.phase !== "idle",
      notifyCleared,
      notifyCovered,
      notifySceneReady,
      phase: state.phase,
      requestMode,
      seedPoint: state.seedPoint,
      setRenderModeInputLocked,
      targetMode: state.targetMode,
      visualMode: state.visualMode,
    }),
    [
      isInitialRevealComplete,
      isRenderModeInputLocked,
      notifyCleared,
      notifyCovered,
      notifySceneReady,
      requestMode,
      state,
    ],
  );

  return (
    <BackgroundModeContext.Provider value={value}>
      {children}
    </BackgroundModeContext.Provider>
  );
}
