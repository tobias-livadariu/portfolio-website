import { Canvas } from "@react-three/fiber";
import { PrimaryLighting } from "./lighting/PrimaryLighting";
import { COLOR_PALETTE_STR } from "../theme/colors";
import { CAMERA_PROPS, CANVAS_DPR } from "./canvas.constants";
import MainMenu from "./ui3d/MainMenu";

export default function PortfolioCanvas() {
  return (
    <Canvas
      dpr={CANVAS_DPR}
      frameloop="always"
      camera={{
        position: CAMERA_PROPS.position,
        fov: CAMERA_PROPS.fov,
        near: CAMERA_PROPS.near,
        far: CAMERA_PROPS.far,
      }}
    >
      <color attach="background" args={[COLOR_PALETTE_STR.background]} />
      <PrimaryLighting />
      <MainMenu />
    </Canvas>
  );
}
