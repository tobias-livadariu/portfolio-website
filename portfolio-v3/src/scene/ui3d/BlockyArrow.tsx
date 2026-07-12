import { BoxGeometry, MeshStandardMaterial, type Material } from "three";
import type { ReadonlyVec3 } from "../../types/geometry";
import { useBackgroundMode } from "../../background/background-mode-core";
import {
  ARROW_GEOMETRY,
  ASCII_UI_MATERIAL,
  TEXT_MATERIAL,
} from "./main-menu.constants";

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

// BoxGeometry creates six material groups: +x, -x, +y, -y, +z, -z. The menu
// camera sees the +z face (group index 4) as the arrow front; every other face
// uses the darker side material.
const BOX_FRONT_MATERIAL_INDEX = 4;

const ARROW_BLOCK_GEOMETRY = new BoxGeometry(1, 1, 1);

const ARROW_FRONT_MATERIAL = new MeshStandardMaterial({
  color: TEXT_MATERIAL.hoveredFrontColor,
  emissive: TEXT_MATERIAL.hoveredFrontEmissive,
  emissiveIntensity: TEXT_MATERIAL.hoveredFrontEmissiveIntensity,
  roughness: TEXT_MATERIAL.hoveredFrontRoughness,
  metalness: TEXT_MATERIAL.metalness,
});

const ARROW_SIDE_MATERIAL = new MeshStandardMaterial({
  color: TEXT_MATERIAL.hoveredSideColor,
  emissive: TEXT_MATERIAL.hoveredSideEmissive,
  emissiveIntensity: TEXT_MATERIAL.hoveredSideEmissiveIntensity,
  roughness: TEXT_MATERIAL.hoveredSideRoughness,
  metalness: TEXT_MATERIAL.metalness,
});

const ARROW_BLOCK_MATERIALS: Material[] = Array.from(
  { length: 6 },
  (_, index) =>
    index === BOX_FRONT_MATERIAL_INDEX
      ? ARROW_FRONT_MATERIAL
      : ARROW_SIDE_MATERIAL,
);

const ASCII_ARROW_FRONT_MATERIAL = new MeshStandardMaterial({
  ...ASCII_UI_MATERIAL.arrows.front,
  metalness: TEXT_MATERIAL.metalness,
});

const ASCII_ARROW_SIDE_MATERIAL = new MeshStandardMaterial({
  ...ASCII_UI_MATERIAL.arrows.side,
  metalness: TEXT_MATERIAL.metalness,
});

const ASCII_ARROW_BLOCK_MATERIALS: Material[] = Array.from(
  { length: 6 },
  (_, index) =>
    index === BOX_FRONT_MATERIAL_INDEX
      ? ASCII_ARROW_FRONT_MATERIAL
      : ASCII_ARROW_SIDE_MATERIAL,
);

export default function BlockyArrow(props: Props) {
  const { offset, flipped = false } = props;
  const { visualMode } = useBackgroundMode();
  const materials =
    visualMode === "ascii" &&
    ASCII_UI_MATERIAL.enabled &&
    ASCII_UI_MATERIAL.arrows.enabled
      ? ASCII_ARROW_BLOCK_MATERIALS
      : ARROW_BLOCK_MATERIALS;
  const direction = flipped ? -1 : 1;
  const centerX = (ARROW_GEOMETRY.columnCount - 1) / 2;

  return (
    <group position={offset}>
      {ARROW_BLOCKS.map(([x, y, z], index) => (
        <mesh
          key={`${x}-${y}-${index}`}
          geometry={ARROW_BLOCK_GEOMETRY}
          material={materials}
          position={[
            direction * (x - centerX) * ARROW_GEOMETRY.blockSize,
            y * ARROW_GEOMETRY.blockSize,
            z,
          ]}
          scale={[
            ARROW_GEOMETRY.blockSize,
            ARROW_GEOMETRY.blockSize,
            ARROW_GEOMETRY.depth,
          ]}
        />
      ))}
    </group>
  );
}
