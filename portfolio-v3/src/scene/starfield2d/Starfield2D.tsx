import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import useNotifyFirstFrame from "../../background/use-notify-first-frame";
import Planets2D from "./Planets2D";
import Stars2D from "./Stars2D";
import { STARFIELD_2D } from "./starfield2d.constants";

/* The 2D starfield lives on a plane a fixed distance in front of the
   orthographic camera. The group remains screen-locked, and scaling it by
   world-units-per-pixel lets every child work in CSS-pixel coordinates. */
export default function Starfield2D() {
  const groupRef = useRef<Group>(null);
  const { camera, size, viewport } = useThree();

  useNotifyFirstFrame("2d");

  const worldPerPixel = useMemo(() => {
    const visibleViewport = viewport.getCurrentViewport(
      camera,
      [camera.position.x, camera.position.y, 0],
      size,
    );

    return visibleViewport.height / size.height;
  }, [camera, size, viewport]);

  useFrame(() => {
    const group = groupRef.current;

    if (group) {
      group.position.set(
        camera.position.x,
        camera.position.y,
        camera.position.z - STARFIELD_2D.planeDistance,
      );
    }
  });

  return (
    <group ref={groupRef} scale={worldPerPixel}>
      <Stars2D />
      <Planets2D />
    </group>
  );
}
