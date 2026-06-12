import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  useBackgroundMode,
  type BackgroundMode,
} from "./background-mode-core";

/* Signals scene readiness only after a real frame has been composed, so the
   transition overlay never reveals an empty canvas. The extra rAF lets the
   frame the tick belongs to actually present first. */
export default function useNotifyFirstFrame(mode: BackgroundMode) {
  const { notifySceneReady } = useBackgroundMode();
  const hasNotifiedRef = useRef(false);

  useFrame(() => {
    if (hasNotifiedRef.current) {
      return;
    }

    hasNotifiedRef.current = true;
    requestAnimationFrame(() => notifySceneReady(mode));
  });
}
