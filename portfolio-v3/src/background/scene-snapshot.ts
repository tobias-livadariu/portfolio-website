import { addAfterEffect } from "@react-three/fiber";

/* Lets the transition overlay take a still of the background scene.

   A render-mode transition no longer hides the old scene behind a blank
   cover. The old scene comes to rest, this module copies that resting frame,
   and the overlay then shows the copy while the new scene starts underneath
   it. The copy must be taken in the same task that drew the frame: a WebGL
   canvas's pixels are gone once the browser has presented them. */

let sceneCanvas: HTMLCanvasElement | null = null;

export function registerSceneCanvas(canvas: HTMLCanvasElement) {
  sceneCanvas = canvas;

  return () => {
    if (sceneCanvas === canvas) {
      sceneCanvas = null;
    }
  };
}

export interface SceneCanvasPlacement {
  // Where the scene canvas sits in the viewport, in CSS pixels.
  left: number;
  top: number;
  width: number;
  height: number;
  // Backing-store pixels per CSS pixel.
  pixelRatio: number;
}

/* The scene canvas's place on screen, or null when there is no usable WebGL
   canvas (the scene failed, or its context was lost). */
export function getSceneCanvasPlacement(): SceneCanvasPlacement | null {
  if (!sceneCanvas || !sceneCanvas.isConnected) {
    return null;
  }

  const rect = sceneCanvas.getBoundingClientRect();

  if (rect.width < 1 || rect.height < 1 || sceneCanvas.width < 1) {
    return null;
  }

  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    pixelRatio: sceneCanvas.width / rect.width,
  };
}

export interface SceneStill {
  image: HTMLCanvasElement;
  placement: SceneCanvasPlacement;
}

/* How long to wait for a rendered frame before giving up. A hidden tab or a
   lost context renders nothing, and the transition must never wait on it. */
const CAPTURE_TIMEOUT_MS = 250;

/* Copies the next frame the scene renders and passes it to `onCapture`, or
   passes null when no frame arrives in time. Returns a cancel function. */
export function captureSceneStill(
  onCapture: (still: SceneStill | null) => void,
) {
  let settled = false;
  let unsubscribe: (() => void) | null = null;

  const settle = (still: SceneStill | null) => {
    if (settled) {
      return;
    }

    settled = true;
    unsubscribe?.();
    window.clearTimeout(timeoutId);
    onCapture(still);
  };

  const timeoutId = window.setTimeout(() => settle(null), CAPTURE_TIMEOUT_MS);

  unsubscribe = addAfterEffect(() => {
    const placement = getSceneCanvasPlacement();

    if (!sceneCanvas || !placement) {
      settle(null);
      return;
    }

    const image = document.createElement("canvas");
    image.width = sceneCanvas.width;
    image.height = sceneCanvas.height;
    const context = image.getContext("2d");

    if (!context) {
      settle(null);
      return;
    }

    try {
      context.drawImage(sceneCanvas, 0, 0);
    } catch {
      settle(null);
      return;
    }

    settle({ image, placement });
  });

  return () => {
    settled = true;
    unsubscribe?.();
    window.clearTimeout(timeoutId);
  };
}
