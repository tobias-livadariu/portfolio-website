import type { ReadonlyVec3 } from "../../types/geometry";
import { COLOR_PALETTE_STR } from "../../theme/colors";
import { LAYOUT } from "./main-menu.constants";

interface Props {
  startOffset: ReadonlyVec3;
  endOffset: ReadonlyVec3;
}

function getSeparatorSegmentSize(progress: number) {
  const edgeDistance = Math.min(progress, 1 - progress);
  const growthRange = (1 - LAYOUT.separatorPlateauRatio) / 2;
  const growthProgress = Math.min(1, edgeDistance / growthRange);
  const easedProgress = Math.pow(growthProgress, LAYOUT.separatorGrowthPower);

  return (
    LAYOUT.separatorMinSegmentSize +
    (LAYOUT.separatorMaxSegmentSize - LAYOUT.separatorMinSegmentSize) *
      easedProgress
  );
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
        const segmentSize = getSeparatorSegmentSize(progress);

        return (
          <mesh key={index} position={[x, y, z]}>
            <boxGeometry args={[segmentSize, segmentSize, segmentSize]} />
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
