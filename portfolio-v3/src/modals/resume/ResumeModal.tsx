import { memo } from "react";
import publicPath from "../../utility/public-path";
import ModalHeader from "../components/ModalHeader";
import Terminal, { TerminalTranscriptLine } from "../components/Terminal";
import {
  RESUME_ASCII_TITLE_PIECES,
  RESUME_DIVIDER,
  RESUME_DRIVE_ID,
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

function ResumeCatimgOutput({ firstLineNumber }: { firstLineNumber: number }) {
  return (
    <TerminalTranscriptLine
      className="modal-terminal-line-catimg"
      lineNumber={firstLineNumber}
    >
      <img
        alt="Tobias Livadariu resume rendered as terminal image output"
        className="modal-resume-catimg"
        src={publicPath("/images/resume-preview.png")}
      />
    </TerminalTranscriptLine>
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
            command: "catimg resume.pdf",
            output: [
              {
                kind: "block",
                lineCount: 1,
                render: (firstLineNumber) => (
                  <ResumeCatimgOutput firstLineNumber={firstLineNumber} />
                ),
              },
              {
                className: "modal-terminal-line-links",
                content: (
                  <>
                    <span className="modal-terminal-note">open:</span>{" "}
                    <a href={OPEN_SRC} rel="noreferrer" target="_blank">
                      google drive
                    </a>{" "}
                    <span className="modal-terminal-note">|</span>{" "}
                    <a href={DOWNLOAD_SRC}>DOWNLOAD PDF</a>{" "}
                    <span className="modal-terminal-note">|</span>{" "}
                    <a
                      href={publicPath("/resume.pdf")}
                      rel="noreferrer"
                      target="_blank"
                    >
                      local pdf
                    </a>
                  </>
                ),
              },
            ],
          },
        ]}
      />
    </article>
  );
}

export default memo(ResumeModal);
