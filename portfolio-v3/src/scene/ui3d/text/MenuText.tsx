import { Center, Text3D } from "@react-three/drei";
import type { ReadonlyVec3 } from "../../../types/geometry";
import { THREE_FONTS } from "../../../theme/fonts";
import {
  ASCII_UI_MATERIAL,
  TEXT_GEOMETRY,
  TEXT_MATERIAL,
} from "../main-menu.constants";
import { useBackgroundMode } from "../../../background/background-mode-core";

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
  const { visualMode } = useBackgroundMode();
  const useAsciiMaterial =
    visualMode === "ascii" &&
    ASCII_UI_MATERIAL.enabled &&
    ASCII_UI_MATERIAL.text.enabled;
  const asciiFront = isHovered
    ? ASCII_UI_MATERIAL.text.hoveredFront
    : ASCII_UI_MATERIAL.text.front;
  const asciiSide = isHovered
    ? ASCII_UI_MATERIAL.text.hoveredSide
    : ASCII_UI_MATERIAL.text.side;
  const frontColor = useAsciiMaterial
    ? asciiFront.color
    : isHovered
      ? TEXT_MATERIAL.hoveredFrontColor
      : TEXT_MATERIAL.frontColor;
  const sideColor = useAsciiMaterial
    ? asciiSide.color
    : isHovered
      ? TEXT_MATERIAL.hoveredSideColor
      : TEXT_MATERIAL.sideColor;
  const frontEmissive = useAsciiMaterial
    ? asciiFront.emissive
    : isHovered
      ? TEXT_MATERIAL.hoveredFrontEmissive
      : TEXT_MATERIAL.frontEmissive;
  const sideEmissive = useAsciiMaterial
    ? asciiSide.emissive
    : isHovered
      ? TEXT_MATERIAL.hoveredSideEmissive
      : TEXT_MATERIAL.sideEmissive;
  const frontEmissiveIntensity = useAsciiMaterial
    ? asciiFront.emissiveIntensity
    : isHovered
      ? TEXT_MATERIAL.hoveredFrontEmissiveIntensity
      : TEXT_MATERIAL.frontEmissiveIntensity;
  const sideEmissiveIntensity = useAsciiMaterial
    ? asciiSide.emissiveIntensity
    : isHovered
      ? TEXT_MATERIAL.hoveredSideEmissiveIntensity
      : TEXT_MATERIAL.sideEmissiveIntensity;
  const frontRoughness = useAsciiMaterial
    ? asciiFront.roughness
    : isHovered
      ? TEXT_MATERIAL.hoveredFrontRoughness
      : TEXT_MATERIAL.frontRoughness;
  const sideRoughness = useAsciiMaterial
    ? asciiSide.roughness
    : isHovered
      ? TEXT_MATERIAL.hoveredSideRoughness
      : TEXT_MATERIAL.sideRoughness;

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
          roughness={frontRoughness}
          metalness={TEXT_MATERIAL.metalness}
        />
        <meshStandardMaterial
          attach="material-1"
          color={sideColor}
          emissive={sideEmissive}
          emissiveIntensity={sideEmissiveIntensity}
          roughness={sideRoughness}
          metalness={TEXT_MATERIAL.metalness}
        />
      </Text3D>
    </Center>
  );
}
