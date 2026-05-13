import { useRef } from "react";
import { useThree } from "@react-three/fiber";
import type { Group } from "three";
import useTopLeftPosition from "../hooks/useTopLeftPosition";
import { LAYOUT, RESPONSIVE_SCALE } from "./main-menu.constants";
import { useAnimatedMainMenuRotation } from "./hooks/useMainMenuAnimation";
import getCameraFacingRotation from "./utils/getCameraFacingRotation";
import Title from "./Title.tsx";
import HorizontalDottedLine from "./HorizontalDottedLine.tsx";
import Nav from "./Nav.tsx";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function MainMenu() {
  const menuRef = useRef<Group>(null);
  const { camera, size } = useThree();
  const scale = clamp(
    size.width / RESPONSIVE_SCALE.referenceWidth,
    RESPONSIVE_SCALE.min,
    RESPONSIVE_SCALE.max,
  );

  const topLeftPosition = useTopLeftPosition({
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
    camera.position,
  );

  useAnimatedMainMenuRotation(menuRef, cameraFacingPeakRotation);

  return (
    <group
      ref={menuRef}
      position={topLeftPosition}
      rotation={LAYOUT.mainMenuRotation}
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
