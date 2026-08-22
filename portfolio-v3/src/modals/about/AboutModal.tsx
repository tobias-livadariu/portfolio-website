import { memo, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  buildRowRuns,
  CHARACTER_CELL_ASPECT,
  useAsciiImageFrame,
  useImageSize,
} from "../components/ascii-image-rows";
import type { ColoredRun } from "../components/ascii-image-rows";
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

const TOBIFETCH_IMAGE_PATH = "/images/cool-photo-of-me.png";
/* Luminance multiplier applied when rasterizing the portrait — raise to
   brighten the ASCII art, lower toward 1 for the original exposure. */
const TOBIFETCH_BRIGHTNESS = 1.25;
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

interface TobifetchLine {
  key?: string;
  kind?: "host" | "rule";
  value: string;
}

/* One entry per rendered line — a `key` renders colored, then the value.
   Values must be single lines so their exact column width is predictable. */
const TOBIFETCH_LINES: readonly TobifetchLine[] = [
  { kind: "host", value: "tlivadar@uwaterloo" },
  { kind: "rule", value: "------------------" },
  { key: "Program:", value: "Software Engineering @ UW" },
  { key: "Name:", value: "Tobias Livadariu" },
  { value: "" },
  { key: "Languages:", value: "Python, Ruby, C#, C++, PHP" },
  { key: "Frontend:", value: "React, TypeScript, Redux, Tailwind, Three.js" },
  {
    key: "Backend:",
    value: "Node, Express, .NET, Rails, Flask, FastAPI, GraphQL, Laravel",
  },
  { key: "Cloud:", value: "Azure, GCP, Docker" },
  { key: "Tools:", value: "Git, WordPress, Figma, Flink" },
  {
    key: "Data",
    value: "SQL, PostgreSQL, MySQL, MongoDB, BigQuery",
  },
  {
    key: "Agents",
    value: "LangChain, LangGraph",
  },
  { value: "" },
  { key: "Open to:", value: "Internships & mentorship" },
];

function tobifetchLineWidth(line: TobifetchLine) {
  return line.value.length + (line.key ? line.key.length + 1 : 0);
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

  if (!line.key) {
    return line.value === "" ? " " : line.value;
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
    brightness: TOBIFETCH_BRIGHTNESS,
    columns: artColumns,
    imagePath: TOBIFETCH_IMAGE_PATH,
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
          <span className="modal-tobifetch-art" style={artWidthStyle}>
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
