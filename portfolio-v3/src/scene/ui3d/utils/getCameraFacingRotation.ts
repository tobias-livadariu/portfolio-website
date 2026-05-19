import { Euler, Quaternion, Vector3 } from "three";
import type { ReadonlyVec3 } from "../../../types/geometry";

type Vec3Like = ReadonlyVec3 | Vector3;
type Vec3Tuple = [number, number, number];

const TEXT_FRONT_NORMAL = new Vector3(0, 0, 1);
const SCRATCH_OBJECT_POSITION = new Vector3();
const SCRATCH_CAMERA_POSITION = new Vector3();
const SCRATCH_DIRECTION = new Vector3();
const SCRATCH_QUATERNION = new Quaternion();
const SCRATCH_EULER = new Euler();

function setFromVec3Like(target: Vector3, value: Vec3Like) {
  if (value instanceof Vector3) {
    target.copy(value);
  } else {
    target.set(value[0], value[1], value[2]);
  }
  return target;
}

export default function getCameraFacingRotation(
  objectPosition: Vec3Like,
  cameraPosition: Vec3Like,
  target: Vec3Tuple = [0, 0, 0],
): Vec3Tuple {
  setFromVec3Like(SCRATCH_OBJECT_POSITION, objectPosition);
  setFromVec3Like(SCRATCH_CAMERA_POSITION, cameraPosition);
  SCRATCH_DIRECTION.subVectors(SCRATCH_CAMERA_POSITION, SCRATCH_OBJECT_POSITION)
    .normalize();
  SCRATCH_QUATERNION.setFromUnitVectors(TEXT_FRONT_NORMAL, SCRATCH_DIRECTION);
  SCRATCH_EULER.setFromQuaternion(SCRATCH_QUATERNION, "XYZ");

  target[0] = SCRATCH_EULER.x;
  target[1] = SCRATCH_EULER.y;
  target[2] = SCRATCH_EULER.z;
  return target;
}
