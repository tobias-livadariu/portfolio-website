import { Suspense, lazy } from "react";
import { Canvas } from "@react-three/fiber";
import { useBackgroundMode } from "../background/background-mode-core";
import { PrimaryLighting } from "./lighting/PrimaryLighting";
import { COLOR_PALETTE_STR } from "../theme/colors";
import { CAMERA_PROPS, CANVAS_DPR } from "./canvas.constants";
import PointerCameraShift from "./camera/PointerCameraShift";
import SceneCamera from "./camera/SceneCamera";
import Starfield from "./starfield/Starfield";
import UiHaloPass from "./ui3d/UiHaloPass";
import MainMenu from "./ui3d/MainMenu";
import { preloadStarfield2D } from "./starfield2d/preload-starfield2d";

const Starfield2D = lazy(preloadStarfield2D);

function BackgroundScene() {
  const { visualMode } = useBackgroundMode();

  if (visualMode !== "2d") {
    return <Starfield readyMode={visualMode} />;
  }

  return (
    <Suspense fallback={null}>
      <Starfield2D />
    </Suspense>
  );
}

export default function PortfolioCanvas() {
  return (
    <Canvas
      dpr={CANVAS_DPR}
      fallback={
        <div aria-hidden="true" className="portfolio-canvas-fallback" />
      }
      flat
      frameloop="always"
      camera={{
        position: CAMERA_PROPS.position,
        fov: CAMERA_PROPS.fov,
        near: CAMERA_PROPS.near,
        far: CAMERA_PROPS.far,
      }}
    >
      <color attach="background" args={[COLOR_PALETTE_STR.background]} />
      <SceneCamera />
      <PointerCameraShift />
      <PrimaryLighting />
      <BackgroundScene />
      {/* Text3D font loading is independent of the animated background. Keep
          it behind its own boundary so stars can compose and release the
          startup cover while menu fonts continue loading progressively. The
          halo/composer belongs to that UI and mounts with it, avoiding a full
          post-processing shader compile on the first background-only frame. */}
      <Suspense fallback={null}>
        <MainMenu />
        <UiHaloPass />
      </Suspense>
    </Canvas>
  );
}
