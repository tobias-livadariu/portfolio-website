import { useEffect, useRef, useState } from "react";
import { useBackgroundMode } from "../background/background-mode-core";
import { useModalController } from "../modals/modal-context-core";
import { getModalScrollRoot } from "../modals/modal-scroll-controller";
import type { ModalSectionKey } from "../modals/modal.types";
import { NAV_ITEMS, TITLE_TEXT } from "../scene/ui3d/main-menu.constants";
import {
  setLandingMenuFocus,
  useHas3dMenuFailed,
  useIs3dMenuShowing,
} from "./landing-menu-store";
import "./landing-menu.css";

const LANDING_MENU_FALLBACK = {
  /* How long after the startup cover has opened the page waits for the 3D
     menu before showing this HTML menu in its place. The 3D menu normally
     arrives before the cover opens. This wait only matters on a device whose
     browser cannot draw the 3D scene at all, or where the scene is still
     loading. If the 3D menu arrives later, the HTML one is hidden again. */
  graceMs: 1200,
} as const;

/**
 * The landing menu as ordinary HTML: the page's heading and one button for
 * each section.
 *
 * The menu a visitor sees is 3D lettering drawn inside the WebGL canvas, which
 * the Tab key and screen readers cannot reach. This copy is normally invisible
 * and stands in for it: tabbing moves through these buttons, the 3D entry
 * that matches the focused button lights up as it does under the mouse, and
 * Enter or Space opens the section.
 *
 * When the 3D menu cannot be drawn, this copy is shown in its place so the
 * site still has a menu.
 */
export default function LandingMenu() {
  const { isInitialRevealComplete } = useBackgroundMode();
  const { isOpen, openSection } = useModalController();
  const is3dMenuShowing = useIs3dMenuShowing();
  const has3dMenuFailed = useHas3dMenuFailed();
  const [hasGraceElapsed, setHasGraceElapsed] = useState(false);
  const buttonRefs = useRef<Partial<Record<ModalSectionKey, HTMLElement>>>({});
  /* The section this menu opened from the keyboard. Focus returns to its
     button when the documents close, so tabbing carries on from where the
     visitor left the menu. */
  const sectionToRefocusRef = useRef<ModalSectionKey | null>(null);
  const hasDocumentOpenedRef = useRef(false);
  const stopWatchingScrollRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isInitialRevealComplete) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => setHasGraceElapsed(true),
      LANDING_MENU_FALLBACK.graceMs,
    );

    return () => window.clearTimeout(timeoutId);
  }, [isInitialRevealComplete]);

  useEffect(() => {
    if (isOpen || !hasDocumentOpenedRef.current) {
      return;
    }

    hasDocumentOpenedRef.current = false;

    const section = sectionToRefocusRef.current;

    sectionToRefocusRef.current = null;

    if (section) {
      buttonRefs.current[section]?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      stopWatchingScrollRef.current?.();
      setLandingMenuFocus(null);
    },
    [],
  );

  /* `isOpen` alone cannot tell a document closing from one that has not
     opened yet: it is briefly false again between a section being requested
     and the scroll toward it starting. The documents have really opened once
     the page has scrolled away from the top, so that is what arms the return
     of focus. */
  const watchForDocumentOpening = () => {
    const scrollRoot = getModalScrollRoot();

    stopWatchingScrollRef.current?.();
    hasDocumentOpenedRef.current = false;

    if (!scrollRoot) {
      return;
    }

    const handleScroll = () => {
      if (scrollRoot.scrollTop > 1) {
        hasDocumentOpenedRef.current = true;
        stopWatchingScrollRef.current?.();
      }
    };

    stopWatchingScrollRef.current = () => {
      scrollRoot.removeEventListener("scroll", handleScroll);
      stopWatchingScrollRef.current = null;
    };
    scrollRoot.addEventListener("scroll", handleScroll, { passive: true });
  };

  const isShownOnScreen =
    isInitialRevealComplete &&
    !is3dMenuShowing &&
    (has3dMenuFailed || hasGraceElapsed);

  return (
    <header
      className="landing-menu"
      data-shown={isShownOnScreen ? "true" : undefined}
      /* While a document is open the menu is behind it, so it leaves the tab
         order and the accessibility tree until the documents close. */
      inert={isOpen}
    >
      <h1 className="landing-menu-title">
        <span className="landing-menu-intro">{TITLE_TEXT.intro}</span>{" "}
        <span className="landing-menu-name">
          {TITLE_TEXT.firstName} {TITLE_TEXT.lastName}
        </span>
      </h1>
      <nav aria-label="Main menu" className="landing-menu-nav">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.key}>
              <button
                onBlur={() => setLandingMenuFocus(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  /* `detail` is 0 for a click made with Enter or Space.
                     Only then does focus follow the visitor into the
                     document and back. */
                  const isFromKeyboard = event.detail === 0;

                  sectionToRefocusRef.current = isFromKeyboard
                    ? item.key
                    : null;
                  watchForDocumentOpening();
                  openSection(item.key, { moveFocus: isFromKeyboard });
                }}
                onFocus={(event) => {
                  /* Light the 3D entry only for keyboard focus, which is
                     when the browser would draw a focus ring. */
                  if (event.currentTarget.matches(":focus-visible")) {
                    setLandingMenuFocus(item.key);
                  }
                }}
                ref={(element) => {
                  if (element) {
                    buttonRefs.current[item.key] = element;
                  } else {
                    delete buttonRefs.current[item.key];
                  }
                }}
                type="button"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
