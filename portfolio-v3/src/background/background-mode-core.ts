import { createContext, useContext } from "react";

export const BACKGROUND_MODES = ["3d", "2d", "ascii"] as const;

export type BackgroundMode = (typeof BACKGROUND_MODES)[number];

export type TransitionPhase = "idle" | "covering" | "covered" | "clearing";

/* Surfaces the startup cover waits for before it recedes. The background and
   the 3D UI compose on separate schedules — the menu suspends on its typeface
   while stars are already drawing — so releasing on the first background frame
   alone lets the menu pop in over an exposed starfield. */
export const STARTUP_SURFACES = ["background", "ui"] as const;

export type StartupSurface = (typeof STARTUP_SURFACES)[number];

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
  notifyStartupSurfaceReady: (surface: StartupSurface) => void;
  phase: TransitionPhase;
  requestMode: (mode: BackgroundMode, seed: SeedPoint) => void;
  seedPoint: SeedPoint | null;
  setRenderModeInputLocked: (isLocked: boolean) => void;
  targetMode: BackgroundMode;
  visualMode: BackgroundMode;
}

export const BACKGROUND_TRANSITION = {
  /* A lost/failed WebGL context must never leave the document permanently
     hidden. Normal startup still reveals on the first composed background
     frame; this is only the fail-open deadline for devices that never emit
     that signal. */
  startupSceneReadyTimeoutMs: 2500,
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
