import { memo, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  buildRowRuns,
  CHARACTER_CELL_ASPECT,
  useAsciiImageFrame,
  useImageSize,
} from "../components/ascii-image-rows";
import type { ColoredRun } from "../components/ascii-image-rows";
import { STATIC_ASCII_PROFILES } from "../components/ascii-image-profiles";
import ModalHeader from "../components/ModalHeader";
import Terminal, { TerminalTranscriptLine } from "../components/Terminal";
import { useTerminalContentColumns } from "../components/terminal-outputs";
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

const TOBIFETCH_IMAGE_PATH = "/images/cool-photo-of-me.webp";
const TOBIFETCH_MIN_COLUMNS = 32;
/* Side-by-side mode reserves the exact info width and a fixed gutter. It is
   only used while the remaining portrait is still large enough to read. */
const TOBIFETCH_INFO_GAP_COLUMNS = 0;
const TOBIFETCH_INFO_MARGIN_TOP_ROWS = 1;
const TOBIFETCH_MIN_SIDE_BY_SIDE_PORTRAIT_COLUMNS = 48;
/* Snap the measured terminal column count to multiples of this value so the
   portrait isn't re-rasterized (canvas getImageData + per-cell sampling) on
   every 1ch fluctuation as the user drags the window. */
const TOBIFETCH_COLUMN_STEP = 4;

type TobifetchMessagePart =
  | string
  | { textCyan: string }
  | { textPurple: string }
  | { textRed: string };

type TobifetchLine =
  | { kind: "field"; key: string; value: string }
  | { kind: "host"; value: string }
  | { kind: "message"; parts: readonly TobifetchMessagePart[] }
  | { kind: "rule"; value: string }
  | { kind: "spacer" };

/* Message parts render in array order. Plain strings use cyan by default;
   textCyan, textPurple, and textRed add explicit color spans on one line. */
const TOBIFETCH_LINES: readonly TobifetchLine[] = [
  { kind: "host", value: "tlivadar@uwaterloo" },
  { kind: "rule", value: "------------------" },
  {
    kind: "field",
    key: "Program:",
    value: "Software Engineering @ UW",
  },
  { kind: "field", key: "Name:", value: "Tobias Livadariu" },
  { kind: "spacer" },
  {
    kind: "message",
    parts: ["Hello dear reader! \\n"],
  },
  {
    kind: "message",
    parts: [{ textPurple: "My name is Tobi \\n" }],
  },
  {
    kind: "message",
    parts: [{ textRed: "and I deeply appreciate you taking the time \\n" }],
  },
  {
    kind: "message",
    parts: [{ textPurple: "to check out my website. \\n" }],
  },
  {
    kind: "message",
    parts: [":) \\n\\n"],
  },
  { kind: "spacer" },
  {
    kind: "message",
    parts: ["I've included \\n"],
  },
  {
    kind: "message",
    parts: [{ textPurple: "a brief summary \\n" }],
  },
  {
    kind: "message",
    parts: ["of my technical skills \\n"],
  },
  {
    kind: "message",
    parts: [{ textPurple: "below: \\n\\n" }],
  },
  { kind: "spacer" },
  {
    kind: "field",
    key: "Languages:",
    value: "Python, Ruby, C#, C++, PHP",
  },
  {
    kind: "field",
    key: "Frontend:",
    value: "React, TypeScript, Redux, Tailwind, Three.js",
  },
  {
    kind: "field",
    key: "Backend:",
    value: "Node, Express, .NET, Rails, Flask, FastAPI, GraphQL, Laravel",
  },
  { kind: "field", key: "Cloud:", value: "Azure, GCP, Docker" },
  {
    kind: "field",
    key: "Tools:",
    value: "Git, WordPress, Figma, Flink",
  },
  {
    kind: "field",
    key: "Data:",
    value: "SQL, PostgreSQL, MySQL, MongoDB, BigQuery",
  },
  {
    kind: "field",
    key: "Agents:",
    value: "LangChain, LangGraph",
  },
  { kind: "spacer" },
  {
    kind: "message",
    parts: ["Further down, \\n"],
  },
  {
    kind: "message",
    parts: [{ textPurple: "you can find information \\n" }],
  },
  {
    kind: "message",
    parts: [{ textRed: "about my past experience, \\n" }],
  },
  {
    kind: "message",
    parts: [{ textPurple: "future goals, \\n" }],
  },
  {
    kind: "message",
    parts: ["and current resume. \\n\\n"],
  },
  { kind: "spacer" },
  {
    kind: "message",
    parts: [{ textRed: "Thanks again, \\n" }],
  },
  {
    kind: "message",
    parts: [{ textRed: "and I hope you have \\n" }],
  },
  {
    kind: "message",
    parts: [{ textRed: "a wonderful day. ^D" }],
  },
];

function tobifetchMessagePartText(part: TobifetchMessagePart) {
  if (typeof part === "string") {
    return part;
  }

  if ("textCyan" in part) {
    return part.textCyan;
  }

  if ("textPurple" in part) {
    return part.textPurple;
  }

  return part.textRed;
}

function tobifetchMessagePartColor(part: TobifetchMessagePart) {
  if (typeof part === "string" || "textCyan" in part) {
    return "cyan";
  }

  return "textPurple" in part ? "purple" : "red";
}

function tobifetchLineWidth(line: TobifetchLine) {
  if (line.kind === "spacer") {
    return 0;
  }

  if (line.kind === "message") {
    return line.parts.reduce(
      (width, part) => width + tobifetchMessagePartText(part).length,
      0,
    );
  }

  return line.value.length + (line.kind === "field" ? line.key.length + 1 : 0);
}

