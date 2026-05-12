import { Text3D } from "@react-three/drei";
import type { ReadonlyVec3 } from "../../../types/geometry";
import { THREE_FONTS } from "../../../theme/fonts";
import { TEXT_GEOMETRY, TEXT_MATERIAL } from "../main-menu.constants";

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
      curveSegments={1}
    >
      {children}
      <meshStandardMaterial
        attach="material-0"
        color={TEXT_MATERIAL.frontColor}
        emissive={TEXT_MATERIAL.frontEmissive}
        emissiveIntensity={TEXT_MATERIAL.frontEmissiveIntensity}
        roughness={TEXT_MATERIAL.frontRoughness}
        metalness={TEXT_MATERIAL.metalness}
      />
      <meshStandardMaterial
        attach="material-1"
        color={TEXT_MATERIAL.sideColor}
        emissive={TEXT_MATERIAL.sideEmissive}
        emissiveIntensity={TEXT_MATERIAL.sideEmissiveIntensity}
        roughness={TEXT_MATERIAL.sideRoughness}
        metalness={TEXT_MATERIAL.metalness}
      />
    </Text3D>
  );
}
