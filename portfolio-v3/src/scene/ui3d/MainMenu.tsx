import { useRef } from "react";
import { useThree } from "@react-three/fiber";
import type { Group } from "three";
import useTopLeftPosition from "../hooks/useTopLeftPosition";
import { CAMERA_PROPS } from "../canvas.constants";
import { LAYOUT, RESPONSIVE_SCALE, UI_HALO } from "./main-menu.constants";
import { useAnimatedMainMenuRotation } from "./hooks/useMainMenuAnimation";
import getCameraFacingRotation from "./utils/getCameraFacingRotation";
import Title from "./Title.tsx";
import HorizontalDottedLine from "./HorizontalDottedLine.tsx";
import Nav from "./Nav.tsx";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

export default function MainMenu() {
  const menuRef = useRef<Group>(null);
  const { size } = useThree();
  const scale = clamp(
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

  const topLeftPosition = useTopLeftPosition({
    cameraPosition: CAMERA_PROPS.position,
    marginX: LAYOUT.marginX * scale,
    marginY: LAYOUT.marginY * scale,
    z: LAYOUT.z,
  });
  const rotationFocusPosition = [
    topLeftPosition[0] + LAYOUT.rotationFocusOffset[0] * scale,
    topLeftPosition[1] + LAYOUT.rotationFocusOffset[1] * scale,
    topLeftPosition[2] + LAYOUT.rotationFocusOffset[2] * scale,
  ] as const;
  const cameraFacingPeakRotation = getCameraFacingRotation(
    rotationFocusPosition,
    CAMERA_PROPS.position,
  );

  useAnimatedMainMenuRotation(
    menuRef,
    troughRotation,
    cameraFacingPeakRotation,
  );

  return (
    <group
      ref={menuRef}
      name={UI_HALO.rootName}
      position={topLeftPosition}
      rotation={troughRotation}
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
