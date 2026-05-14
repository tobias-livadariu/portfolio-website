import type { ReadonlyVec3 } from "../../types/geometry";
import {
  TITLE_TEXT,
  LAYOUT,
  MENU_ELEMENT_INDEX,
  TEXT_GEOMETRY,
} from "./main-menu.constants";
import TitleText from "./text/TitleText";

interface Props {
  offset: ReadonlyVec3;
}

export default function Title(props: Props) {
  const { offset } = props;

  return (
    <group position={offset}>
      <TitleText
        offset={LAYOUT.introOffset}
        size={TEXT_GEOMETRY.introSize}
        animationIndex={MENU_ELEMENT_INDEX.intro}
      >
        {TITLE_TEXT.intro}
      </TitleText>
      <TitleText
        offset={LAYOUT.firstNameOffset}
        size={TEXT_GEOMETRY.nameSize}
        animationIndex={MENU_ELEMENT_INDEX.firstName}
      >
        {TITLE_TEXT.firstName}
      </TitleText>
      <TitleText
        offset={LAYOUT.lastNameOffset}
        size={TEXT_GEOMETRY.nameSize}
        animationIndex={MENU_ELEMENT_INDEX.lastName}
      >
        {TITLE_TEXT.lastName}
      </TitleText>
    </group>
  );
}
