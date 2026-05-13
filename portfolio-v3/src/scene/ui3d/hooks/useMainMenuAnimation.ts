import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import type { Object3D } from "three";
import type { ReadonlyVec3 } from "../../../types/geometry";
import { LAYOUT, MENU_ANIMATION } from "../main-menu.constants";

const VERTICAL_MARGIN_AMPLITUDES = [
  MENU_ANIMATION.verticalMarginAmplitudes.introToFirstName *
    MENU_ANIMATION.verticalMarginScales[1],
  MENU_ANIMATION.verticalMarginAmplitudes.firstNameToLastName *
    MENU_ANIMATION.verticalMarginScales[1],
  MENU_ANIMATION.verticalMarginAmplitudes.lastNameToUpperSeparator *
    MENU_ANIMATION.verticalMarginScales[1],
  MENU_ANIMATION.verticalMarginAmplitudes.upperSeparatorToFirstNavItem *
    MENU_ANIMATION.verticalMarginScales[1],
  MENU_ANIMATION.verticalMarginAmplitudes.navItem1ToNavItem2 *
    MENU_ANIMATION.verticalMarginScales[1],
  MENU_ANIMATION.verticalMarginAmplitudes.navItem2ToNavItem3 *
    MENU_ANIMATION.verticalMarginScales[1],
  MENU_ANIMATION.verticalMarginAmplitudes.navItem3ToNavItem4 *
    MENU_ANIMATION.verticalMarginScales[1],
  MENU_ANIMATION.verticalMarginAmplitudes.lastNavItemToLowerSeparator *
    MENU_ANIMATION.verticalMarginScales[1],
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getStartupEnvelope(elapsedSeconds: number) {
  if (MENU_ANIMATION.startupFadeSeconds <= 0) {
    return 1;
  }

  const progress = clamp(
    elapsedSeconds / MENU_ANIMATION.startupFadeSeconds,
    MENU_ANIMATION.normalizedMin,
    MENU_ANIMATION.normalizedMax,
  );

  return (
    progress *
    progress *
    (MENU_ANIMATION.startupEaseA - MENU_ANIMATION.startupEaseB * progress)
  );
}

function getSpringSignal(elapsedSeconds: number, delaySeconds = 0) {
  if (!MENU_ANIMATION.enabled) {
    return 0;
  }

  const activeSeconds = Math.max(0, elapsedSeconds - delaySeconds);
  const angularFrequency =
    MENU_ANIMATION.fullTurnRadians / MENU_ANIMATION.periodSeconds;
  const rawSignal = -Math.cos(activeSeconds * angularFrequency);

  return (
    -MENU_ANIMATION.normalizedMax +
    (rawSignal + MENU_ANIMATION.normalizedMax) *
      getStartupEnvelope(elapsedSeconds)
  );
}

function getTroughToPeakProgress(elapsedSeconds: number) {
  if (!MENU_ANIMATION.enabled) {
    return MENU_ANIMATION.normalizedMin;
  }

  return (getSpringSignal(elapsedSeconds) + MENU_ANIMATION.normalizedMax) / 2;
}

export function getAnimatedMenuYOffset(
  elementIndex: number,
  elapsedSeconds: number,
) {
  let offsetY = 0;

  for (let gapIndex = 0; gapIndex < elementIndex; gapIndex += 1) {
    const bottomFirstDelay =
      (VERTICAL_MARGIN_AMPLITUDES.length - 1 - gapIndex) *
      MENU_ANIMATION.verticalPropagationDelaySeconds;
    const marginDelta =
      VERTICAL_MARGIN_AMPLITUDES[gapIndex] *
      getSpringSignal(elapsedSeconds, bottomFirstDelay);

    offsetY -= marginDelta;
  }

  return offsetY;
}

export function getAnimatedSeparatorDotYOffset(
  progress: number,
  elapsedSeconds: number,
) {
  const sizeProgress = getSeparatorSegmentSizeProgress(progress);
  const amplitude = MENU_ANIMATION.separatorWaveAmplitude * sizeProgress;

  return amplitude * getTroughToPeakProgress(elapsedSeconds);
}

export function getSeparatorSegmentSizeProgress(progress: number) {
  const edgeDistance = Math.min(
    progress,
    MENU_ANIMATION.normalizedMax - progress,
  );
  const growthRange =
    (MENU_ANIMATION.normalizedMax - LAYOUT.separatorPlateauRatio) / 2;
  const growthProgress = Math.min(
    MENU_ANIMATION.normalizedMax,
    edgeDistance / growthRange,
  );

  return Math.pow(growthProgress, LAYOUT.separatorGrowthPower);
}

export function getSeparatorSegmentSize(progress: number) {
  const sizeProgress = getSeparatorSegmentSizeProgress(progress);

  return (
    LAYOUT.separatorMinSegmentSize +
    (LAYOUT.separatorMaxSegmentSize - LAYOUT.separatorMinSegmentSize) *
      sizeProgress
  );
}

function interpolateRotation(
  troughRotation: ReadonlyVec3,
  peakRotation: ReadonlyVec3,
  progress: number,
): ReadonlyVec3 {
  return [
    troughRotation[0] + (peakRotation[0] - troughRotation[0]) * progress,
    troughRotation[1] + (peakRotation[1] - troughRotation[1]) * progress,
    troughRotation[2] + (peakRotation[2] - troughRotation[2]) * progress,
  ];
}

export function getAnimatedMainMenuRotation(
  elapsedSeconds: number,
  troughRotation: ReadonlyVec3,
  peakRotation: ReadonlyVec3,
) {
  return interpolateRotation(
    troughRotation,
    peakRotation,
    getTroughToPeakProgress(elapsedSeconds),
  );
}

export function useAnimatedMenuPosition(
  objectRef: RefObject<Object3D | null>,
  baseOffset: ReadonlyVec3,
  elementIndex: number,
) {
  useFrame(({ clock }) => {
    const object = objectRef.current;

    if (!object) {
      return;
    }

    object.position.set(
      baseOffset[0],
      baseOffset[1] +
        getAnimatedMenuYOffset(elementIndex, clock.getElapsedTime()),
      baseOffset[2],
    );
  });
}

export function useAnimatedMainMenuRotation(
  objectRef: RefObject<Object3D | null>,
  troughRotation: ReadonlyVec3,
  peakRotation: ReadonlyVec3,
) {
  useFrame(({ clock }) => {
    const object = objectRef.current;

    if (!object) {
      return;
    }

    const animatedRotation = getAnimatedMainMenuRotation(
      clock.getElapsedTime(),
      troughRotation,
      peakRotation,
    );

    object.rotation.set(
      animatedRotation[0],
      animatedRotation[1],
      animatedRotation[2],
    );
  });
}
