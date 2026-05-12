import { LAYOUT, NAV_ITEMS } from "./main-menu.constants";
import NavItem from "./NavItem";

export default function Nav() {
  return (
    <group>
      {NAV_ITEMS.map((item, index) => (
        <NavItem
          key={item.key}
          label={item.label}
          offset={LAYOUT.navItemOffsets[index]}
        />
      ))}
    </group>
  );
}
