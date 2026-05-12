import type { ReadonlyVec3 } from "../../types/geometry";
import BlockyArrow from "./BlockyArrow";
import { LAYOUT, TEXT_GEOMETRY } from "./main-menu.constants";
import MenuText from "./text/MenuText";

interface Props {
  label: string;
  offset: ReadonlyVec3;
}

export default function NavItem(props: Props) {
  const { label, offset } = props;

  return (
    <group position={offset}>
      <BlockyArrow offset={[LAYOUT.navArrowOffsetX, 0.012, 0]} flipped />
      <MenuText
        offset={[LAYOUT.navTextOffsetX, 0, 0]}
        size={TEXT_GEOMETRY.navItemSize}
      >
        {label}
      </MenuText>
      <BlockyArrow offset={[LAYOUT.navRightArrowOffsetX, 0.012, 0]} />
    </group>
  );
}
