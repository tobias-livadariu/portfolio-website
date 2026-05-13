import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { CAMERA_POINTER_SHIFT, CAMERA_PROPS } from "../canvas.constants";

export default function PointerCameraShift() {
  const basePosition = useMemo(() => new Vector3(...CAMERA_PROPS.position), []);
  const targetPosition = useMemo(() => new Vector3(), []);

  useFrame(({ camera, pointer }, delta) => {
    if (!CAMERA_POINTER_SHIFT.enabled) {
      return;
    }

    targetPosition.set(
      basePosition.x + pointer.x * CAMERA_POINTER_SHIFT.maxOffsetX,
      basePosition.y + pointer.y * CAMERA_POINTER_SHIFT.maxOffsetY,
      basePosition.z,
    );

    camera.position.x = MathUtils.damp(
      camera.position.x,
      targetPosition.x,
      CAMERA_POINTER_SHIFT.damping,
      delta,
    );
    camera.position.y = MathUtils.damp(
      camera.position.y,
      targetPosition.y,
      CAMERA_POINTER_SHIFT.damping,
      delta,
    );
    camera.position.z = MathUtils.damp(
      camera.position.z,
      targetPosition.z,
      CAMERA_POINTER_SHIFT.damping,
      delta,
    );
    camera.updateMatrixWorld();
  });

  return null;
}
