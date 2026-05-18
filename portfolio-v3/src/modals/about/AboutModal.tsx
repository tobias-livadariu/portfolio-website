import { memo } from "react";
import type { ReactNode } from "react";
import { useAsciiImageRows } from "../components/AsciiImage";
import ModalHeader from "../components/ModalHeader";
import Terminal, { TerminalTranscriptLine } from "../components/Terminal";
import {
  ABOUT_ASCII_TITLE_PIECES,
  ABOUT_DIVIDER,
  ABOUT_SPRITE,
  ABOUT_TERMINAL_CONTEXT,
} from "./about.constants";

const ABOUT_LEFT_SPRITE = {
  ...ABOUT_SPRITE,
  alt: "Mirrored ASCII island planet",
  flipX: true,
} as const;

const ABOUT_RIGHT_SPRITE = {
  ...ABOUT_SPRITE,
  alt: "ASCII island planet",
} as const;

const TOBIFETCH_COLUMNS = 105;
const TOBIFETCH_ROWS = 73;

const TOBIFETCH_INFO_ROWS: Array<{ className?: string; content: ReactNode }> = [
  {
    className: "modal-tobifetch-host",
    content: "tobias@uwaterloo",
  },
  {
    className: "modal-tobifetch-rule",
    content: "----------------",
  },
  { content: "" },
  {
    content: (
      <>
        <span className="modal-tobifetch-key">Name:</span> Tobias Livadariu
      </>
    ),
  },
  {
    content: (
      <>
        <span className="modal-tobifetch-key">School:</span> University of
        Waterloo
      </>
    ),
  },
  {
    content: (
      <>
        <span className="modal-tobifetch-key">Program:</span> Software
        Engineering
      </>
    ),
  },
  {
    content: (
      <>
        <span className="modal-tobifetch-key">Year:</span> second-year
        undergraduate
      </>
    ),
  },
  { content: "" },
  {
    content: (
      <>
        <span className="modal-tobifetch-key">Focus:</span> full-stack systems
      </>
    ),
  },
  {
    content: (
      <>
        <span className="modal-tobifetch-key">AI:</span> LLM products and
        tooling
      </>
    ),
  },
  {
    content: (
      <>
        <span className="modal-tobifetch-key">Frontend:</span> React,
        TypeScript, Redux
      </>
    ),
  },
  {
    content: (
      <>
        <span className="modal-tobifetch-key">Backend:</span> Node, .NET, Rails,
        Flask
      </>
    ),
  },
  {
    content: (
      <>
        <span className="modal-tobifetch-key">Data:</span> SQL, Azure, Docker,
        MongoDB
      </>
    ),
  },
  { content: "" },
  {
    content: (
      <>
        <span className="modal-tobifetch-key">Likes:</span> learning and
        building
      </>
    ),
  },
  {
    content: (
      <>
        <span className="modal-tobifetch-key">Open to:</span> internships and
        feedback
      </>
    ),
  },
];

function renderAsciiRuns(
  runs: readonly { color: string; text: string }[] | undefined,
) {
  const safeRuns =
    runs && runs.length > 0
      ? runs
      : [{ color: "transparent", text: " ".repeat(TOBIFETCH_COLUMNS) }];

  return safeRuns.map((run, index) => (
    <span aria-hidden="true" key={index} style={{ color: run.color }}>
      {run.text}
    </span>
  ));
}

function TobifetchOutput({ firstLineNumber }: { firstLineNumber: number }) {
  const portraitRows = useAsciiImageRows({
    columns: TOBIFETCH_COLUMNS,
    imagePath: "/images/tobias-headshot-2026.png",
    rows: TOBIFETCH_ROWS,
  });

  return (
    <>
      {Array.from({ length: TOBIFETCH_ROWS }, (_, index) => {
        const info = TOBIFETCH_INFO_ROWS[index];

        return (
          <TerminalTranscriptLine
            className={`modal-terminal-line-fetch ${
              info
                ? "modal-terminal-line-fetch-info"
                : "modal-terminal-line-fetch-art-only"
            }`}
            key={index}
            lineNumber={firstLineNumber + index}
          >
            <span className="modal-tobifetch-row">
              <span className="modal-tobifetch-art">
                {renderAsciiRuns(portraitRows[index])}
              </span>
              <span className={`modal-tobifetch-info ${info?.className ?? ""}`}>
                {info?.content === "" ? "\u00a0" : info?.content}
              </span>
            </span>
          </TerminalTranscriptLine>
        );
      })}
    </>
  );
}

function AboutModal() {
  return (
    <article className="modal-section-content">
      <ModalHeader
        dividerBlock={ABOUT_DIVIDER}
        leftSprite={ABOUT_LEFT_SPRITE}
        rightSprite={ABOUT_RIGHT_SPRITE}
        titlePieces={ABOUT_ASCII_TITLE_PIECES}
      />

      <Terminal
        context={ABOUT_TERMINAL_CONTEXT}
        commands={[
          {
            command: "tobifetch",
            output: [
              {
                kind: "block",
                lineCount: TOBIFETCH_ROWS,
                render: (firstLineNumber) => (
                  <TobifetchOutput firstLineNumber={firstLineNumber} />
                ),
              },
            ],
          },
        ]}
      />
    </article>
  );
}

export default memo(AboutModal);
