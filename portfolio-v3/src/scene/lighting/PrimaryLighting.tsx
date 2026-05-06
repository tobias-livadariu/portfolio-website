import useTopLeftPosition from "../hooks/useTopLeftPosition";
import { COLOR_PALETTE_STR } from "../../theme/colors";

export function PrimaryLighting() {
  const topLeftPosition = useTopLeftPosition({ marginX: 0, marginY: 0, z: 10 });

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight
        position={topLeftPosition}
        intensity={0.9}
        color={COLOR_PALETTE_STR.lightWarm}
      />
      <pointLight
        position={topLeftPosition}
        intensity={0.8}
        distance={12}
        color={COLOR_PALETTE_STR.lightWarm}
      />
    </>
  );
}
