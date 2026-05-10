import useTopLeftPosition from "../hooks/useTopLeftPosition";
import { LAYOUT } from "./constants/main-menu.constants.ts";
import Title from "./Title.tsx";
import HorizontalDottedLine from "./HorizontalDottedLine.tsx";
import Nav from "./Nav.tsx";

export default function MainMenu() {
  const topLeftPosition = useTopLeftPosition({
    marginX: LAYOUT.marginX,
    marginY: LAYOUT.marginY,
    z: 10,
  });

  return (
    <group position={topLeftPosition} rotation={LAYOUT.mainMenuRotation}>
      <Title offset={[0, 0, 0]} />
      <HorizontalDottedLine />
      <Nav />
      <HorizontalDottedLine />
    </group>
  );
}
