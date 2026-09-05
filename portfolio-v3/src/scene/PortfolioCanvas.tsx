import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import {
  useBackgroundMode,
  type StartupSurface,
} from "../background/background-mode-core";
import SceneErrorBoundary from "./SceneErrorBoundary";
import { PrimaryLighting } from "./lighting/PrimaryLighting";
import { COLOR_PALETTE_STR } from "../theme/colors";
import { CAMERA_PROPS, CANVAS_DPR } from "./canvas.constants";
import PointerCameraShift from "./camera/PointerCameraShift";
import SceneCamera from "./camera/SceneCamera";
import Starfield from "./starfield/Starfield";
import UiHaloPass from "./ui3d/UiHaloPass";
import MainMenu from "./ui3d/MainMenu";
import StartupUiSignal from "./ui3d/StartupUiSignal";
import { preloadStarfield2D } from "./starfield2d/preload-starfield2d";

const Starfield2D = lazy(preloadStarfield2D);

/**
 * One independently-failing region of the scene. A region that dies still has
 * to report its startup surface, or the cover sits on screen waiting for a
 * frame that will never be drawn until the fail-open deadline rescues it.
 */
function StartupRegion({
  children,
  label,
  surface,
}: {
  children: ReactNode;
  label: string;
  surface: StartupSurface;
}) {
  const { notifyStartupSurfaceReady } = useBackgroundMode();

  return (
    <SceneErrorBoundary
      label={label}
      onFailure={() => notifyStartupSurfaceReady(surface)}
    >
      {children}
    </SceneErrorBoundary>
  );
}

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
      {/* The background and the 3D UI fail independently. Without their own
          boundaries a single rejected fetch in either — a planet atlas, the
          menu typeface — would throw past R3F's one canvas-wide boundary and
          take the entire scene down, leaving the document with no starfield
          and no menu at all. */}
      <StartupRegion label="background" surface="background">
        <BackgroundScene />
      </StartupRegion>
      {/* Text3D font loading is independent of the animated background, so the
          menu keeps its own boundary and the stars are free to compose while
          the typeface is still arriving. The halo/composer belongs to that UI
          and mounts with it, avoiding a full post-processing shader compile on
          the first background-only frame. The startup cover waits for both
          halves, so a menu that is still suspended holds the reveal rather
          than popping in over an already-exposed starfield. */}
      <StartupRegion label="3D UI" surface="ui">
        <Suspense fallback={null}>
          <MainMenu />
          <UiHaloPass />
          <StartupUiSignal />
        </Suspense>
      </StartupRegion>
    </Canvas>
  );
}
