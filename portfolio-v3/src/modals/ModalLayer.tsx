import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  CSSProperties,
  ReactElement,
  WheelEvent as ReactWheelEvent,
} from "react";
import AboutModal from "./about/AboutModal";
import ContactModal from "./contact/ContactModal";
import ModalAssetPreloader from "./components/ModalAssetPreloader";
import PortfolioModal from "./portfolio/PortfolioModal";
import ResumeModal from "./resume/ResumeModal";
import { useModalController } from "./modal-context-core";
import {
  MODAL_SCROLL,
  MODAL_SECTIONS,
  MODAL_SECTION_KEYS,
  getModalIndex,
} from "./modals.constants";
import type { ModalSectionKey } from "./modal.types";
import "./modals.css";

const SECTION_COMPONENTS: Record<ModalSectionKey, () => ReactElement> = {
  about: AboutModal,
  resume: ResumeModal,
  portfolio: PortfolioModal,
  contactMe: ContactModal,
};

function normalizeWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }

  return event.deltaY;
}

function getRevealDistancePx() {
  return window.innerHeight * (1 + MODAL_SCROLL.homeOffsetVh / 100);
}

export default function ModalLayer() {
  const {
    activeSection,
    close,
    isOpen,
    navigationRequest,
    openSection,
    setActiveSection,
    setIsOpen,
  } = useModalController();
  const layerRef = useRef<HTMLDivElement>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  const activeSectionRef = useRef(activeSection);
  const animationFrameRef = useRef<number | null>(null);
  const sectionOffsetsRef = useRef<Partial<Record<ModalSectionKey, number>>>(
    {},
  );
  const scrollRootHeightRef = useRef(0);
  const sectionRefs = useRef<Partial<Record<ModalSectionKey, HTMLElement>>>({});
  const sections = useMemo(() => MODAL_SECTIONS, []);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  const updateIsOpen = useCallback(
    (nextIsOpen: boolean) => {
      if (isOpenRef.current === nextIsOpen) {
        return;
      }

      isOpenRef.current = nextIsOpen;
      setIsOpen(nextIsOpen);
    },
    [setIsOpen],
  );

  const updateActiveSection = useCallback(
    (nextActiveSection: ModalSectionKey | null) => {
      if (activeSectionRef.current === nextActiveSection) {
        return;
      }

      activeSectionRef.current = nextActiveSection;
      setActiveSection(nextActiveSection);
    },
    [setActiveSection],
  );

  const updateSectionMetrics = useCallback(() => {
    const scrollRoot = scrollRootRef.current;

    if (!scrollRoot) {
      return;
    }

    scrollRootHeightRef.current = scrollRoot.clientHeight;

    for (const section of sections) {
      const element = sectionRefs.current[section.key];

      if (element) {
        sectionOffsetsRef.current[section.key] = element.offsetTop;
      }
    }
  }, [sections]);

  const syncScrollState = useCallback(() => {
    const scrollRoot = scrollRootRef.current;
    const layer = layerRef.current;

    animationFrameRef.current = null;

    if (!scrollRoot || !layer) {
      return;
    }

    const revealProgress = Math.min(
      1,
      scrollRoot.scrollTop / getRevealDistancePx(),
    );
    const opacity = revealProgress * MODAL_SCROLL.maxBackdropOpacity;

    layer.style.setProperty("--modal-backdrop-opacity", opacity.toFixed(3));

    if (scrollRoot.scrollTop <= 1) {
      updateIsOpen(false);
      updateActiveSection(null);
      return;
    }

    updateIsOpen(true);

    const probeY = scrollRoot.scrollTop + scrollRootHeightRef.current * 0.28;
    let nextActiveSection: ModalSectionKey | null = null;

    for (const section of sections) {
      const offsetTop = sectionOffsetsRef.current[section.key];

      if (offsetTop !== undefined && probeY >= offsetTop - 8) {
        nextActiveSection = section.key;
      }
    }

    updateActiveSection(nextActiveSection);
  }, [sections, updateActiveSection, updateIsOpen]);

  const scheduleScrollSync = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(syncScrollState);
  }, [syncScrollState]);

  useEffect(() => {
    const scrollRoot = scrollRootRef.current;

    if (!scrollRoot) {
      return;
    }

    updateSectionMetrics();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            updateSectionMetrics();
            scheduleScrollSync();
          });

    resizeObserver?.observe(scrollRoot);

    for (const section of sections) {
      const element = sectionRefs.current[section.key];

      if (element) {
        resizeObserver?.observe(element);
      }
    }

    window.addEventListener("resize", updateSectionMetrics);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateSectionMetrics);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scheduleScrollSync, sections, updateSectionMetrics]);

  useEffect(() => {
    if (!navigationRequest) {
      return;
    }

    updateIsOpen(true);

    window.requestAnimationFrame(() => {
      const scrollRoot = scrollRootRef.current;

      if (!scrollRoot) {
        return;
      }

      if (navigationRequest.section === null) {
        scrollRoot.scrollTo({ behavior: "smooth", top: 0 });
        return;
      }

      sectionRefs.current[navigationRequest.section]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    });
  }, [navigationRequest, updateIsOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    scrollRootRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const handleHomeWheel = (event: WheelEvent) => {
      if (
        isOpenRef.current ||
        Math.abs(event.deltaY) <= Math.abs(event.deltaX)
      ) {
        return;
      }

      const deltaY = normalizeWheelDelta(event);

      if (deltaY <= 0) {
        return;
      }

      event.preventDefault();
      updateIsOpen(true);

      window.requestAnimationFrame(() => {
        scrollRootRef.current?.scrollBy({
          behavior: "auto",
          top: deltaY * MODAL_SCROLL.wheelOpenMultiplier,
        });
      });
    };

    window.addEventListener("wheel", handleHomeWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleHomeWheel);
    };
  }, [updateIsOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }

      if (
        event.key !== "ArrowDown" &&
        event.key !== "PageDown" &&
        event.key !== "ArrowUp" &&
        event.key !== "PageUp"
      ) {
        return;
      }

      event.preventDefault();

      const direction =
        event.key === "ArrowDown" || event.key === "PageDown" ? 1 : -1;
      const currentIndex = getModalIndex(activeSection);
      const nextIndex =
        currentIndex === -1 && direction > 0 ? 0 : currentIndex + direction;

      if (nextIndex < 0) {
        close();
        return;
      }

      const nextSection = MODAL_SECTION_KEYS[nextIndex];

      if (nextSection) {
        openSection(nextSection);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeSection, close, openSection]);

  const handleScroll = useCallback(() => {
    scheduleScrollSync();
  }, [scheduleScrollSync]);

  const handleScrollRootClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.classList.contains("modal-home-spacer") ||
          target.classList.contains("modal-scroll-gap"))
      ) {
        close();
      }
    },
    [close],
  );

  const handleScrollRootWheel = useCallback(
    (event: ReactWheelEvent) => {
      if (event.currentTarget.scrollTop <= 0 && event.deltaY < 0) {
        updateIsOpen(false);
      }
    },
    [updateIsOpen],
  );

  const layerStyle = {
    "--modal-home-offset": `${MODAL_SCROLL.homeOffsetVh}vh`,
    "--modal-section-gap": `${MODAL_SCROLL.sectionGapVh}vh`,
  } as CSSProperties;

  return (
    <>
      <ModalAssetPreloader />
      <div
        aria-hidden={!isOpen}
        className={`modal-layer ${isOpen ? "modal-layer-open" : ""}`}
        ref={layerRef}
        style={layerStyle}
      >
        <div className="modal-backdrop" />
        <div
          aria-label="Portfolio sections"
          aria-modal={isOpen}
          className="modal-scroll-root"
          onClick={handleScrollRootClick}
          onScroll={handleScroll}
          onWheel={handleScrollRootWheel}
          ref={scrollRootRef}
          role="dialog"
          tabIndex={-1}
        >
          <div className="modal-home-spacer" />
          <div className="modal-scroll-stack">
            {sections.map((section, index) => {
              const Section = SECTION_COMPONENTS[section.key];

              return (
                <section
                  aria-label={`${section.label} section`}
                  className="modal-panel"
                  data-active={activeSection === section.key}
                  key={section.key}
                  ref={(element) => {
                    if (element) {
                      sectionRefs.current[section.key] = element;
                    } else {
                      delete sectionRefs.current[section.key];
                    }
                  }}
                >
                  <div className="modal-panel-frame">
                    <div className="modal-panel-chrome">
                      <div className="modal-panel-toolbar">
                        <span className="modal-file-label">
                          File: {section.shortLabel}.modal
                        </span>
                        <nav
                          className="modal-section-tabs"
                          aria-label="Portfolio sections"
                        >
                          {sections.map((navigationSection) => (
                            <button
                              aria-current={
                                activeSection === navigationSection.key
                                  ? "page"
                                  : undefined
                              }
                              key={navigationSection.key}
                              onClick={(event) => {
                                event.stopPropagation();
                                openSection(navigationSection.key);
                              }}
                              type="button"
                            >
                              {navigationSection.label}
                            </button>
                          ))}
                        </nav>
                        <button
                          aria-label="Close section"
                          onClick={(event) => {
                            event.stopPropagation();
                            close();
                          }}
                          type="button"
                        >
                          [q]
                        </button>
                      </div>
                    </div>
                    <div className="modal-panel-body">
                      <Section />
                    </div>
                  </div>
                  {index < sections.length - 1 ? (
                    <div className="modal-scroll-gap" aria-hidden="true" />
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
