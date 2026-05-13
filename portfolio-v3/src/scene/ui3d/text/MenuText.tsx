import { Center, Text3D } from "@react-three/drei";
import type { ReadonlyVec3 } from "../../../types/geometry";
import { THREE_FONTS } from "../../../theme/fonts";
import { TEXT_GEOMETRY, TEXT_MATERIAL } from "../main-menu.constants";

export interface TextBounds {
  width: number;
  height: number;
  centerY: number;
}

interface Props {
  offset: ReadonlyVec3;
  size: number;
  children: string;
  isHovered?: boolean;
  onBoundsChange?: (bounds: TextBounds) => void;
}

export default function MenuText(props: Props) {
  const { offset, size, children, isHovered = false, onBoundsChange } = props;
  const frontColor = isHovered
    ? TEXT_MATERIAL.hoverColor
    : TEXT_MATERIAL.frontColor;
  const sideColor = isHovered
    ? TEXT_MATERIAL.hoverColor
    : TEXT_MATERIAL.sideColor;
  const frontEmissive = isHovered
    ? TEXT_MATERIAL.hoverEmissive
    : TEXT_MATERIAL.frontEmissive;
  const sideEmissive = isHovered
    ? TEXT_MATERIAL.hoverEmissive
    : TEXT_MATERIAL.sideEmissive;
  const frontEmissiveIntensity = isHovered
    ? TEXT_MATERIAL.hoverEmissiveIntensity
    : TEXT_MATERIAL.frontEmissiveIntensity;
  const sideEmissiveIntensity = isHovered
    ? TEXT_MATERIAL.hoverEmissiveIntensity
    : TEXT_MATERIAL.sideEmissiveIntensity;

  return (
    <Center
      position={offset}
      disableY
      disableZ
      onCentered={({ width, height, center }) => {
        onBoundsChange?.({ width, height, centerY: center.y });
      }}
    >
      <Text3D
        font={THREE_FONTS.pixelEmulator}
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
          color={frontColor}
          emissive={frontEmissive}
          emissiveIntensity={frontEmissiveIntensity}
          roughness={TEXT_MATERIAL.frontRoughness}
          metalness={TEXT_MATERIAL.metalness}
        />
        <meshStandardMaterial
          attach="material-1"
          color={sideColor}
          emissive={sideEmissive}
          emissiveIntensity={sideEmissiveIntensity}
          roughness={TEXT_MATERIAL.sideRoughness}
          metalness={TEXT_MATERIAL.metalness}
        />
      </Text3D>
    </Center>
  );
}
