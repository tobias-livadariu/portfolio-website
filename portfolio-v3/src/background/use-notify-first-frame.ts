import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useBackgroundMode, type BackgroundMode } from "./background-mode-core";

/* Signals scene readiness only after a real frame has been composed, so the
   transition overlay never reveals an empty canvas. The extra rAF lets the
   frame the tick belongs to actually present first. */
export default function useNotifyFirstFrame(mode: BackgroundMode) {
  const { notifySceneReady } = useBackgroundMode();
  const notifiedModeRef = useRef<BackgroundMode | null>(null);

  useFrame(() => {
    if (notifiedModeRef.current === mode) {
      return;
    }

    notifiedModeRef.current = mode;
    requestAnimationFrame(() => notifySceneReady(mode));
  });
}
