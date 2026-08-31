import { createContext, useContext } from "react";

export const BACKGROUND_MODES = ["3d", "2d", "ascii"] as const;

export type BackgroundMode = (typeof BACKGROUND_MODES)[number];

export type TransitionPhase = "idle" | "covering" | "covered" | "clearing";

/* Viewport coordinates in CSS pixels; the active destination transition grows
   outward from this point (the center of the render-mode toggle). */
export interface SeedPoint {
  x: number;
  y: number;
}

export interface BackgroundModeContextValue {
  isInitialRevealComplete: boolean;
  isRenderModeInputLocked: boolean;
  isTransitioning: boolean;
  notifyCleared: () => void;
  notifyCovered: () => void;
  notifySceneReady: (mode: BackgroundMode) => void;
  phase: TransitionPhase;
  requestMode: (mode: BackgroundMode, seed: SeedPoint) => void;
  seedPoint: SeedPoint | null;
  setRenderModeInputLocked: (isLocked: boolean) => void;
  targetMode: BackgroundMode;
  visualMode: BackgroundMode;
}

export const BACKGROUND_TRANSITION = {
  /* Pause after a modal's smooth return reaches the starfield. This keeps the
     fullscreen wipe from visually colliding with the final upward motion. */
  modalReturnPauseMs: 120,
  /* Keep the screen covered at least this long so the reveal never feels
     like a flicker, even when the target scene is already cached. */
  minCoveredHoldMs: 180,
  /* Safety valve: reveal anyway if scene readiness never arrives. */
  sceneReadyTimeoutMs: 4000,
} as const;

export const BackgroundModeContext =
  createContext<BackgroundModeContextValue | null>(null);

export function useBackgroundMode() {
  const context = useContext(BackgroundModeContext);

  if (!context) {
    throw new Error(
      "useBackgroundMode must be used within BackgroundModeProvider",
    );
  }

  return context;
}
