import type { ReadonlyVec3 } from "../../types/geometry";
import { ARROW_GEOMETRY } from "./main-menu.constants";

interface Props {
  offset: ReadonlyVec3;
  flipped?: boolean;
}

const ARROW_BLOCKS = [
  [3, 3, 0],
  [2, 2, 0],
  [3, 2, 0],
  [1, 1, 0],
  [2, 1, 0],
  [3, 1, 0],
  [4, 1, 0],
  [5, 1, 0],
  [6, 1, 0],
  [7, 1, 0],
  [0, 0, 0],
  [1, 0, 0],
  [2, 0, 0],
  [3, 0, 0],
  [4, 0, 0],
  [5, 0, 0],
  [6, 0, 0],
  [7, 0, 0],
  [1, -1, 0],
  [2, -1, 0],
  [3, -1, 0],
  [4, -1, 0],
  [5, -1, 0],
  [6, -1, 0],
  [7, -1, 0],
  [2, -2, 0],
  [3, -2, 0],
  [3, -3, 0],
] as const;

export default function BlockyArrow(props: Props) {
  const { offset, flipped = false } = props;
  const direction = flipped ? -1 : 1;
  const centerX = (ARROW_GEOMETRY.columnCount - 1) / 2;

  return (
    <group position={offset}>
      {ARROW_BLOCKS.map(([x, y, z], index) => (
        <mesh
          key={`${x}-${y}-${index}`}
          position={[
            direction * (x - centerX) * ARROW_GEOMETRY.blockSize,
            y * ARROW_GEOMETRY.blockSize,
            z,
          ]}
        >
          <boxGeometry
            args={[
              ARROW_GEOMETRY.blockSize,
              ARROW_GEOMETRY.blockSize,
              ARROW_GEOMETRY.depth,
            ]}
          />
          <meshStandardMaterial
            color={ARROW_GEOMETRY.color}
            emissive={ARROW_GEOMETRY.color}
            emissiveIntensity={ARROW_GEOMETRY.emissiveIntensity}
            roughness={0.92}
          />
        </mesh>
      ))}
    </group>
  );
}
