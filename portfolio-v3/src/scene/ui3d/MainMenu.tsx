import { useRef } from "react";
import { useThree } from "@react-three/fiber";
import type { Group } from "three";
import useTopLeftPosition from "../hooks/useTopLeftPosition";
import { CAMERA_PROPS } from "../canvas.constants";
import {
  LAYOUT,
  MODE_MENU_LAYOUT,
  RESPONSIVE_SCALE,
  UI_HALO,
} from "./main-menu.constants";
import { useAnimatedMainMenuRotation } from "./hooks/useMainMenuAnimation";
import getCameraFacingRotation from "./utils/getCameraFacingRotation";
import Title from "./Title.tsx";
import HorizontalDottedLine from "./HorizontalDottedLine.tsx";
import Nav from "./Nav.tsx";
import { useBackgroundMode } from "../../background/background-mode-core";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

export default function MainMenu() {
  const { visualMode } = useBackgroundMode();
  const menuRef = useRef<Group>(null);
  const { camera, size, viewport } = useThree();
  const responsiveScale = clamp(
    size.width / RESPONSIVE_SCALE.referenceWidth,
    RESPONSIVE_SCALE.min,
    RESPONSIVE_SCALE.max,
  );
  const viewportWidthRatio = clamp(
    size.width / RESPONSIVE_SCALE.referenceWidth,
    0,
    1,
  );
  const troughRotationScaleProgress = clamp(
    (viewportWidthRatio - RESPONSIVE_SCALE.minTroughRotationWidthRatio) /
      (RESPONSIVE_SCALE.referenceScale -
        RESPONSIVE_SCALE.minTroughRotationWidthRatio),
    0,
    1,
  );
  const troughRotationScale = lerp(
    RESPONSIVE_SCALE.minTroughRotationScale,
    RESPONSIVE_SCALE.maxTroughRotationScale,
    troughRotationScaleProgress,
  );
  const troughRotation = [
    LAYOUT.mainMenuRotation[0] * troughRotationScale,
    LAYOUT.mainMenuRotation[1] * troughRotationScale,
    LAYOUT.mainMenuRotation[2] * troughRotationScale,
  ] as const;

  const visibleViewport = viewport.getCurrentViewport(
    camera,
    [CAMERA_PROPS.position[0], CAMERA_PROPS.position[1], LAYOUT.z],
    size,
  );
  const asciiScale = Math.min(
    (visibleViewport.width * (1 - MODE_MENU_LAYOUT.asciiMarginRatioX * 2)) /
      MODE_MENU_LAYOUT.localWidth,
    (visibleViewport.height * (1 - MODE_MENU_LAYOUT.asciiMarginRatioY * 2)) /
      MODE_MENU_LAYOUT.localHeight,
  );
  const scale =
    visualMode === "ascii"
      ? asciiScale
      : visualMode === "2d"
        ? responsiveScale * MODE_MENU_LAYOUT.flatScaleMultiplier
        : responsiveScale;

  const topLeftPosition = useTopLeftPosition({
    cameraPosition: CAMERA_PROPS.position,
    marginX: LAYOUT.marginX * scale,
    marginY: LAYOUT.marginY * scale,
    z: LAYOUT.z,
  });
  const asciiMenuWidth = MODE_MENU_LAYOUT.localWidth * asciiScale;
  const asciiMenuHeight = MODE_MENU_LAYOUT.localHeight * asciiScale;
  const asciiCenteredTopWhitespace = Math.max(
    0,
    (visibleViewport.height - asciiMenuHeight) / 2,
  );
  const asciiHorizontalSideWhitespace = Math.max(
    0,
    (visibleViewport.width - asciiMenuWidth) / 2,
  );
  const asciiMinimumTopWhitespace =
    (MODE_MENU_LAYOUT.asciiMinimumTopWhitespacePx / Math.max(1, size.height)) *
    visibleViewport.height;
  const asciiTopWhitespace = Math.min(
    asciiCenteredTopWhitespace,
    Math.max(
      asciiMinimumTopWhitespace,
      asciiHorizontalSideWhitespace *
        MODE_MENU_LAYOUT.asciiTopWhitespaceSideGapMultiplier,
    ),
  );
  const menuPosition =
    visualMode === "ascii"
      ? ([
          CAMERA_PROPS.position[0] - MODE_MENU_LAYOUT.localCenterX * scale,
          CAMERA_PROPS.position[1] +
            visibleViewport.height / 2 -
            asciiTopWhitespace -
            MODE_MENU_LAYOUT.localTopY * scale,
          LAYOUT.z,
        ] as const)
      : topLeftPosition;
  const rotationFocusPosition = [
    menuPosition[0] + LAYOUT.rotationFocusOffset[0] * scale,
    menuPosition[1] + LAYOUT.rotationFocusOffset[1] * scale,
    menuPosition[2] + LAYOUT.rotationFocusOffset[2] * scale,
  ] as const;
  const cameraFacingPeakRotation = getCameraFacingRotation(
    rotationFocusPosition,
    CAMERA_PROPS.position,
  );

  useAnimatedMainMenuRotation(
    menuRef,
    troughRotation,
    cameraFacingPeakRotation,
    visualMode !== "2d",
  );

  return (
    <group
      ref={menuRef}
      name={UI_HALO.rootName}
      position={menuPosition}
      rotation={visualMode === "2d" ? [0, 0, 0] : troughRotation}
      scale={scale}
    >
      <Title offset={[0, 0, 0]} />
      <HorizontalDottedLine
        startOffset={LAYOUT.upperSeparatorStartOffset}
        endOffset={LAYOUT.upperSeparatorEndOffset}
        animationIndex={LAYOUT.upperSeparatorAnimationIndex}
      />
      <Nav />
      <HorizontalDottedLine
        startOffset={LAYOUT.lowerSeparatorStartOffset}
        endOffset={LAYOUT.lowerSeparatorEndOffset}
        animationIndex={LAYOUT.lowerSeparatorAnimationIndex}
      />
    </group>
  );
}
