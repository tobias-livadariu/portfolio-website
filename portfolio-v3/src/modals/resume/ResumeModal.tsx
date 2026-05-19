import { memo } from "react";
import type { CSSProperties } from "react";
import publicPath from "../../utility/public-path";
import ModalHeader from "../components/ModalHeader";
import Terminal from "../components/Terminal";
import ResumePdfViewer from "./ResumePdfViewer";
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
          <ResumePdfViewer src={publicPath("/resume.pdf")} />
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
