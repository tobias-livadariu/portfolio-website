import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, MeshStandardMaterial, type Mesh } from "three";
import type { ReadonlyVec3 } from "../../types/geometry";
import { COLOR_PALETTE_STR } from "../../theme/colors";
import { LAYOUT, UI_HALO } from "./main-menu.constants";
import {
  getAnimatedMenuYOffset,
  getAnimatedSeparatorDotYOffset,
  getSeparatorSegmentSize,
} from "./hooks/useMainMenuAnimation";

interface Props {
  startOffset: ReadonlyVec3;
  endOffset: ReadonlyVec3;
  animationIndex: number;
}

// Each separator dot historically created its own BoxGeometry and material.
// Every dot uses the same color/roughness; the only per-dot difference is its
// scale, which is now baked into the mesh `scale` prop. Sharing one geometry +
// one material avoids ~100 redundant GPU buffer allocations.
const SEGMENT_GEOMETRY = new BoxGeometry(1, 1, 1);
const SEGMENT_MATERIAL = new MeshStandardMaterial({
  color: COLOR_PALETTE_STR.campfireAsh,
  roughness: 0.9,
});

export default function HorizontalDottedLine(props: Props) {
  const { startOffset, endOffset, animationIndex } = props;
  const segmentRefs = useRef<Array<Mesh | null>>([]);
  const lastIndex = LAYOUT.separatorSegmentCount - 1;

  useFrame(({ clock }) => {
    const elapsedSeconds = clock.getElapsedTime();
    const lineYOffset = getAnimatedMenuYOffset(animationIndex, elapsedSeconds);

    segmentRefs.current.forEach((segment, index) => {
      if (!segment) {
        return;
      }

      const progress = lastIndex === 0 ? 0 : index / lastIndex;
      const x = startOffset[0] + (endOffset[0] - startOffset[0]) * progress;
      const y = startOffset[1] + (endOffset[1] - startOffset[1]) * progress;
      const z = startOffset[2] + (endOffset[2] - startOffset[2]) * progress;
      const dotYOffset = getAnimatedSeparatorDotYOffset(
        progress,
        elapsedSeconds,
      );

      segment.position.set(x, y + lineYOffset + dotYOffset, z);
    });
  });

  return (
    <group>
      {Array.from({ length: LAYOUT.separatorSegmentCount }, (_, index) => {
        const progress = lastIndex === 0 ? 0 : index / lastIndex;
        const x = startOffset[0] + (endOffset[0] - startOffset[0]) * progress;
        const y = startOffset[1] + (endOffset[1] - startOffset[1]) * progress;
        const z = startOffset[2] + (endOffset[2] - startOffset[2]) * progress;
        const segmentSize = getSeparatorSegmentSize(progress);
        const haloRadiusScale = segmentSize / LAYOUT.separatorMaxSegmentSize;

        return (
          <mesh
            key={index}
            ref={(segment) => {
              segmentRefs.current[index] = segment;
            }}
            geometry={SEGMENT_GEOMETRY}
            material={SEGMENT_MATERIAL}
            position={[x, y, z]}
            scale={segmentSize}
            userData={{
              [UI_HALO.radiusScaleUserDataKey]: haloRadiusScale,
            }}
          />
        );
      })}
    </group>
  );
}
