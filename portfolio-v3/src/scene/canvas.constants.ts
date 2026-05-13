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

// Cursor-driven camera head-shift. R3F pointer coordinates are normalized so
// the canvas center is [0, 0], left/right are roughly -1/+1 on x, and
// bottom/top are roughly -1/+1 on y. The maxOffset values convert that full
// screen-edge pointer delta into small world-unit camera movement.
export const CAMERA_POINTER_SHIFT = {
  // Master switch for the pointer camera movement.
  enabled: true,
  // Maximum left/right camera travel when the cursor reaches a horizontal edge.
  maxOffsetX: 0.18,
  // Maximum down/up camera travel when the cursor reaches a vertical edge.
  maxOffsetY: 0.12,
  // Framerate-independent easing strength. Higher values make the camera catch
  // the cursor faster; lower values make it feel heavier and more delayed.
  damping: 4.5,
} as const;
