import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, CSSProperties } from "react";
import AboutModal from "./about/AboutModal";
import ContactModal from "./contact/ContactModal";
import ModalAssetPreloader from "./components/ModalAssetPreloader";
import PortfolioModal from "./portfolio/PortfolioModal";
import ResumeModal from "./resume/ResumeModal";
import { useModalController } from "./modal-context-core";
import {
  MODAL_OVERSCROLL,
  MODAL_SCROLL,
  MODAL_SECTIONS,
  MODAL_SECTION_KEYS,
  getModalIndex,
} from "./modals.constants";
import type { ModalSectionKey } from "./modal.types";
import "./modals.css";

const SECTION_COMPONENTS: Record<ModalSectionKey, ComponentType> = {
  about: AboutModal,
  resume: ResumeModal,
  portfolio: PortfolioModal,
  contactMe: ContactModal,
};

interface ModalPanelProps {
  Section: ComponentType;
  isActive: boolean;
  isLast: boolean;
  onClose: () => void;
  onOpenSection: (section: ModalSectionKey) => void;
  registerRef: (key: ModalSectionKey, element: HTMLElement | null) => void;
  sectionKey: ModalSectionKey;
  sectionLabel: string;
  sectionShortLabel: string;
}

const ModalPanel = memo(function ModalPanel({
  Section,
  isActive,
  isLast,
  onClose,
  onOpenSection,
  registerRef,
  sectionKey,
  sectionLabel,
  sectionShortLabel,
}: ModalPanelProps) {
  const setRef = useCallback(
    (element: HTMLElement | null) => registerRef(sectionKey, element),
    [registerRef, sectionKey],
  );

  return (
    <section
      aria-label={`${sectionLabel} section`}
      className="modal-panel"
      data-active={isActive ? "true" : undefined}
      ref={setRef}
    >
      <div className="modal-panel-frame">
        <div className="modal-panel-chrome">
          <div className="modal-panel-toolbar">
            <span className="modal-file-label">
              File: {sectionShortLabel}.modal
            </span>
            <nav
              className="modal-section-tabs"
              aria-label="Portfolio sections"
            >
              {MODAL_SECTIONS.map((navigationSection) => (
                <button
                  aria-current={
                    navigationSection.key === sectionKey ? "page" : undefined
                  }
                  key={navigationSection.key}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenSection(navigationSection.key);
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
                onClose();
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
      {!isLast ? <div className="modal-scroll-gap" aria-hidden="true" /> : null}
    </section>
  );
});

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

function getMaxScrollTop(element: HTMLElement) {
  return Math.max(0, element.scrollHeight - element.clientHeight);
}

function clampScrollTop(element: HTMLElement, scrollTop: number) {
  return Math.min(getMaxScrollTop(element), Math.max(0, scrollTop));
}

export default function ModalLayer() {
  const { close, isOpen, navigationRequest, openSection, setIsOpen } =
    useModalController();
  const layerRef = useRef<HTMLDivElement>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  const currentSectionRef = useRef<ModalSectionKey | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const overscrollSettleTimeoutRef = useRef<number | null>(null);
  const [activeSection, setActiveSection] = useState<ModalSectionKey | null>(
    null,
  );
  const sectionOffsetsRef = useRef<Partial<Record<ModalSectionKey, number>>>(
    {},
  );
  const scrollRootHeightRef = useRef(0);
  const sectionRefs = useRef<Partial<Record<ModalSectionKey, HTMLElement>>>({});
  const sections = useMemo(() => MODAL_SECTIONS, []);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

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

  const updateSectionMetrics = useCallback(() => {
    const scrollRoot = scrollRootRef.current;

    if (!scrollRoot) {
      return;
    }

    scrollRootHeightRef.current = scrollRoot.clientHeight;
    const scrollRootRect = scrollRoot.getBoundingClientRect();

    for (const section of sections) {
      const element = sectionRefs.current[section.key];

      if (element) {
        sectionOffsetsRef.current[section.key] =
          scrollRoot.scrollTop +
          element.getBoundingClientRect().top -
          scrollRootRect.top;
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

    const revealDistance = getRevealDistancePx();
    const revealProgress = Math.min(1, scrollRoot.scrollTop / revealDistance);
    const opacity = revealProgress * MODAL_SCROLL.maxBackdropOpacity;

    layer.style.setProperty("--modal-backdrop-opacity", opacity.toFixed(3));

    if (scrollRoot.scrollTop <= 1) {
      currentSectionRef.current = null;
      setActiveSection(null);
      updateIsOpen(false);
      return;
    }

    updateIsOpen(true);

    if (scrollRoot.scrollTop < revealDistance) {
      currentSectionRef.current = null;
      setActiveSection(null);
      return;
    }

    const maxScrollTop = getMaxScrollTop(scrollRoot);

    if (scrollRoot.scrollTop >= maxScrollTop - 1) {
      const lastSection = sections[sections.length - 1]?.key ?? null;

      currentSectionRef.current = lastSection;
      setActiveSection(lastSection);
      return;
    }

    const probeY = scrollRoot.scrollTop + scrollRootHeightRef.current * 0.28;
    let nextActiveSection: ModalSectionKey | null = null;

    for (const section of sections) {
      const offsetTop = sectionOffsetsRef.current[section.key];

      if (offsetTop !== undefined && probeY >= offsetTop - 8) {
        nextActiveSection = section.key;
      }
    }

    currentSectionRef.current = nextActiveSection;
    setActiveSection(nextActiveSection);
  }, [sections, updateIsOpen]);

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

      if (overscrollSettleTimeoutRef.current !== null) {
        window.clearTimeout(overscrollSettleTimeoutRef.current);
      }
    };
  }, [scheduleScrollSync, sections, updateSectionMetrics]);

  const settleOverscroll = useCallback((offsetPx: number) => {
    const layer = layerRef.current;

    if (!layer) {
      return;
    }

    if (overscrollSettleTimeoutRef.current !== null) {
      window.clearTimeout(overscrollSettleTimeoutRef.current);
    }

    layer.classList.remove("modal-layer-overscroll-settling");
    layer.style.setProperty("--modal-overscroll-y", `${offsetPx.toFixed(2)}px`);
    void layer.offsetHeight;

    layer.classList.add("modal-layer-overscroll-settling");
    layer.style.setProperty("--modal-overscroll-y", "0px");

    overscrollSettleTimeoutRef.current = window.setTimeout(() => {
      layer.classList.remove("modal-layer-overscroll-settling");
      overscrollSettleTimeoutRef.current = null;
    }, MODAL_OVERSCROLL.settleMs);
  }, []);

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
        currentSectionRef.current = null;
        setActiveSection(null);
        scrollRoot.scrollTo({ behavior: "smooth", top: 0 });
        return;
      }

      currentSectionRef.current = navigationRequest.section;
      setActiveSection(navigationRequest.section);

      const isLastSection =
        navigationRequest.section ===
        MODAL_SECTION_KEYS[MODAL_SECTION_KEYS.length - 1];

      sectionRefs.current[navigationRequest.section]?.scrollIntoView({
        behavior: "smooth",
        block: isLastSection ? "end" : "start",
        inline: "nearest",
      });
    });
  }, [navigationRequest, updateIsOpen]);

  const requestClose = useCallback(() => {
    close();
  }, [close]);

  useEffect(() => {
    const maybeSettleEdgeOverscroll = (
      event: WheelEvent,
      deltaY: number,
      scrollRoot: HTMLElement,
    ) => {
      const currentScrollTop = scrollRoot.scrollTop;
      const maxScrollTop = getMaxScrollTop(scrollRoot);
      const rawNextScrollTop =
        currentScrollTop + deltaY * MODAL_SCROLL.wheelOpenMultiplier;
      const isTopOverscroll = currentScrollTop <= 0 && rawNextScrollTop < 0;
      const isBottomOverscroll =
        currentScrollTop >= maxScrollTop && rawNextScrollTop > maxScrollTop;

      if (!isTopOverscroll && !isBottomOverscroll) {
        return false;
      }

      const direction = isTopOverscroll ? 1 : -1;
      const offsetPx =
        direction *
        Math.min(
          MODAL_OVERSCROLL.maxPx,
          Math.abs(rawNextScrollTop - currentScrollTop) *
            MODAL_OVERSCROLL.resistance,
        );

      event.preventDefault();
      settleOverscroll(offsetPx);
      return true;
    };

    const handleWindowWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        return;
      }

      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      const deltaY = normalizeWheelDelta(event);

      if (Math.abs(deltaY) < 0.5) {
        return;
      }

      const scrollRoot = scrollRootRef.current;

      if (!scrollRoot) {
        return;
      }

      const currentScrollTop = scrollRoot.scrollTop;
      const rawNextScrollTop =
        currentScrollTop + deltaY * MODAL_SCROLL.wheelOpenMultiplier;
      const nextScrollTop = clampScrollTop(scrollRoot, rawNextScrollTop);

      event.preventDefault();

      if (nextScrollTop === currentScrollTop) {
        maybeSettleEdgeOverscroll(event, deltaY, scrollRoot);

        return;
      }

      scrollRoot.scrollTop = nextScrollTop;
      scheduleScrollSync();
    };

    const handleScrollRootWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey) {
        return;
      }

      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      const scrollRoot = scrollRootRef.current;

      if (!scrollRoot) {
        return;
      }

      maybeSettleEdgeOverscroll(event, normalizeWheelDelta(event), scrollRoot);
    };

    const scrollRoot = scrollRootRef.current;

    window.addEventListener("wheel", handleWindowWheel, {
      capture: true,
      passive: false,
    });
    scrollRoot?.addEventListener("wheel", handleScrollRootWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      window.removeEventListener("wheel", handleWindowWheel, {
        capture: true,
      });
      scrollRoot?.removeEventListener("wheel", handleScrollRootWheel, {
        capture: true,
      });
    };
  }, [scheduleScrollSync, settleOverscroll]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === "q" &&
        (isOpenRef.current || (scrollRootRef.current?.scrollTop ?? 0) > 1) &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key === "Escape") {
        requestClose();
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
      const currentIndex = getModalIndex(currentSectionRef.current);
      const nextIndex =
        currentIndex === -1 && direction > 0 ? 0 : currentIndex + direction;

      if (nextIndex < 0) {
        requestClose();
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
  }, [openSection, requestClose]);

  const handleScroll = useCallback(() => {
    scheduleScrollSync();
  }, [scheduleScrollSync]);

  const handleScrollRootClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.classList.contains("modal-home-spacer") ||
          target.classList.contains("modal-scroll-gap") ||
          target.classList.contains("modal-scroll-root") ||
          target.classList.contains("modal-scroll-stack"))
      ) {
        requestClose();
      }
    },
    [requestClose],
  );

  const registerSectionRef = useCallback(
    (key: ModalSectionKey, element: HTMLElement | null) => {
      if (element) {
        sectionRefs.current[key] = element;
      } else {
        delete sectionRefs.current[key];
      }
    },
    [],
  );

  const layerStyle = useMemo(
    () =>
      ({
        "--modal-home-offset": `${MODAL_SCROLL.homeOffsetVh}vh`,
        "--modal-section-gap": `${MODAL_SCROLL.sectionGapVh}vh`,
        "--modal-overscroll-settle-ms": `${MODAL_OVERSCROLL.settleMs}ms`,
      }) as CSSProperties,
    [],
  );

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
          ref={scrollRootRef}
          role="dialog"
          tabIndex={-1}
        >
          <div className="modal-home-spacer" />
          <div className="modal-scroll-stack">
            {sections.map((section, index) => {
              const Section = SECTION_COMPONENTS[section.key];

              return (
                <ModalPanel
                  Section={Section}
                  isActive={activeSection === section.key}
                  isLast={index === sections.length - 1}
                  key={section.key}
                  onClose={requestClose}
                  onOpenSection={openSection}
                  registerRef={registerSectionRef}
                  sectionKey={section.key}
                  sectionLabel={section.label}
                  sectionShortLabel={section.shortLabel}
                />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
