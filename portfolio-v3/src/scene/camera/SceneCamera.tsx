import { OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useBackgroundMode } from "../../background/background-mode-core";
import { CAMERA_PROPS } from "../canvas.constants";

export default function SceneCamera() {
  const { visualMode } = useBackgroundMode();
  const { size } = useThree();

  if (visualMode === "2d") {
    const distanceToMenu = Math.abs(CAMERA_PROPS.position[2]);
    const visibleHeight =
      2 * Math.tan((CAMERA_PROPS.fov * Math.PI) / 360) * distanceToMenu;

    return (
      <OrthographicCamera
        far={CAMERA_PROPS.far}
        makeDefault
        near={CAMERA_PROPS.near}
        position={CAMERA_PROPS.position}
        zoom={size.height / visibleHeight}
      />
    );
  }

  return (
    <PerspectiveCamera
      far={CAMERA_PROPS.far}
      fov={CAMERA_PROPS.fov}
      makeDefault
      near={CAMERA_PROPS.near}
      position={CAMERA_PROPS.position}
    />
  );
}
