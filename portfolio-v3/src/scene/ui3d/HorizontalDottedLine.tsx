import type { ReadonlyVec3 } from "../../types/geometry";
import { COLOR_PALETTE_STR } from "../../theme/colors";
import { LAYOUT } from "./main-menu.constants";

interface Props {
  startOffset: ReadonlyVec3;
  endOffset: ReadonlyVec3;
}

export default function HorizontalDottedLine(props: Props) {
  const { startOffset, endOffset } = props;
  const lastIndex = LAYOUT.separatorSegmentCount - 1;

  return (
    <group>
      {Array.from({ length: LAYOUT.separatorSegmentCount }, (_, index) => {
        const progress = lastIndex === 0 ? 0 : index / lastIndex;
        const x = startOffset[0] + (endOffset[0] - startOffset[0]) * progress;
        const y = startOffset[1] + (endOffset[1] - startOffset[1]) * progress;
        const z = startOffset[2] + (endOffset[2] - startOffset[2]) * progress;

        return (
          <mesh key={index} position={[x, y, z]}>
            <boxGeometry args={LAYOUT.separatorSegmentSize} />
            <meshStandardMaterial
              color={COLOR_PALETTE_STR.campfireAsh}
              roughness={0.9}
            />
          </mesh>
        );
      })}
    </group>
  );
}
