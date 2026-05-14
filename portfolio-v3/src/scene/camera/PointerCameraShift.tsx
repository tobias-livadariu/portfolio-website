import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { CAMERA_POINTER_SHIFT, CAMERA_PROPS } from "../canvas.constants";

export default function PointerCameraShift() {
  const gl = useThree((state) => state.gl);
  const basePosition = useMemo(() => new Vector3(...CAMERA_PROPS.position), []);
  const targetPosition = useMemo(() => new Vector3(), []);
  const activePointerIdRef = useRef<number | null>(null);
  const shouldUsePointerRef = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;

    function enableMousePointer(event: PointerEvent) {
      if (event.pointerType === "mouse") {
        activePointerIdRef.current = null;
        shouldUsePointerRef.current = true;
      }
    }

    function enablePressedPointer(event: PointerEvent) {
      if (event.pointerType === "mouse") {
        shouldUsePointerRef.current = true;
        return;
      }

      if (!event.isPrimary) {
        return;
      }

      activePointerIdRef.current = event.pointerId;
      shouldUsePointerRef.current = true;
    }

    function disablePressedPointer(event: PointerEvent) {
      if (event.pointerType === "mouse") {
        return;
      }

      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      activePointerIdRef.current = null;
      shouldUsePointerRef.current = false;
    }

    function disableMousePointer(event: PointerEvent) {
      if (event.pointerType === "mouse") {
        shouldUsePointerRef.current = false;
      }
    }

    canvas.addEventListener("pointerenter", enableMousePointer);
    canvas.addEventListener("pointermove", enableMousePointer);
    canvas.addEventListener("pointerdown", enablePressedPointer);
    canvas.addEventListener("pointerup", disablePressedPointer);
    canvas.addEventListener("pointercancel", disablePressedPointer);
    canvas.addEventListener("pointerleave", disableMousePointer);

    return () => {
      canvas.removeEventListener("pointerenter", enableMousePointer);
      canvas.removeEventListener("pointermove", enableMousePointer);
      canvas.removeEventListener("pointerdown", enablePressedPointer);
      canvas.removeEventListener("pointerup", disablePressedPointer);
      canvas.removeEventListener("pointercancel", disablePressedPointer);
      canvas.removeEventListener("pointerleave", disableMousePointer);
    };
  }, [gl]);

  useFrame(({ camera, pointer }, delta) => {
    const pointerX =
      CAMERA_POINTER_SHIFT.enabled && shouldUsePointerRef.current
        ? pointer.x
        : 0;
    const pointerY =
      CAMERA_POINTER_SHIFT.enabled && shouldUsePointerRef.current
        ? pointer.y
        : 0;

    targetPosition.set(
      basePosition.x + pointerX * CAMERA_POINTER_SHIFT.maxOffsetX,
      basePosition.y + pointerY * CAMERA_POINTER_SHIFT.maxOffsetY,
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