const TOBIFETCH_INFO_COLUMNS = Math.max(
  ...TOBIFETCH_LINES.map(tobifetchLineWidth),
);

function tobifetchInfoContent(line: TobifetchLine): ReactNode {
  if (line.kind === "host") {
    return <span className="modal-tobifetch-host">{line.value}</span>;
  }

  if (line.kind === "rule") {
    return <span className="modal-tobifetch-rule">{line.value}</span>;
  }

  if (line.kind === "spacer") {
    return " ";
  }

  if (line.kind === "message") {
    return line.parts.map((part, index) => (
      <span
        className={`modal-tobifetch-text-${tobifetchMessagePartColor(part)}`}
        key={index}
      >
        {tobifetchMessagePartText(part)}
      </span>
    ));
  }

  return (
    <>
      <span className="modal-tobifetch-key">{line.key}</span> {line.value}
    </>
  );
}

function renderAsciiRuns(
  runs: readonly ColoredRun[] | undefined,
  width: number,
) {
  const safeRuns: readonly ColoredRun[] =
    runs && runs.length > 0
      ? runs
      : [{ color: "transparent", text: " ".repeat(width) }];

  return safeRuns.map((run, index) => (
    <span aria-hidden="true" key={index} style={{ color: run.color }}>
      {run.text}
    </span>
  ));
}

function TobifetchOutput({ firstLineNumber }: { firstLineNumber: number }) {
  const {
    wrapperRef,
    measureRef,
    columns: availableColumns,
  } = useTerminalContentColumns({
    fallback: 131,
    min: TOBIFETCH_MIN_COLUMNS,
    step: TOBIFETCH_COLUMN_STEP,
  });

  const sideBySidePortraitColumns =
    availableColumns - TOBIFETCH_INFO_GAP_COLUMNS - TOBIFETCH_INFO_COLUMNS;
  const isStacked =
    sideBySidePortraitColumns < TOBIFETCH_MIN_SIDE_BY_SIDE_PORTRAIT_COLUMNS;

  /* In side-by-side mode the portrait is rasterized only into the columns
     left after reserving the info block, so the two can never overlap. */
  const imageSize = useImageSize(TOBIFETCH_IMAGE_PATH);
  const artColumns = isStacked ? availableColumns : sideBySidePortraitColumns;
  const artRows = imageSize
    ? Math.max(
        1,
        Math.round(
          artColumns *
            (imageSize.height / imageSize.width) *
            CHARACTER_CELL_ASPECT,
        ),
      )
    : 1;

  const portraitFrame = useAsciiImageFrame({
    columns: artColumns,
    imagePath: TOBIFETCH_IMAGE_PATH,
    profile: STATIC_ASCII_PROFILES.tobifetchPortrait,
    rows: imageSize ? artRows : 1,
  });

  const artRowRuns = useMemo(() => {
    return portraitFrame.map(buildRowRuns);
  }, [portraitFrame]);

  const artWidthStyle = { width: `${artColumns}ch` } as CSSProperties;

  const measureProbe = (
    <div
      className="modal-tobifetch-measure"
      ref={wrapperRef}
      aria-hidden="true"
    >
      <span ref={measureRef}>000000000000000000000000</span>
    </div>
  );

  const portraitLineCount = imageSize ? artRows : 0;
  const precedingInfoLineCount = isStacked ? TOBIFETCH_LINES.length : 0;
  const combinedLineCount = Math.max(
    portraitLineCount,
    TOBIFETCH_INFO_MARGIN_TOP_ROWS + TOBIFETCH_LINES.length,
  );
  const artLineCount = isStacked ? portraitLineCount : combinedLineCount;

  return (
    <>
      {measureProbe}
      {isStacked &&
        TOBIFETCH_LINES.map((line, index) => (
          <TerminalTranscriptLine
            className="modal-terminal-line-tobifetch-stacked-info"
            key={`info-${index}`}
            lineNumber={firstLineNumber + index}
          >
            <span className="modal-tobifetch-info">
              {tobifetchInfoContent(line)}
            </span>
          </TerminalTranscriptLine>
        ))}
      {Array.from({ length: artLineCount }, (_, index) => (
        <TerminalTranscriptLine
          className={`modal-terminal-line-fetch ${
            isStacked ? "" : "modal-terminal-line-tobifetch-side-by-side"
          }`.trim()}
          key={`art-${index}`}
          lineNumber={firstLineNumber + precedingInfoLineCount + index}
        >
          <span
            className="modal-tobifetch-art"
            data-ascii-profile={STATIC_ASCII_PROFILES.tobifetchPortrait.id}
            style={artWidthStyle}
          >
            {renderAsciiRuns(artRowRuns[index], artColumns)}
          </span>
          {!isStacked && (
            <>
              <span aria-hidden="true">
                {" ".repeat(TOBIFETCH_INFO_GAP_COLUMNS)}
              </span>
              {index >= TOBIFETCH_INFO_MARGIN_TOP_ROWS &&
                index <
                  TOBIFETCH_INFO_MARGIN_TOP_ROWS + TOBIFETCH_LINES.length && (
                  <span className="modal-tobifetch-info">
                    {tobifetchInfoContent(
                      TOBIFETCH_LINES[index - TOBIFETCH_INFO_MARGIN_TOP_ROWS],
                    )}
                  </span>
                )}
            </>
          )}
        </TerminalTranscriptLine>
      ))}
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
                lineCount: 0,
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
