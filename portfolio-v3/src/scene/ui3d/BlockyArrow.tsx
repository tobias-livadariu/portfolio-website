import type { ReadonlyVec3 } from "../../types/geometry";
import { ARROW_GEOMETRY, TEXT_MATERIAL } from "./main-menu.constants";

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

// BoxGeometry creates six material groups: +x, -x, +y, -y, +z, -z.
// The menu camera sees the +z face as the arrow front, while the remaining
// faces should use the same darker side material as hovered Text3D extrusion.
const BOX_FRONT_MATERIAL_INDEX = 4;
const BOX_SIDE_MATERIAL_INDICES = [0, 1, 2, 3, 5] as const;

function ArrowFrontMaterial() {
  return (
    <meshStandardMaterial
      attach={`material-${BOX_FRONT_MATERIAL_INDEX}`}
      color={TEXT_MATERIAL.hoveredFrontColor}
      emissive={TEXT_MATERIAL.hoveredFrontEmissive}
      emissiveIntensity={TEXT_MATERIAL.hoveredFrontEmissiveIntensity}
      roughness={TEXT_MATERIAL.hoveredFrontRoughness}
      metalness={TEXT_MATERIAL.metalness}
    />
  );
}

function ArrowSideMaterial(props: { materialIndex: number }) {
  return (
    <meshStandardMaterial
      attach={`material-${props.materialIndex}`}
      color={TEXT_MATERIAL.hoveredSideColor}
      emissive={TEXT_MATERIAL.hoveredSideEmissive}
      emissiveIntensity={TEXT_MATERIAL.hoveredSideEmissiveIntensity}
      roughness={TEXT_MATERIAL.hoveredSideRoughness}
      metalness={TEXT_MATERIAL.metalness}
    />
  );
}

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
          <ArrowFrontMaterial />
          {BOX_SIDE_MATERIAL_INDICES.map((materialIndex) => (
            <ArrowSideMaterial
              key={materialIndex}
              materialIndex={materialIndex}
            />
          ))}
        </mesh>
      ))}
    </group>
  );
}
