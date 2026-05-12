import { useThree } from "@react-three/fiber";
import useTopLeftPosition from "../hooks/useTopLeftPosition";
import { LAYOUT, RESPONSIVE_SCALE } from "./main-menu.constants";
import Title from "./Title.tsx";
import HorizontalDottedLine from "./HorizontalDottedLine.tsx";
import Nav from "./Nav.tsx";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function MainMenu() {
  const { size } = useThree();
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

  return (
    <group
      position={topLeftPosition}
      rotation={LAYOUT.mainMenuRotation}
      scale={scale}
    >
      <Title offset={[0, 0, 0]} />
      <HorizontalDottedLine
        startOffset={LAYOUT.upperSeparatorStartOffset}
        endOffset={LAYOUT.upperSeparatorEndOffset}
      />
      <Nav />
      <HorizontalDottedLine
        startOffset={LAYOUT.lowerSeparatorStartOffset}
        endOffset={LAYOUT.lowerSeparatorEndOffset}
      />
    </group>
  );
}
