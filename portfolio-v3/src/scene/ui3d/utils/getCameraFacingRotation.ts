import { Euler, Quaternion, Vector3 } from "three";
import type { ReadonlyVec3 } from "../../../types/geometry";

type Vec3Like = ReadonlyVec3 | Vector3;

const TEXT_FRONT_NORMAL = new Vector3(0, 0, 1);

function toVector3(value: Vec3Like) {
  return value instanceof Vector3
    ? value.clone()
    : new Vector3(value[0], value[1], value[2]);
}

export default function getCameraFacingRotation(
  objectPosition: ReadonlyVec3,
  cameraPosition: Vec3Like,
): ReadonlyVec3 {
  const directionToCamera = toVector3(cameraPosition)
    .sub(toVector3(objectPosition))
    .normalize();
  const cameraFacingQuaternion = new Quaternion().setFromUnitVectors(
    TEXT_FRONT_NORMAL,
    directionToCamera,
  );
  const cameraFacingEuler = new Euler().setFromQuaternion(
    cameraFacingQuaternion,
    "XYZ",
  );

  return [cameraFacingEuler.x, cameraFacingEuler.y, cameraFacingEuler.z];
}
