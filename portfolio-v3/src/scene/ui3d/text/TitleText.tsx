import { Text3D } from "@react-three/drei";
import type { ReadonlyVec3 } from "../../../types/geometry";
import { THREE_FONTS } from "../../../theme/fonts";
import { COLOR_PALETTE_STR } from "../../../theme/colors";
import { TEXT_GEOMETRY, TEXT_MATERIAL } from "../constants/main-menu.constants";

interface Props {
  offset: ReadonlyVec3;
  size: number;
  children: string;
}

export default function TitleText(props: Props) {
  const { offset, size, children } = props;

  return (
    <Text3D
      position={offset}
      font={THREE_FONTS.pressStart2p}
      size={size}
      height={TEXT_GEOMETRY.height}
      bevelEnabled
      bevelSize={TEXT_GEOMETRY.bevelSize}
      bevelThickness={TEXT_GEOMETRY.bevelThickness}
      bevelSegments={1}
    >
      {children}
      <meshStandardMaterial
        color={COLOR_PALETTE_STR.campfire}
        emissive={COLOR_PALETTE_STR.campfire}
        emissiveIntensity={TEXT_MATERIAL.titleEmissiveIntensity}
        roughness={TEXT_MATERIAL.titleRoughness}
      />
    </Text3D>
  );
}
