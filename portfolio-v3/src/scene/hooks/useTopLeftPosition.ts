import { useThree } from "@react-three/fiber";
import type { ReadonlyVec3 } from "../../types/geometry";

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
  const { viewport } = useThree();
  const x = -viewport.width / 2 + marginX;
  const y = viewport.height / 2 - marginY;

  const topLeftPosition: ReadonlyVec3 = [x, y, z];
  return topLeftPosition;
}
