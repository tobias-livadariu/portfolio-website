import { Canvas, useFrame } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { Color } from "three";
import { useEffect, useMemo, useState } from "react";
import { CANVAS_DPR } from "../../scene/canvas.constants";
import { useModalController } from "../modal-context-core";

function SharedCanvasClear() {
  const clearColor = useMemo(() => new Color(), []);

  useFrame(({ gl, size }) => {
    const previousClearAlpha = gl.getClearAlpha();
    gl.getClearColor(clearColor);
    gl.setRenderTarget(null);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, size.width, size.height);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    gl.setClearColor(clearColor, previousClearAlpha);
  }, 1);

  return null;
}

/** One WebGL renderer shared by every portalled R3F scene in this modal. */
export default function ModalSceneCanvas() {
  const { isOpen } = useModalController();
  const [hasOpened, setHasOpened] = useState(isOpen);

  useEffect(() => {
    if (!isOpen || hasOpened) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => setHasOpened(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [hasOpened, isOpen]);

  if (!hasOpened) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="modal-shared-scene-layer"
      data-testid="modal-shared-scene-layer"
    >
      <Canvas
        dpr={CANVAS_DPR}
        flat
        frameloop={isOpen ? "always" : "demand"}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => {
          gl.autoClear = false;
          gl.setClearColor(0x000000, 0);
        }}
        // R3F defaults this wrapper to `pointer-events: auto`. The scenes use
        // passive window-level pointer tracking, so the fixed compositor must
        // remain transparent to modal controls and native wheel scrolling.
        style={{ pointerEvents: "none" }}
      >
        <SharedCanvasClear />
        <View.Port />
      </Canvas>
    </div>
  );
}
