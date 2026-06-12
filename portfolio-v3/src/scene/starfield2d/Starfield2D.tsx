import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import useNotifyFirstFrame from "../../background/use-notify-first-frame";
import { CAMERA_PROPS } from "../canvas.constants";
import Planets2D from "./Planets2D";
import Stars2D from "./Stars2D";
import { STARFIELD_2D } from "./starfield2d.constants";

/* The 2D starfield lives on a plane a fixed distance in front of the camera.
   The group follows the camera every frame (PointerCameraShift runs at
   priority -1, this at 0), so the field stays perfectly screen-locked while
   the 3D menu keeps its parallax. Scaling the group by world-units-per-pixel
   lets every child work in CSS-pixel coordinates. */
export default function Starfield2D() {
  const groupRef = useRef<Group>(null);
  const { camera, size } = useThree();

  useNotifyFirstFrame("2d");

  const worldPerPixel = useMemo(() => {
    const fovRadians = (CAMERA_PROPS.fov * Math.PI) / 180;

    return (
      (2 * Math.tan(fovRadians / 2) * STARFIELD_2D.planeDistance) / size.height
    );
  }, [size.height]);

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
