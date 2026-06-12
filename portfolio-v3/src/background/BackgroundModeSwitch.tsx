import { useRef } from "react";
import { useBackgroundMode } from "./background-mode-core";
import "./background-mode.css";

export default function BackgroundModeSwitch() {
  const { isTransitioning, requestToggle, targetMode } = useBackgroundMode();
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="bg-mode-switch-anchor">
      <button
        aria-checked={targetMode === "2d"}
        aria-disabled={isTransitioning || undefined}
        aria-label="Switch background between 3D and 2D"
        className="bg-mode-switch"
        onClick={(event) => {
          event.stopPropagation();

          if (isTransitioning) {
            return;
          }

          const rect = buttonRef.current?.getBoundingClientRect();

          requestToggle(
            rect
              ? {
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2,
                }
              : { x: window.innerWidth, y: window.innerHeight },
          );
        }}
        ref={buttonRef}
        role="switch"
        type="button"
      >
        <span className="bg-mode-switch-prompt">bg:</span>
        <span
          className="bg-mode-switch-option"
          data-active={targetMode === "3d" ? "true" : undefined}
        >
          [3D]
        </span>
        <span
          className="bg-mode-switch-option"
          data-active={targetMode === "2d" ? "true" : undefined}
        >
          [2D]
        </span>
      </button>
    </div>
  );
}
