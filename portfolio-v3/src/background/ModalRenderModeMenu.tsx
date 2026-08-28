import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { useBackgroundMode } from "./background-mode-core";
import RenderModeArt from "./RenderModeArt";
import { RENDER_MODE_OPTIONS } from "./render-mode.constants";
import { useRenderModeRequest } from "./use-render-mode-request";

/**
 * Render-mode control for the sticky modal toolbar.
 *
 * The starfield rail scrolls away with the backdrop, so the modals carry their
 * own copy between the section tabs and the quit button. Selecting a mode here
 * unscrolls to the starfield first — see useRenderModeRequest — so the reveal
 * always plays against the scene it is actually changing.
 *
 * Memoised because one instance is mounted per modal panel and the panels
 * re-render as the reader scrolls between sections; the menu takes no props,
 * so it only ever needs to re-render for its own state.
 */
function ModalRenderModeMenu() {
  const { isTransitioning, targetMode } = useBackgroundMode();
  const requestRenderMode = useRenderModeRequest();
  const [isMenuRequested, setIsMenuRequested] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  /* Derived rather than stored: a transition started from anywhere collapses
     the menu without a second render pass to reconcile it. */
  const isOpen = isMenuRequested && !isTransitioning;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsMenuRequested(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        /* Beat ModalLayer's global Escape handler: closing the menu should not
           also close the section the reader is in. */
        event.stopPropagation();
        setIsMenuRequested(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen]);

  const handleSelect = useCallback(
    (mode: (typeof RENDER_MODE_OPTIONS)[number]["mode"]) => {
      setIsMenuRequested(false);
      /* Drop focus before the unscroll: WebKit and Firefox will scroll a
         container to keep a focused descendant in view, which fights the
         programmatic return to the starfield. */
      triggerRef.current?.blur();
      requestRenderMode(mode);
    },
    [requestRenderMode],
  );

  return (
    <div className="modal-render-menu" ref={rootRef}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="modal-render-trigger"
        data-open={isOpen ? "true" : undefined}
        disabled={isTransitioning}
        onClick={(event) => {
          event.stopPropagation();
          setIsMenuRequested((value) => !value);
        }}
        ref={triggerRef}
        type="button"
      >
        <span className="modal-render-trigger-label">RENDER.MODE</span>
        <span className="modal-render-trigger-value">
          [{targetMode.toUpperCase()}]
        </span>
        <span aria-hidden="true" className="modal-render-trigger-caret">
          {isOpen ? "▴" : "▾"}
        </span>
      </button>
      <div
        aria-label="Background render mode"
        className="modal-render-panel"
        data-open={isOpen ? "true" : undefined}
        id={panelId}
        role="menu"
      >
        {RENDER_MODE_OPTIONS.map((option, index) => {
          const isActive = targetMode === option.mode;

          return (
            <button
              aria-checked={isActive}
              className="modal-render-option"
              data-active={isActive ? "true" : undefined}
              data-mode={option.mode}
              disabled={isTransitioning}
              key={option.mode}
              onClick={(event) => {
                event.stopPropagation();
                handleSelect(option.mode);
              }}
              role="menuitemradio"
              tabIndex={isOpen ? undefined : -1}
              type="button"
            >
              <span aria-hidden="true" className="modal-render-option-index">
                {String(index).padStart(2, "0")}
              </span>
              <RenderModeArt mode={option.mode} />
              <span className="modal-render-option-copy">
                <strong>
                  <span aria-hidden="true" className="rm-tile-sigil">
                    {option.sigil}
                  </span>
                  {option.label}
                </strong>
                <small>{option.blurb}</small>
              </span>
              <span aria-hidden="true" className="modal-render-option-marker">
                {isActive ? "[X]" : "[ ]"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ModalRenderModeMenu);
