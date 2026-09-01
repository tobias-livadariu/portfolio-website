import { Suspense, lazy, memo, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useBackgroundMode } from "../../background/background-mode-core";
import publicPath from "../../utility/public-path";
import ModalHeader from "../components/ModalHeader";
import Terminal from "../components/Terminal";
import preloadResumePdfViewer from "./preload-resume-pdf-viewer";
import {
  RESUME_ASCII_TITLE_PIECES,
  RESUME_DIVIDER,
  RESUME_DRIVE_ID,
  RESUME_PREVIEW_MARGIN,
  RESUME_SPRITE,
  RESUME_TERMINAL_CONTEXT,
} from "./resume.constants";

const RESUME_LEFT_SPRITE = {
  ...RESUME_SPRITE,
  alt: "Mirrored ASCII asteroid",
  flipX: true,
} as const;

const RESUME_RIGHT_SPRITE = {
  ...RESUME_SPRITE,
  alt: "ASCII asteroid",
} as const;

const OPEN_SRC = `https://drive.google.com/file/d/${RESUME_DRIVE_ID}/view`;
const DOWNLOAD_SRC = `https://drive.google.com/uc?export=download&id=${RESUME_DRIVE_ID}`;
const ResumePdfViewer = lazy(preloadResumePdfViewer);

function ResumePdfPlaceholder() {
  return (
    <div
      aria-live="polite"
      className="modal-resume-pdf-placeholder"
      role="status"
    >
      Preparing resume preview…
    </div>
  );
}

function ProgressiveResumePdfViewer({ src }: { src: string }) {
  const { isInitialRevealComplete } = useBackgroundMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const container = containerRef.current;

    if (!isInitialRevealComplete || !container) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      const timeoutId = window.setTimeout(() => setShouldRender(true), 0);
      return () => window.clearTimeout(timeoutId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      /* One viewport of lead time normally covers the About to Resume scroll,
         while keeping PDF parsing/rendering out of the startup critical path. */
      { rootMargin: "100% 0px" },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [isInitialRevealComplete]);

  return (
    <div className="modal-resume-pdf-deferred" ref={containerRef}>
      {shouldRender ? (
        <Suspense fallback={<ResumePdfPlaceholder />}>
          <ResumePdfViewer src={src} />
        </Suspense>
      ) : (
        <ResumePdfPlaceholder />
      )}
    </div>
  );
}

function ResumeOpenPanel() {
  return (
    <div
      className="modal-open-panel modal-resume-viewer"
      style={
        {
          "--modal-resume-preview-margin": RESUME_PREVIEW_MARGIN,
        } as CSSProperties
      }
    >
      <div className="modal-resume-shell">
        <div className="modal-resume-document">
          <ProgressiveResumePdfViewer src={publicPath("/resume.pdf")} />
        </div>
      </div>
      <div className="modal-action-row">
        <a href={OPEN_SRC} rel="noreferrer" target="_blank">
          [ OPEN IN GOOGLE DRIVE ]
        </a>
        <a href={DOWNLOAD_SRC}>[ DOWNLOAD PDF ]</a>
        <a href={publicPath("/resume.pdf")} rel="noreferrer" target="_blank">
          [ VIEW LOCAL FALLBACK ]
        </a>
      </div>
    </div>
  );
}

function ResumeModal() {
  return (
    <article className="modal-section-content">
      <ModalHeader
        dividerBlock={RESUME_DIVIDER}
        leftSprite={RESUME_LEFT_SPRITE}
        rightSprite={RESUME_RIGHT_SPRITE}
        titleGapFirstCh={3}
        titleGapSecondCh={1}
        titlePieces={RESUME_ASCII_TITLE_PIECES}
      />

      <Terminal
        context={RESUME_TERMINAL_CONTEXT}
        commands={[
          {
            command: "open resume.html",
            output: [
              {
                kind: "block",
                lineCount: 0,
                render: () => <ResumeOpenPanel />,
              },
            ],
          },
        ]}
      />
    </article>
  );
}

export default memo(ResumeModal);
