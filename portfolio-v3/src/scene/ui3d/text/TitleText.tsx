import { useRef } from "react";
import { Center, Text3D } from "@react-three/drei";
import type { Group } from "three";
import type { ReadonlyVec3 } from "../../../types/geometry";
import { THREE_FONTS } from "../../../theme/fonts";
import {
  ASCII_UI_MATERIAL,
  TEXT_GEOMETRY,
  TEXT_MATERIAL,
} from "../main-menu.constants";
import { useAnimatedMenuPosition } from "../hooks/useMainMenuAnimation";
import { useBackgroundMode } from "../../../background/background-mode-core";

interface Props {
  offset: ReadonlyVec3;
  size: number;
  children: string;
  animationIndex: number;
}

export default function TitleText(props: Props) {
  const { offset, size, children, animationIndex } = props;
  const { visualMode } = useBackgroundMode();
  const useAsciiMaterial =
    visualMode === "ascii" &&
    ASCII_UI_MATERIAL.enabled &&
    ASCII_UI_MATERIAL.text.enabled;
  const asciiFront = ASCII_UI_MATERIAL.text.front;
  const asciiSide = ASCII_UI_MATERIAL.text.side;
  const groupRef = useRef<Group>(null);

  useAnimatedMenuPosition(groupRef, offset, animationIndex);

  return (
    <group ref={groupRef} position={offset}>
      <Center disableY disableZ>
        <Text3D
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
            color={
              useAsciiMaterial ? asciiFront.color : TEXT_MATERIAL.frontColor
            }
            emissive={
              useAsciiMaterial
                ? asciiFront.emissive
                : TEXT_MATERIAL.frontEmissive
            }
            emissiveIntensity={
              useAsciiMaterial
                ? asciiFront.emissiveIntensity
                : TEXT_MATERIAL.frontEmissiveIntensity
            }
            roughness={
              useAsciiMaterial
                ? asciiFront.roughness
                : TEXT_MATERIAL.frontRoughness
            }
            metalness={TEXT_MATERIAL.metalness}
          />
          <meshStandardMaterial
            attach="material-1"
            color={useAsciiMaterial ? asciiSide.color : TEXT_MATERIAL.sideColor}
            emissive={
              useAsciiMaterial ? asciiSide.emissive : TEXT_MATERIAL.sideEmissive
            }
            emissiveIntensity={
              useAsciiMaterial
                ? asciiSide.emissiveIntensity
                : TEXT_MATERIAL.sideEmissiveIntensity
            }
            roughness={
              useAsciiMaterial
                ? asciiSide.roughness
                : TEXT_MATERIAL.sideRoughness
            }
            metalness={TEXT_MATERIAL.metalness}
          />
        </Text3D>
      </Center>
    </group>
  );
}
