import Planets from "./Planets";
import Stars from "./Stars";

export default function Starfield() {
  return (
    <group>
      <Stars />
      <Planets />
    </group>
  );
}
