import useNotifyFirstFrame from "../../background/use-notify-first-frame";
import Planets from "./Planets";
import Stars from "./Stars";
import type { BackgroundMode } from "../../background/background-mode-core";
import { ASCII_STARFIELD } from "./starfield.constants";

export default function Starfield({
  readyMode = "3d",
}: {
  readyMode?: BackgroundMode;
}) {
  useNotifyFirstFrame(readyMode);
  const isAscii = readyMode === "ascii";

  return (
    <group>
      <Stars visualScale={isAscii ? ASCII_STARFIELD.starSizeScale : 1} />
      <Planets visualScale={isAscii ? ASCII_STARFIELD.planetSizeScale : 1} />
    </group>
  );
}
