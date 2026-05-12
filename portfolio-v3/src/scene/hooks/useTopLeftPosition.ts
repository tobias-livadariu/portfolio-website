import { useThree } from "@react-three/fiber";
import type { ReadonlyVec3 } from "../../types/geometry";
import type { PerspectiveCamera } from "three";

interface Props {
  marginX: number;
  marginY: number;
  z: number;
}

export default function useTopLeftPosition({
  marginX,
  marginY,
  z,
}: Props): ReadonlyVec3 {
  const { camera, size, viewport } = useThree();
  let visibleWidth = viewport.width;
  let visibleHeight = viewport.height;

  if ("isPerspectiveCamera" in camera && camera.isPerspectiveCamera) {
    const perspectiveCamera = camera as PerspectiveCamera;
    const distance = Math.abs(perspectiveCamera.position.z - z);

    visibleHeight =
      2 * Math.tan((perspectiveCamera.fov * Math.PI) / 360) * distance;
    visibleWidth = visibleHeight * (size.width / size.height);
  }

  const x = camera.position.x - visibleWidth / 2 + marginX;
  const y = camera.position.y + visibleHeight / 2 - marginY;

  const topLeftPosition: ReadonlyVec3 = [x, y, z];
  return topLeftPosition;
}
