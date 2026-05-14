import { useCallback, useRef, useState } from "react";
import { useCursor } from "@react-three/drei";
import type { ReadonlyVec3 } from "../../types/geometry";
import type { Group } from "three";
import BlockyArrow from "./BlockyArrow";
import {
  ARROW_GEOMETRY,
  LAYOUT,
  NAV_HITBOX,
  TEXT_GEOMETRY,
} from "./main-menu.constants";
import { useAnimatedMenuPosition } from "./hooks/useMainMenuAnimation";
import MenuText, { type TextBounds } from "./text/MenuText";

interface Props {
  navKey: string;
  label: string;
  offset: ReadonlyVec3;
  animationIndex: number;
}

export default function NavItem(props: Props) {
  const { navKey, label, offset, animationIndex } = props;
  const groupRef = useRef<Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [textBounds, setTextBounds] = useState<TextBounds | null>(null);
  const arrowWidth = ARROW_GEOMETRY.columnCount * ARROW_GEOMETRY.blockSize;
  const arrowHeight = ARROW_GEOMETRY.rowCount * ARROW_GEOMETRY.blockSize;
  const textCenterY = textBounds ? -textBounds.centerY : 0;
  const leftArrowX = textBounds
    ? LAYOUT.navTextCenterX -
      textBounds.width / 2 -
      ARROW_GEOMETRY.leftArrowMargin -
      arrowWidth / 2
    : LAYOUT.navTextCenterX;
  const rightArrowX = textBounds
    ? LAYOUT.navTextCenterX +
      textBounds.width / 2 +
      ARROW_GEOMETRY.rightArrowMargin +
      arrowWidth / 2
    : LAYOUT.navTextCenterX;
  const hitboxBounds = textBounds
    ? {
        centerX: (leftArrowX + rightArrowX) / 2,
        height:
          Math.max(textBounds.height, arrowHeight) + NAV_HITBOX.paddingY * 2,
        width: rightArrowX - leftArrowX + arrowWidth + NAV_HITBOX.paddingX * 2,
      }
    : null;

  const handleBoundsChange = useCallback((nextBounds: TextBounds) => {
    setTextBounds((previousBounds) => {
      if (
        previousBounds &&
        Math.abs(previousBounds.width - nextBounds.width) < 0.001 &&
        Math.abs(previousBounds.height - nextBounds.height) < 0.001 &&
        Math.abs(previousBounds.centerY - nextBounds.centerY) < 0.001
      ) {
        return previousBounds;
      }

      return nextBounds;
    });
  }, []);

  useAnimatedMenuPosition(groupRef, offset, animationIndex);
  useCursor(isHovered);

  return (
    <group
      ref={groupRef}
      position={offset}
      onClick={(event) => {
        event.stopPropagation();
        console.log(`clicked ${navKey}!`);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setIsHovered(true);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setIsHovered(false);
      }}
    >
      {hitboxBounds && (
        <mesh position={[hitboxBounds.centerX, 0, TEXT_GEOMETRY.height / 2]}>
          <boxGeometry
            args={[hitboxBounds.width, hitboxBounds.height, NAV_HITBOX.depth]}
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      {isHovered && textBounds && (
        <BlockyArrow offset={[leftArrowX, 0, 0]} flipped />
      )}
      <MenuText
        offset={[LAYOUT.navTextCenterX, textCenterY, 0]}
        size={TEXT_GEOMETRY.navItemSize}
        isHovered={isHovered}
        onBoundsChange={handleBoundsChange}
      >
        {label}
      </MenuText>
      {isHovered && textBounds && <BlockyArrow offset={[rightArrowX, 0, 0]} />}
    </group>
  );
}
