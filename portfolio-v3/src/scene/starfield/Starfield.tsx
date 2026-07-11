import useNotifyFirstFrame from "../../background/use-notify-first-frame";
import Planets from "./Planets";
import Stars from "./Stars";
import type { BackgroundMode } from "../../background/background-mode-core";

export default function Starfield({
  readyMode = "3d",
}: {
  readyMode?: BackgroundMode;
}) {
  useNotifyFirstFrame(readyMode);

  return (
    <group>
      <Stars />
      <Planets />
    </group>
  );
}
