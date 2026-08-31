import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useBackgroundMode } from "./background-mode-core";
import RenderModeArt from "./RenderModeArt";
import { RENDER_MODE_OPTIONS } from "./render-mode.constants";
import { useRenderModeRequest } from "./use-render-mode-request";
import "./background-mode.css";

const CELL_NORMALIZATION_ATTRIBUTE = "data-rm-normalize-cells";
const EXPECTED_SIGIL_ASPECT_RATIO = 1;
const SIGIL_ASPECT_RATIO_TOLERANCE = 0.04;

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
  const { isRenderModeInputLocked, isTransitioning, targetMode, visualMode } =
    useBackgroundMode();
  const requestRenderMode = useRenderModeRequest();
  const railRef = useRef<HTMLDivElement>(null);
  const [hasIntroduced, setHasIntroduced] = useState(false);
  /* The rail hands off to the modal toolbar by scrolling away with the
     backdrop, so the only reason to pull it is an in-flight transition. */
  const shouldHide = isTransitioning;
  const isInteractionLocked = isRenderModeInputLocked || isTransitioning;

  /* ASCII artwork is the only UI whose geometry depends on a font metric:
     63 half-width columns must occupy the same space as 33 rows. Most system
     monospace fallbacks use a ~0.6em advance instead of Iosevka's 0.5em. If a
     browser delays, rejects, or replaces the webfont, detect that meaningful
     deviation and enable metric-relative tracking for every selector. Keeping
     a tolerance around the authored ratio means the established Iosevka
     rendering receives no additional typography rules at all. */
  useLayoutEffect(() => {
    const root = document.documentElement;
    let calibrationFrame: number | null = null;
    let isDisposed = false;

    const calibrateCellGeometry = () => {
      calibrationFrame = null;
      root.removeAttribute(CELL_NORMALIZATION_ATTRIBUTE);

      const art = railRef.current?.querySelector<HTMLElement>(".rm-art");
      const bounds = art?.getBoundingClientRect();

      if (!bounds || bounds.height <= 0) {
        return;
      }

      const aspectRatio = bounds.width / bounds.height;

      if (
        Math.abs(aspectRatio - EXPECTED_SIGIL_ASPECT_RATIO) >
        SIGIL_ASPECT_RATIO_TOLERANCE
      ) {
        root.setAttribute(CELL_NORMALIZATION_ATTRIBUTE, "true");
      }
    };

    const scheduleCalibration = () => {
      if (isDisposed) {
        return;
      }

      if (calibrationFrame !== null) {
        cancelAnimationFrame(calibrationFrame);
      }

      calibrationFrame = requestAnimationFrame(calibrateCellGeometry);
    };

    calibrateCellGeometry();
    void document.fonts.ready.then(scheduleCalibration);
    document.fonts.addEventListener("loadingdone", scheduleCalibration);

    return () => {
      isDisposed = true;

      if (calibrationFrame !== null) {
        cancelAnimationFrame(calibrationFrame);
      }

      document.fonts.removeEventListener("loadingdone", scheduleCalibration);
      root.removeAttribute(CELL_NORMALIZATION_ATTRIBUTE);
    };
  }, []);

  /* One finite reveal on load draws the eye to the rail without leaving a
     compositor animation running behind the WebGL frame loop forever. */
  useEffect(() => {
    const frame = requestAnimationFrame(() => setHasIntroduced(true));

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (isInteractionLocked) {
      railRef.current
        ?.querySelector<HTMLButtonElement>(".rm-tile:focus")
        ?.blur();
    }
  }, [isInteractionLocked]);

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
      data-input-locked={isInteractionLocked ? "true" : undefined}
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
          aria-disabled={isInteractionLocked || undefined}
          className="rm-rail-options"
          role="group"
        >
          {RENDER_MODE_OPTIONS.map((option) => {
            const isActive = targetMode === option.mode;
            const tileContents = (
              <>
                <RenderModeArt mode={option.mode} />
                <span className="rm-tile-name">
                  <span aria-hidden="true" className="rm-tile-sigil">
                    {option.sigil}
                  </span>
                  {option.label}
                </span>
                <span aria-hidden="true" className="rm-tile-underline" />
              </>
            );

            /* A disabled native button still prevents text selection in
               WebKit. During the modal return, render the same tile as plain
               content instead: there is no click/hover target to race, while
               the ASCII and labels remain genuinely selectable. */
            if (isInteractionLocked) {
              return (
                <div
                  aria-disabled="true"
                  className="rm-mode-option rm-tile rm-tile-static"
                  data-active={isActive ? "true" : undefined}
                  data-mode={option.mode}
                  key={option.mode}
                >
                  {tileContents}
                </div>
              );
            }

            return (
              <button
                aria-pressed={isActive}
                className="rm-mode-option rm-tile"
                data-active={isActive ? "true" : undefined}
                data-mode={option.mode}
                key={option.mode}
                onClick={(event) => {
                  event.stopPropagation();
                  requestRenderMode(option.mode, getSeedPoint);
                }}
                type="button"
              >
                {tileContents}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
