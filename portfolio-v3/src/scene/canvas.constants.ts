// Caps the rendered pixel density for the Three canvas. The first value is the
// minimum DPR, and the second is the maximum DPR; keeping the max at 1.5 makes
// the 3D text sharper on dense screens without asking mobile GPUs to render at
// full native resolution.
export const CANVAS_DPR: [number, number] = [1, 1.5];

// Defines the default perspective camera used by React Three Fiber. Increasing
// position.z pulls the camera back and makes the menu smaller; increasing fov
// widens the lens and also shows more of the scene, but with stronger
// perspective distortion.
export const CAMERA_PROPS = {
  position: [0, 0, 7.25],
  fov: 33,
  near: 0.1,
  far: 100,
} as const;
