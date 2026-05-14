import { useThree } from "@react-three/fiber";
import type { ReadonlyVec3 } from "../../types/geometry";
import type { PerspectiveCamera } from "three";

interface Props {
  cameraPosition?: ReadonlyVec3;
  marginX: number;
  marginY: number;
  z: number;
}

export default function useTopLeftPosition({
  cameraPosition,
  marginX,
  marginY,
  z,
}: Props): ReadonlyVec3 {
  const { camera, size, viewport } = useThree();
  const referenceCameraPosition = cameraPosition ?? [
    camera.position.x,
    camera.position.y,
    camera.position.z,
  ];
  let visibleWidth = viewport.width;
  let visibleHeight = viewport.height;

  if ("isPerspectiveCamera" in camera && camera.isPerspectiveCamera) {
    const perspectiveCamera = camera as PerspectiveCamera;
    const distance = Math.abs(referenceCameraPosition[2] - z);

    visibleHeight =
      2 * Math.tan((perspectiveCamera.fov * Math.PI) / 360) * distance;
    visibleWidth = visibleHeight * (size.width / size.height);
  }

  const x = referenceCameraPosition[0] - visibleWidth / 2 + marginX;
  const y = referenceCameraPosition[1] + visibleHeight / 2 - marginY;

  const topLeftPosition: ReadonlyVec3 = [x, y, z];
  return topLeftPosition;
}
