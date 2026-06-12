import useNotifyFirstFrame from "../../background/use-notify-first-frame";
import Planets from "./Planets";
import Stars from "./Stars";

export default function Starfield() {
  useNotifyFirstFrame("3d");

  return (
    <group>
      <Stars />
      <Planets />
    </group>
  );
}
