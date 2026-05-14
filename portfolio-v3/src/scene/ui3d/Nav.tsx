import { LAYOUT, MENU_ELEMENT_INDEX, NAV_ITEMS } from "./main-menu.constants";
import NavItem from "./NavItem";

const NAV_ANIMATION_INDICES = [
  MENU_ELEMENT_INDEX.about,
  MENU_ELEMENT_INDEX.resume,
  MENU_ELEMENT_INDEX.portfolio,
  MENU_ELEMENT_INDEX.contactMe,
] as const;

export default function Nav() {
  return (
    <group>
      {NAV_ITEMS.map((item, index) => (
        <NavItem
          key={item.key}
          navKey={item.key}
          label={item.label}
          offset={LAYOUT.navItemOffsets[index]}
          animationIndex={NAV_ANIMATION_INDICES[index]}
        />
      ))}
    </group>
  );
}
