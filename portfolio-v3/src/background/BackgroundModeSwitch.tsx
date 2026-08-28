import { useEffect, useId, useRef, useState } from "react";
import { type BackgroundMode, useBackgroundMode } from "./background-mode-core";
import "./background-mode.css";

const MODE_OPTIONS: ReadonlyArray<{
  label: string;
  mode: BackgroundMode;
  sigil: string;
}> = [
  {
    label: "DEEP",
    mode: "3d",
    sigil: "$",
  },
  {
    label: "FLAT",
    mode: "2d",
    sigil: "#",
  },
  {
    label: "CHAR",
    mode: "ascii",
    sigil: "@",
  },
];

export default function BackgroundModeSwitch({
  hidden = false,
}: {
  hidden?: boolean;
}) {
  const { isTransitioning, requestMode, targetMode } = useBackgroundMode();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const shouldHide = hidden || isTransitioning;
  const activeSigil =
    MODE_OPTIONS.find((option) => option.mode === targetMode)?.sigil ?? "$";

  useEffect(() => {
    if (!shouldHide) {
      return;
    }

    buttonRef.current?.blur();
    const frame = requestAnimationFrame(() => setIsOpen(false));

    return () => cancelAnimationFrame(frame);
  }, [shouldHide]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const getSeedPoint = () => {
    const rect = buttonRef.current?.getBoundingClientRect();

    return rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth, y: window.innerHeight };
  };

  return (
    <div
      aria-hidden={shouldHide || undefined}
      className="bg-mode-switch-anchor"
      data-hidden={shouldHide ? "true" : undefined}
      ref={rootRef}
    >
      <div
        aria-label="Background renderer"
        aria-hidden={!isOpen}
        className="bg-mode-panel"
        data-open={isOpen ? "true" : undefined}
        id={panelId}
        role="menu"
      >
        <div aria-hidden="true" className="bg-mode-panel-art">
          ┌─ RENDER.MODE ─────────────────────────────────┐
        </div>
        <div className="bg-mode-panel-status" />
        <div className="bg-mode-options">
          {MODE_OPTIONS.map((option, index) => {
            const isActive = targetMode === option.mode;

            return (
              <button
                aria-checked={isActive}
                className="bg-mode-option"
                data-active={isActive ? "true" : undefined}
                disabled={isTransitioning}
                key={option.mode}
                onClick={(event) => {
                  event.stopPropagation();

                  if (!isActive && !isTransitioning) {
                    requestMode(option.mode, getSeedPoint());
                  }
                  setIsOpen(false);
                }}
                role="menuitemradio"
                type="button"
              >
                <span className="bg-mode-option-index">
                  {String(index).padStart(2, "0")}
                </span>
                <span className="bg-mode-option-sigil">{option.sigil}</span>
                <span className="bg-mode-option-copy">
                  <strong>{option.label}</strong>
                </span>
                <span aria-hidden="true" className="bg-mode-option-marker">
                  {isActive ? "[X]" : "[  ]"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Choose background render mode"
        className="bg-mode-switch"
        onClick={(event) => {
          event.stopPropagation();
          if (!isTransitioning) setIsOpen((value) => !value);
        }}
        ref={buttonRef}
        tabIndex={shouldHide ? -1 : undefined}
        type="button"
      >
        <span aria-hidden="true" className="bg-mode-switch-icon">
          {isOpen ? "×" : activeSigil}
        </span>
        <span className="bg-mode-switch-prompt">render:</span>
        <span className="bg-mode-switch-value">
          [{targetMode.toUpperCase()}]
        </span>
      </button>
    </div>
  );
}
