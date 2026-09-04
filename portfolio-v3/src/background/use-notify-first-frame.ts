import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useBackgroundMode, type BackgroundMode } from "./background-mode-core";

/**
 * Signals that the background has composed a frame.
 *
 * A mode transition uncovers its target the moment this resolves, so that path
 * keeps waiting an extra animation frame for the tick's own frame to present
 * and never reveals an empty canvas. Startup is gated differently — its cover
 * opens as an animation rather than a cut — so it is told immediately. See
 * `useNotifyStartupSurface`.
 */
export default function useNotifyFirstFrame(mode: BackgroundMode) {
  const { notifySceneReady, notifyStartupSurfaceReady } = useBackgroundMode();
  const notifiedModeRef = useRef<BackgroundMode | null>(null);

  useFrame(() => {
    if (notifiedModeRef.current === mode) {
      return;
    }

    notifiedModeRef.current = mode;
    /* Only the background's half of the cover's release condition; the 3D UI
       reports the other half. */
    notifyStartupSurfaceReady("background");
    requestAnimationFrame(() => notifySceneReady(mode));
  });
}
