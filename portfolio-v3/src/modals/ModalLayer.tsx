import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties, ReactElement } from "react";
import AboutModal from "./about/AboutModal";
import ContactModal from "./contact/ContactModal";
import ModalAssetPreloader from "./components/ModalAssetPreloader";
import PortfolioModal from "./portfolio/PortfolioModal";
import ResumeModal from "./resume/ResumeModal";
import { useModalController } from "./modal-context-core";
import { MODAL_SECTIONS } from "./modals.constants";
import type { ModalSectionKey } from "./modal.types";
import "./modals.css";

const SECTION_COMPONENTS: Record<ModalSectionKey, () => ReactElement> = {
  about: AboutModal,
  resume: ResumeModal,
  portfolio: PortfolioModal,
  contactMe: ContactModal,
};

export default function ModalLayer() {
  const { activeIndex, activeSection, close, dragOffsetPx, openSection } =
    useModalController();
  const stageRef = useRef<HTMLDivElement>(null);
  const isOpen = activeSection !== null;
  const sections = useMemo(() => MODAL_SECTIONS, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    stageRef.current?.focus();
  }, [activeSection, isOpen]);

  return (
    <>
      <ModalAssetPreloader />
      <div
        aria-hidden={!isOpen}
        className={`modal-layer ${isOpen ? "modal-layer-open" : ""}`}
      >
        {isOpen ? (
          <>
            <div className="modal-backdrop" onClick={close} />
            <nav className="modal-section-tabs" aria-label="Portfolio sections">
              {sections.map((section) => (
                <button
                  aria-current={
                    activeSection === section.key ? "page" : undefined
                  }
                  key={section.key}
                  onClick={() => openSection(section.key)}
                  type="button"
                >
                  {section.label}
                </button>
              ))}
            </nav>
            <div
              aria-label="Portfolio section panels"
              aria-modal="true"
              className="modal-stage"
              ref={stageRef}
              role="dialog"
              style={
                {
                  "--modal-drag-px": `${dragOffsetPx}px`,
                } as CSSProperties
              }
              tabIndex={-1}
            >
              {sections.map((section, index) => {
                const Section = SECTION_COMPONENTS[section.key];
                const offset = index - activeIndex;

                return (
                  <section
                    aria-hidden={activeSection !== section.key}
                    className="modal-panel"
                    data-active={activeSection === section.key}
                    key={section.key}
                    style={
                      {
                        "--modal-panel-offset": offset,
                      } as CSSProperties
                    }
                  >
                    <div className="modal-panel-frame">
                      <div className="modal-panel-toolbar">
                        <span>File: {section.shortLabel}.modal</span>
                        <button
                          aria-label="Close section"
                          onClick={close}
                          type="button"
                        >
                          [q]
                        </button>
                      </div>
                      <div
                        className="modal-panel-scroll"
                        data-modal-scroll="true"
                      >
                        <Section />
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
