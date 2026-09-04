import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useBackgroundMode, type StartupSurface } from "./background-mode-core";

/**
 * Reports that one startup surface has issued its first frame.
 *
 * This reports from inside the frame rather than waiting a further animation
 * frame for it to present, because the cover does not vanish on this signal —
 * it starts an animated wipe that takes about a second to uncover anything.
 * The surface only has to be painted before the wipe reaches it, and a React
 * state update plus the opening of the wipe is already far more than one
 * frame. Waiting for presentation here cost roughly 600ms of dead black
 * screen during startup, when the frame carrying the UI's first composite is
 * also compiling its post-processing shaders and runs very long.
 *
 * `renderPriority` places the check within the frame. A surface drawn by a
 * prioritized pass has to report from behind that pass, or it reports before
 * the pass that actually paints it has run.
 */
export default function useNotifyStartupSurface(
  surface: StartupSurface,
  renderPriority = 0,
) {
  const { notifyStartupSurfaceReady } = useBackgroundMode();
  const hasNotifiedRef = useRef(false);

  useFrame(() => {
    if (hasNotifiedRef.current) {
      return;
    }

    hasNotifiedRef.current = true;
    notifyStartupSurfaceReady(surface);
  }, renderPriority);
}
