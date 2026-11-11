import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useBackgroundMode } from "../background/background-mode-core";
import { registerSceneCanvas } from "../background/scene-snapshot";
import {
  SCENE_TIME_TUNING,
  advanceSceneTime,
  easeSceneTimeScale,
} from "./scene-time";

/* Connects the canvas to render-mode transitions: it drives the shared scene
   clock, slows that clock to rest while a transition covers the scene and
   brings it back as the next scene appears, and tells the overlay which
   canvas to take its still from. Mount it first inside the canvas so the
   clock advances before anything reads it. */
export default function SceneTransitionBridge() {
  const gl = useThree((state) => state.gl);
  const { isInitialRevealComplete, phase } = useBackgroundMode();

  useEffect(() => registerSceneCanvas(gl.domElement), [gl]);

  useEffect(() => {
    /* The startup cover opens onto a scene that is already running. */
    if (!isInitialRevealComplete) {
      return;
    }

    /* The scene rests only while the cover grows over it. The moment the
       next scene is mounted ("covered") it starts back up, still hidden, so
       it is already in motion when the first of it is uncovered. */
    if (phase === "covering") {
      easeSceneTimeScale(0, SCENE_TIME_TUNING.settleMs);
    } else {
      easeSceneTimeScale(1, SCENE_TIME_TUNING.resumeMs);
    }
  }, [isInitialRevealComplete, phase]);

  useFrame((_, delta) => {
    advanceSceneTime(delta);
  });

  return null;
}
