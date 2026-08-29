import { useCallback, useEffect, useRef, useState } from "react";
import { useBackgroundMode } from "./background-mode-core";
import RenderModeArt from "./RenderModeArt";
import { RENDER_MODE_OPTIONS } from "./render-mode.constants";
import { useRenderModeRequest } from "./use-render-mode-request";
import "./background-mode.css";

/**
 * Always-expanded render-mode rail for the starfield.
 *
 * The previous collapsed pill hid all three modes behind a click, which meant
 * the site's headline interaction was invisible to anyone who did not go
 * looking for it. Showing every mode at once turns the control into its own
 * signifier: each tile previews the same ringed planet drawn the way that mode
 * would draw it, so the choice explains itself without a legend.
 */
export default function BackgroundModeSwitch() {
  const { isTransitioning, targetMode, visualMode } = useBackgroundMode();
  const requestRenderMode = useRenderModeRequest();
  const railRef = useRef<HTMLDivElement>(null);
  const [hasIntroduced, setHasIntroduced] = useState(false);
  /* The rail hands off to the modal toolbar by scrolling away with the
     backdrop, so the only reason to pull it is an in-flight transition. */
  const shouldHide = isTransitioning;

  /* One finite reveal on load draws the eye to the rail without leaving a
     compositor animation running behind the WebGL frame loop forever. */
  useEffect(() => {
    const frame = requestAnimationFrame(() => setHasIntroduced(true));

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (shouldHide) {
      railRef.current
        ?.querySelector<HTMLButtonElement>(".rm-tile:focus")
        ?.blur();
    }
  }, [shouldHide]);

  const getSeedPoint = useCallback(() => {
    const rect = railRef.current?.getBoundingClientRect();

    return rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth, y: window.innerHeight };
  }, []);

  return (
    <div
      aria-hidden={shouldHide || undefined}
      className="bg-mode-switch-anchor"
      data-hidden={shouldHide ? "true" : undefined}
      data-introduced={hasIntroduced ? "true" : undefined}
    >
      <div className="rm-rail" ref={railRef}>
        <div className="rm-rail-head">
          <span className="rm-rail-title">RENDER.MODE</span>
          <span aria-hidden="true" className="rm-rail-leader" />
          {/* The readout names the scene currently on screen, so it only
              flips once the new render has emerged from the transition. The
              tiles below still highlight the pending target immediately, which
              is what acknowledges the click. */}
          <span className="rm-rail-value">[{visualMode.toUpperCase()}]</span>
        </div>
        <div
          aria-label="Background render mode"
          className="rm-rail-options"
          role="group"
        >
          {RENDER_MODE_OPTIONS.map((option) => {
            const isActive = targetMode === option.mode;

            return (
              <button
                aria-pressed={isActive}
                className="rm-mode-option rm-tile"
                data-active={isActive ? "true" : undefined}
                data-mode={option.mode}
                /* Also removes the tile from the tab order while the rail is
                   pulled off screen for a transition. */
                disabled={isTransitioning}
                key={option.mode}
                onClick={(event) => {
                  event.stopPropagation();
                  requestRenderMode(option.mode, getSeedPoint);
                }}
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
    </div>
  );
}
