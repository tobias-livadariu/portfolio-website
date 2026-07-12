import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  MeshStandardMaterial,
  type Material,
  type Mesh,
} from "three";
import type { ReadonlyVec3 } from "../../types/geometry";
import { COLOR_PALETTE_STR } from "../../theme/colors";
import { useBackgroundMode } from "../../background/background-mode-core";
import {
  ASCII_UI_MATERIAL,
  LAYOUT,
  TEXT_MATERIAL,
  UI_HALO,
} from "./main-menu.constants";
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
const BOX_FRONT_MATERIAL_INDEX = 4;

const SEGMENT_FRONT_MATERIAL = new MeshStandardMaterial({
  color: COLOR_PALETTE_STR.campfireAsh,
  roughness: 0.9,
});

const SEGMENT_SIDE_MATERIAL = new MeshStandardMaterial({
  color: COLOR_PALETTE_STR.campfireAsh,
  roughness: 0.9,
});

const SEGMENT_MATERIALS: Material[] = Array.from({ length: 6 }, (_, index) =>
  index === BOX_FRONT_MATERIAL_INDEX
    ? SEGMENT_FRONT_MATERIAL
    : SEGMENT_SIDE_MATERIAL,
);

const ASCII_SEGMENT_FRONT_MATERIAL = new MeshStandardMaterial({
  ...ASCII_UI_MATERIAL.separators.front,
  metalness: TEXT_MATERIAL.metalness,
});

const ASCII_SEGMENT_SIDE_MATERIAL = new MeshStandardMaterial({
  ...ASCII_UI_MATERIAL.separators.side,
  metalness: TEXT_MATERIAL.metalness,
});

const ASCII_SEGMENT_MATERIALS: Material[] = Array.from(
  { length: 6 },
  (_, index) =>
    index === BOX_FRONT_MATERIAL_INDEX
      ? ASCII_SEGMENT_FRONT_MATERIAL
      : ASCII_SEGMENT_SIDE_MATERIAL,
);

export default function HorizontalDottedLine(props: Props) {
  const { startOffset, endOffset, animationIndex } = props;
  const { visualMode } = useBackgroundMode();
  const materials =
    visualMode === "ascii" &&
    ASCII_UI_MATERIAL.enabled &&
    ASCII_UI_MATERIAL.separators.enabled
      ? ASCII_SEGMENT_MATERIALS
      : SEGMENT_MATERIALS;
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
            material={materials}
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
