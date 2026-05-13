import { useCallback, useRef, useState } from "react";
import type { ReadonlyVec3 } from "../../types/geometry";
import type { Group } from "three";
import BlockyArrow from "./BlockyArrow";
import { ARROW_GEOMETRY, LAYOUT, TEXT_GEOMETRY } from "./main-menu.constants";
import { useAnimatedMenuPosition } from "./hooks/useMainMenuAnimation";
import MenuText, { type TextBounds } from "./text/MenuText";

interface Props {
  label: string;
  offset: ReadonlyVec3;
  animationIndex: number;
}

export default function NavItem(props: Props) {
  const { label, offset, animationIndex } = props;
  const groupRef = useRef<Group>(null);
  const [textBounds, setTextBounds] = useState<TextBounds | null>(null);
  const arrowWidth = ARROW_GEOMETRY.columnCount * ARROW_GEOMETRY.blockSize;
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

  return (
    <group ref={groupRef} position={offset}>
      {textBounds && <BlockyArrow offset={[leftArrowX, 0, 0]} flipped />}
      <MenuText
        offset={[LAYOUT.navTextCenterX, textCenterY, 0]}
        size={TEXT_GEOMETRY.navItemSize}
        onBoundsChange={handleBoundsChange}
      >
        {label}
      </MenuText>
      {textBounds && <BlockyArrow offset={[rightArrowX, 0, 0]} />}
    </group>
  );
}
