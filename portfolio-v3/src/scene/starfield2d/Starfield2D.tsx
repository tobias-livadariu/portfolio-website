import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import useNotifyFirstFrame from "../../background/use-notify-first-frame";
import { getTwoDimensionalWorldPerPixel } from "../canvas.constants";
import Planets2D from "./Planets2D";
import Stars2D from "./Stars2D";
import { STARFIELD_2D } from "./starfield2d.constants";

/* The 2D starfield lives on a plane a fixed distance in front of the
   orthographic camera. The group remains screen-locked, and scaling it by
   world-units-per-pixel lets every child work in CSS-pixel coordinates. */
export default function Starfield2D() {
  const groupRef = useRef<Group>(null);
  const { camera, size } = useThree();

  useNotifyFirstFrame("2d");

  /* SceneCamera applies its new zoom in a layout effect. Computing this scale
     from that mutable camera during the same resize can capture the previous
     screen's zoom permanently. The shared camera formula is synchronous with
     R3F's new CSS size, so the pixel-space disc and visibility bounds agree on
     every resize frame. */
  const worldPerPixel = getTwoDimensionalWorldPerPixel(size.height);

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
