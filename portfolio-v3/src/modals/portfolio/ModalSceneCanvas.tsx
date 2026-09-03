import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { useEffect, useState } from "react";
import { CANVAS_DPR } from "../../scene/canvas.constants";
import { useModalController } from "../modal-context-core";

/**
 * One WebGL renderer shared by every portalled R3F scene in this modal.
 *
 * Nothing is presented from this canvas directly: it is a viewport-sized
 * scratch surface that each scene draws into and then copies out of, into its
 * own in-flow canvas. Keeping it out of the visual layer is what lets the
 * scenes scroll with the modal instead of being repositioned against the
 * document once per render — see `TransparentAsciiRenderer`.
 */
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
        // R3F defaults this wrapper to `pointer-events: auto`, which would
        // re-enable hit testing inside the non-interactive scratch layer.
        style={{ pointerEvents: "none" }}
      >
        <View.Port />
      </Canvas>
    </div>
  );
}
