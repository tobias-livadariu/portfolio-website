import { memo, useCallback, useEffect, useId, useRef } from "react";
import { useBackgroundMode } from "./background-mode-core";
import RenderModeArt from "./RenderModeArt";
import { RENDER_MODE_OPTIONS } from "./render-mode.constants";
import { useRenderModeRequest } from "./use-render-mode-request";

/**
 * Render-mode control for the sticky modal toolbar.
 *
 * The starfield rail scrolls away with the backdrop, so the modals carry their
 * carry one persistent control between the section tabs and the quit button.
 * Selecting a mode here unscrolls to the starfield first — see
 * useRenderModeRequest — so the reveal always plays against the scene it is
 * actually changing.
 *
 * ModalLayer moves the component's stable portal host between sticky headers,
 * so this instance retains its open state as the reader changes documents.
 */
function ModalRenderModeMenu({
  isMenuRequested,
  motion,
  onMenuRequestedChange,
}: {
  isMenuRequested: boolean;
  motion: "idle" | "leaving" | "entering" | "revealing";
  onMenuRequestedChange: (isRequested: boolean) => void;
}) {
  const { isTransitioning, targetMode, visualMode } = useBackgroundMode();
  const requestRenderMode = useRenderModeRequest();
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
        onMenuRequestedChange(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        /* Beat ModalLayer's global Escape handler: closing the menu should not
           also close the section the reader is in. */
        event.stopPropagation();
        onMenuRequestedChange(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, onMenuRequestedChange]);

  const handleSelect = useCallback(
    (mode: (typeof RENDER_MODE_OPTIONS)[number]["mode"]) => {
      onMenuRequestedChange(false);
      /* Drop focus before the unscroll: WebKit and Firefox will scroll a
         container to keep a focused descendant in view, which fights the
         programmatic return to the starfield. */
      triggerRef.current?.blur();
      requestRenderMode(mode);
    },
    [onMenuRequestedChange, requestRenderMode],
  );

  return (
    <div className="modal-render-menu" data-motion={motion} ref={rootRef}>
      {/* The method-like label and dotted frame preserve the toolbar's terminal
          syntax while making this field read as an action, not a status label. */}
      <div className="modal-render-trigger-motion">
        <button
          aria-controls={panelId}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label={`Change background render mode. Current mode ${visualMode.toUpperCase()}`}
          className="modal-render-trigger"
          data-open={isOpen ? "true" : undefined}
          disabled={isTransitioning}
          onClick={(event) => {
            event.stopPropagation();
            onMenuRequestedChange(!isMenuRequested);
          }}
          ref={triggerRef}
          type="button"
        >
          <span className="modal-render-trigger-label">
            RENDER.MODE.CHANGE()
          </span>
          <span aria-hidden="true" className="modal-render-trigger-leader">
            \\
          </span>
          <span className="modal-render-trigger-value">
            [{visualMode.toUpperCase()}]
          </span>
        </button>
      </div>
      <div
        aria-label="Background render mode"
        className="modal-render-panel"
        data-open={isOpen ? "true" : undefined}
        id={panelId}
        role="menu"
      >
        {RENDER_MODE_OPTIONS.map((option) => {
          const isActive = targetMode === option.mode;

          return (
            <button
              aria-checked={isActive}
              className="modal-render-option rm-mode-option"
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
              <RenderModeArt mode={option.mode} />
              <span className="rm-tile-name">
                <span aria-hidden="true" className="rm-tile-sigil">
                  {option.sigil}
                </span>
                {option.label}
              </span>
              <span aria-hidden="true" className="rm-tile-underline" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ModalRenderModeMenu);
