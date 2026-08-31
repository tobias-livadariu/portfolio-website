import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import BackgroundModeSwitch from "../background/BackgroundModeSwitch";
import ModalRenderModeMenu from "../background/ModalRenderModeMenu";
import AboutModal from "./about/AboutModal";
import ContactModal from "./contact/ContactModal";
import ModalAssetPreloader from "./components/ModalAssetPreloader";
import PortfolioModal from "./portfolio/PortfolioModal";
import ResumeModal from "./resume/ResumeModal";
import { useModalController } from "./modal-context-core";
import { registerModalScrollRoot } from "./modal-scroll-controller";
import {
  MODAL_SCROLL,
  MODAL_RENDER_MENU_TIMING,
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

const RENDER_MENU_HANDOFF_PHASE_MS = MODAL_RENDER_MENU_TIMING.openMs / 2;

type RenderMenuMotion = "idle" | "leaving" | "entering" | "revealing";

interface ModalPanelProps {
  Section: ComponentType;
  isActive: boolean;
  isLast: boolean;
  ownsRenderMenu: boolean;
  onClose: () => void;
  onOpenSection: (section: ModalSectionKey) => void;
  registerRenderMenuSlot: (
    key: ModalSectionKey,
    element: HTMLDivElement | null,
  ) => void;
  registerRef: (key: ModalSectionKey, element: HTMLElement | null) => void;
  sectionKey: ModalSectionKey;
  sectionLabel: string;
  sectionShortLabel: string;
}

const ModalPanel = memo(function ModalPanel({
  Section,
  isActive,
  isLast,
  ownsRenderMenu,
  onClose,
  onOpenSection,
  registerRenderMenuSlot,
  registerRef,
  sectionKey,
  sectionLabel,
  sectionShortLabel,
}: ModalPanelProps) {
  const setRef = useCallback(
    (element: HTMLElement | null) => registerRef(sectionKey, element),
    [registerRef, sectionKey],
  );
  const setRenderMenuSlotRef = useCallback(
    (element: HTMLDivElement | null) =>
      registerRenderMenuSlot(sectionKey, element),
    [registerRenderMenuSlot, sectionKey],
  );

  return (
    <section
      aria-label={`${sectionLabel} section`}
      className="modal-panel"
      data-active={isActive ? "true" : undefined}
      data-render-menu-owner={ownsRenderMenu ? "true" : undefined}
      ref={setRef}
    >
      <div className="modal-panel-frame">
        <div className="modal-panel-chrome">
          <div className="modal-panel-toolbar">
            <span className="modal-file-label">
              File: {sectionShortLabel}.modal
            </span>
            <nav className="modal-section-tabs" aria-label="Portfolio sections">
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
            <div className="modal-toolbar-right">
              <div
                className="modal-render-menu-slot"
                ref={setRenderMenuSlotRef}
              />
              <button
                aria-label="Close section"
                className="modal-quit-button"
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
        </div>
        <div className="modal-panel-body">
          <Section />
        </div>
      </div>
      {!isLast ? <div className="modal-scroll-gap" aria-hidden="true" /> : null}
    </section>
  );
});

function getRevealDistancePx() {
  return window.innerHeight * (1 + MODAL_SCROLL.homeOffsetVh / 100);
}

export default function ModalLayer({ background }: { background: ReactNode }) {
  const { close, isOpen, navigationRequest, openSection, setIsOpen } =
    useModalController();
  const layerRef = useRef<HTMLDivElement>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  const currentSectionRef = useRef<ModalSectionKey | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [activeSection, setActiveSection] = useState<ModalSectionKey | null>(
    null,
  );
  const [renderMenuSection, setRenderMenuSection] =
    useState<ModalSectionKey | null>(null);
  const renderMenuSectionRef = useRef<ModalSectionKey | null>(null);
  const renderMenuTargetRef = useRef<ModalSectionKey | null>(null);
  const isRenderMenuClosingRef = useRef(false);
  const [renderMenuMotion, setRenderMenuMotion] =
    useState<RenderMenuMotion>("idle");
  const [isRenderMenuRequested, setIsRenderMenuRequested] = useState(false);
  const renderMenuMotionRef = useRef<RenderMenuMotion>("idle");
  const renderMenuHandoffTimeoutRef = useRef<number | null>(null);
  const renderMenuIdleTimeoutRef = useRef<number | null>(null);
  const renderMenuPlacementFrameRef = useRef<number | null>(null);
  const renderMenuRevealFrameRef = useRef<number | null>(null);
  const [renderMenuHost] = useState(() => {
    const element = document.createElement("div");

    element.className = "modal-render-menu-host";
    return element;
  });
  const sectionOffsetsRef = useRef<Partial<Record<ModalSectionKey, number>>>(
    {},
  );
  const renderMenuEndOffsetsRef = useRef<
    Partial<Record<ModalSectionKey, number>>
  >({});
  const scrollRootHeightRef = useRef(0);
  const sectionRefs = useRef<Partial<Record<ModalSectionKey, HTMLElement>>>({});
  const renderMenuSlotRefs = useRef<
    Partial<Record<ModalSectionKey, HTMLDivElement>>
  >({});
  const sections = useMemo(() => MODAL_SECTIONS, []);

  const cancelRenderMenuMotion = useCallback(() => {
    if (renderMenuHandoffTimeoutRef.current !== null) {
      window.clearTimeout(renderMenuHandoffTimeoutRef.current);
      renderMenuHandoffTimeoutRef.current = null;
    }
    if (renderMenuIdleTimeoutRef.current !== null) {
      window.clearTimeout(renderMenuIdleTimeoutRef.current);
      renderMenuIdleTimeoutRef.current = null;
    }
    if (renderMenuPlacementFrameRef.current !== null) {
      window.cancelAnimationFrame(renderMenuPlacementFrameRef.current);
      renderMenuPlacementFrameRef.current = null;
    }
    if (renderMenuRevealFrameRef.current !== null) {
      window.cancelAnimationFrame(renderMenuRevealFrameRef.current);
      renderMenuRevealFrameRef.current = null;
    }
  }, []);

  const scheduleRenderMenuReveal = useCallback(() => {
    renderMenuPlacementFrameRef.current = window.requestAnimationFrame(() => {
      renderMenuPlacementFrameRef.current = null;
      renderMenuRevealFrameRef.current = window.requestAnimationFrame(() => {
        renderMenuRevealFrameRef.current = null;
        renderMenuMotionRef.current = "revealing";
        setRenderMenuMotion("revealing");
      });
    });
  }, []);

  /* Start the reveal clock only after React has committed the visible phase.
     This prevents a busy WebGL frame from batching `revealing` and `idle`
     together and skipping the CSS transition entirely. */
  useEffect(() => {
    if (renderMenuMotion !== "revealing") {
      return;
    }

    renderMenuIdleTimeoutRef.current = window.setTimeout(() => {
      renderMenuIdleTimeoutRef.current = null;
      renderMenuMotionRef.current = "idle";
      setRenderMenuMotion("idle");
    }, RENDER_MENU_HANDOFF_PHASE_MS);

    return () => {
      if (renderMenuIdleTimeoutRef.current !== null) {
        window.clearTimeout(renderMenuIdleTimeoutRef.current);
        renderMenuIdleTimeoutRef.current = null;
      }
    };
  }, [renderMenuMotion]);

  /* Start each ownership change by retracting the current control. The host
     moves only after that motion completes, so it appears to pass behind [q]
     instead of jumping directly between two sticky headers. */
  const updateRenderMenuSection = useCallback(
    (section: ModalSectionKey | null) => {
      if (renderMenuTargetRef.current === section) {
        return;
      }

      renderMenuTargetRef.current = section;
      cancelRenderMenuMotion();

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        renderMenuSectionRef.current = section;
        renderMenuMotionRef.current = "idle";
        setRenderMenuSection(section);
        setRenderMenuMotion("idle");
        return;
      }

      const currentSection = renderMenuSectionRef.current;

      if (currentSection === section) {
        if (section !== null && renderMenuMotionRef.current !== "idle") {
          renderMenuMotionRef.current = "entering";
          setRenderMenuMotion("entering");
          scheduleRenderMenuReveal();
        }
        return;
      }

      if (currentSection === null) {
        renderMenuSectionRef.current = section;
        setRenderMenuSection(section);

        if (section !== null) {
          renderMenuMotionRef.current = "entering";
          setRenderMenuMotion("entering");
          scheduleRenderMenuReveal();
        }
        return;
      }

      renderMenuMotionRef.current = "leaving";
      setRenderMenuMotion("leaving");
      renderMenuHandoffTimeoutRef.current = window.setTimeout(() => {
        renderMenuHandoffTimeoutRef.current = null;
        const nextSection = renderMenuTargetRef.current;

        renderMenuSectionRef.current = nextSection;
        setRenderMenuSection(nextSection);

        if (nextSection === null) {
          renderMenuMotionRef.current = "idle";
          setRenderMenuMotion("idle");
          return;
        }

        renderMenuMotionRef.current = "entering";
        setRenderMenuMotion("entering");
        scheduleRenderMenuReveal();
      }, RENDER_MENU_HANDOFF_PHASE_MS);
    },
    [cancelRenderMenuMotion, scheduleRenderMenuReveal],
  );

  /* The portal target never changes, so ModalRenderModeMenu remains one React
     instance. Moving its host node between header slots preserves open state,
     focus bookkeeping, and the pending/current render-mode readout. */
  useLayoutEffect(() => {
    const slot = renderMenuSection
      ? renderMenuSlotRefs.current[renderMenuSection]
      : null;

    if (slot) {
      if (renderMenuHost.parentElement !== slot) {
        slot.append(renderMenuHost);
      }
    } else {
      renderMenuHost.remove();
    }
  }, [renderMenuHost, renderMenuSection]);

  useEffect(
    () => () => {
      cancelRenderMenuMotion();
      renderMenuHost.remove();
    },
    [cancelRenderMenuMotion, renderMenuHost],
  );

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  /* Publish the scroller so the modal toolbar's render menu can return the
     reader to the starfield before starting a transition. */
  useEffect(() => {
    registerModalScrollRoot(scrollRootRef.current);

    return () => registerModalScrollRoot(null);
  }, []);

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
        const offsetTop =
          scrollRoot.scrollTop +
          element.getBoundingClientRect().top -
          scrollRootRect.top;

        sectionOffsetsRef.current[section.key] = offsetTop;

        const chrome = element.querySelector(".modal-panel-chrome");

        if (chrome instanceof HTMLElement) {
          renderMenuEndOffsetsRef.current[section.key] =
            offsetTop + element.offsetHeight - chrome.offsetHeight;
        }
      }
    }
  }, [sections]);

  const getTopmostVisibleSection = useCallback(() => {
    const scrollRoot = scrollRootRef.current;

    if (!scrollRoot || scrollRoot.scrollTop < getRevealDistancePx()) {
      return null;
    }

    for (const section of sections) {
      const endOffset = renderMenuEndOffsetsRef.current[section.key];

      if (endOffset !== undefined && scrollRoot.scrollTop < endOffset - 1) {
        return section.key;
      }
    }

    return sections[sections.length - 1]?.key ?? null;
  }, [sections]);

  const syncRenderMenuOwnership = useCallback(
    (commitImmediately = false) => {
      let nextSection = getTopmostVisibleSection();

      if (isRenderMenuClosingRef.current) {
        const closingSection = renderMenuTargetRef.current;

        /* Preserve the current trigger until its normal sticky-header
           boundary. Once it leaves, retract to no owner and suppress every
           intermediate header for the remainder of the trip home. */
        if (closingSection === null || closingSection === nextSection) {
          return;
        }

        nextSection = null;
      }

      if (renderMenuTargetRef.current === nextSection) {
        return;
      }

      if (commitImmediately) {
        /* Ownership changes only at four document boundaries. Paying for one
           synchronous commit there lets CSS begin the retraction in the same
           scroll event instead of one or two rendered frames later. */
        flushSync(() => updateRenderMenuSection(nextSection));
      } else {
        updateRenderMenuSection(nextSection);
      }
    },
    [getTopmostVisibleSection, updateRenderMenuSection],
  );

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
    syncRenderMenuOwnership();

    if (scrollRoot.scrollTop <= 1) {
      /* The persistent portal survives outside the visible modal stack; its
         dropdown state should not. A manual return home is a real close just
         like [q], Escape, or a backdrop click. */
      setIsRenderMenuRequested(false);
      isRenderMenuClosingRef.current = false;
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

    const maxScrollTop = Math.max(
      0,
      scrollRoot.scrollHeight - scrollRoot.clientHeight,
    );

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
  }, [sections, syncRenderMenuOwnership, updateIsOpen]);

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

    /* Coalesce ResizeObserver + window-resize signals into one per-frame
       pass so a sustained resize gesture invokes the (4×) getBoundingClientRect
       reads + setState in syncScrollState at most once per frame. */
    let pendingFrame: number | null = null;
    const handleResize = () => {
      if (pendingFrame !== null) {
        return;
      }
      pendingFrame = window.requestAnimationFrame(() => {
        pendingFrame = null;
        updateSectionMetrics();
        scheduleScrollSync();
      });
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(handleResize);

    resizeObserver?.observe(scrollRoot);

    for (const section of sections) {
      const element = sectionRefs.current[section.key];

      if (element) {
        resizeObserver?.observe(element);
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);

      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
      }

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scheduleScrollSync, sections, updateSectionMetrics]);

  useEffect(() => {
    if (!navigationRequest) {
      return;
    }

    isRenderMenuClosingRef.current = navigationRequest.section === null;

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
    isRenderMenuClosingRef.current = true;
    setIsRenderMenuRequested(false);
    updateRenderMenuSection(null);

    const activeElement = document.activeElement;

    if (
      activeElement instanceof HTMLElement &&
      layerRef.current?.contains(activeElement)
    ) {
      activeElement.blur();
    }

    close();
  }, [close, updateRenderMenuSection]);

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
    syncRenderMenuOwnership(true);
    scheduleScrollSync();
  }, [scheduleScrollSync, syncRenderMenuOwnership]);

  const handleScrollRootClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.classList.contains("modal-backdrop") ||
          target.classList.contains("modal-home-spacer") ||
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

  const registerRenderMenuSlot = useCallback(
    (key: ModalSectionKey, element: HTMLDivElement | null) => {
      if (element) {
        renderMenuSlotRefs.current[key] = element;
      } else {
        delete renderMenuSlotRefs.current[key];
      }
    },
    [],
  );

  const layerStyle = useMemo(
    () =>
      ({
        "--modal-home-offset": `${MODAL_SCROLL.homeOffsetVh}vh`,
        "--modal-section-gap": `${MODAL_SCROLL.sectionGapVh}vh`,
        "--modal-render-open-duration": `${MODAL_RENDER_MENU_TIMING.openMs}ms`,
        "--modal-render-handoff-phase-duration": `${RENDER_MENU_HANDOFF_PHASE_MS}ms`,
      }) as CSSProperties,
    [],
  );

  return (
    <>
      <ModalAssetPreloader />
      <div
        className={`modal-layer ${isOpen ? "modal-layer-open" : ""}`}
        ref={layerRef}
        style={layerStyle}
      >
        <div
          aria-label="Portfolio sections"
          aria-modal={isOpen || undefined}
          className="modal-scroll-root"
          onClick={handleScrollRootClick}
          onScroll={handleScroll}
          ref={scrollRootRef}
          role={isOpen ? "dialog" : undefined}
          tabIndex={-1}
        >
          {/* Keep the fixed scene inside the real scroll container. Wheel
              events can then remain browser-native for the entire gesture,
              even while their hit target changes as the modal opens. */}
          <div className="portfolio-canvas-layer">{background}</div>
          <div aria-hidden="true" className="modal-backdrop" />
          <BackgroundModeSwitch />
          <div className="modal-home-spacer" />
          {/* The switch above must stay outside this aria-hidden subtree so it
              remains exposed to assistive tech while the modals are closed. */}
          <div aria-hidden={!isOpen} className="modal-scroll-stack">
            {sections.map((section, index) => {
              const Section = SECTION_COMPONENTS[section.key];

              return (
                <ModalPanel
                  Section={Section}
                  isActive={activeSection === section.key}
                  isLast={index === sections.length - 1}
                  key={section.key}
                  ownsRenderMenu={renderMenuSection === section.key}
                  onClose={requestClose}
                  onOpenSection={openSection}
                  registerRenderMenuSlot={registerRenderMenuSlot}
                  registerRef={registerSectionRef}
                  sectionKey={section.key}
                  sectionLabel={section.label}
                  sectionShortLabel={section.shortLabel}
                />
              );
            })}
          </div>
        </div>
        {createPortal(
          <ModalRenderModeMenu
            isMenuRequested={isRenderMenuRequested}
            motion={renderMenuMotion}
            onMenuRequestedChange={setIsRenderMenuRequested}
          />,
          renderMenuHost,
        )}
      </div>
    </>
  );
}
