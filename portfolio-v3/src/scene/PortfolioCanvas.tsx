import { Suspense, lazy } from "react";
import { Canvas } from "@react-three/fiber";
import { useBackgroundMode } from "../background/background-mode-core";
import { PrimaryLighting } from "./lighting/PrimaryLighting";
import { COLOR_PALETTE_STR } from "../theme/colors";
import { CAMERA_PROPS, CANVAS_DPR } from "./canvas.constants";
import PointerCameraShift from "./camera/PointerCameraShift";
import Starfield from "./starfield/Starfield";
import UiHaloPass from "./ui3d/UiHaloPass";
import MainMenu from "./ui3d/MainMenu";
import { preloadStarfield2D } from "./starfield2d/preload-starfield2d";

const Starfield2D = lazy(preloadStarfield2D);

function BackgroundScene() {
  const { visualMode } = useBackgroundMode();

  if (visualMode === "3d") {
    return <Starfield />;
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
      <PointerCameraShift />
      <PrimaryLighting />
      <BackgroundScene />
      <MainMenu />
      <UiHaloPass />
    </Canvas>
  );
}
