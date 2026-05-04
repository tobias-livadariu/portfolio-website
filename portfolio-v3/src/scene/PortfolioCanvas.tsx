import { Canvas } from "@react-three/fiber";
import { COLOR_PALETTE_STR } from "../theme/colors";

export default function PortfolioCanvas() {
  return (
    <Canvas
      orthographic
      dpr={[1, 1.5]}
      frameloop="always"
      camera={{ position: [0, 0, 100], zoom: 100, near: 0.1, far: 1000 }}
    >
      <color attach="background" args={[COLOR_PALETTE_STR.background]}></color>
    </Canvas>
  );
}
