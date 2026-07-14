import { memo, useCallback, useMemo, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  buildRowRuns,
  CHARACTER_CELL_ASPECT,
  useAsciiImageFrame,
  useImageSize,
} from "../components/ascii-image-rows";
import type { AsciiCell, AsciiFrame } from "../components/ascii-image-rows";
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

const TOBIFETCH_IMAGE_PATH = "/images/happier-photo-of-me.png";
/* Luminance multiplier applied when rasterizing the portrait — raise to
   brighten the ASCII art, lower toward 1 for the original exposure. */
const TOBIFETCH_BRIGHTNESS = 1.25;
const TOBIFETCH_MIN_COLUMNS = 32;
/* Below this width the stats block would crowd the portrait, so we stack
   the info above the art instead of superimposing it. */
const TOBIFETCH_STACK_BREAKPOINT_PX = 1050;
/* Snap the measured terminal column count to multiples of this value so the
   portrait isn't re-rasterized (canvas getImageData + per-cell sampling) on
   every 1ch fluctuation as the user drags the window. */
const TOBIFETCH_COLUMN_STEP = 4;
/* Overlay placement relative to the art's top-right corner. */
const OVERLAY_MARGIN_TOP = 1;
const OVERLAY_MARGIN_RIGHT = 2;

const OVERLAY_COLORS = {
  host: "var(--dragon-mint)",
  key: "var(--dragon-yellow)",
  rule: "var(--dragon-comment)",
  value: "var(--dragon-fg-bright)",
} as const;

interface TobifetchLine {
  key?: string;
  kind?: "host" | "rule";
  value: string;
}

/* One entry per rendered line — a `key` renders colored, the value after it.
   Values must be single lines; the overlay never wraps them. */
const TOBIFETCH_LINES: readonly TobifetchLine[] = [
  { kind: "host", value: "tobias@uwaterloo" },
  { kind: "rule", value: "----------------" },
  { value: "" },
  { key: "Program:", value: "Software Engineering" },
  { key: "School:", value: "University of Waterloo" },
  { key: "Name:", value: "Tobias Livadariu" },
  { key: "Year:", value: "2nd undergrad" },
  { value: "" },
  { key: "Languages:", value: "Python, Ruby, C#, C++, PHP" },
  { key: "Frontend:", value: "React, TypeScript, Redux, Tailwind, Three.js" },
  {
    key: "Backend:",
    value: "Node, Express, .NET, Rails, Flask, FastAPI, GraphQL, Laravel",
  },
  { key: "Cloud:", value: "Azure, GCP, Docker" },
  { key: "Tools:", value: "Git, WordPress, Figma, Flink" },
  { key: "Data:", value: "SQL, PostgreSQL, MySQL, MongoDB, BigQuery" },
  {
    key: "AI:",
    value:
      "LangChain, LangGraph, Cursor, Claude Code, Codex, OpenCode, Pi Harness",
  },
  { value: "" },
  { key: "Interests:", value: "Cool full-stack systems, novel AI tooling" },
  { key: "Open to:", value: "Internships & mentorship" },
];

interface OverlaySegment {
  color: string;
  text: string;
}

function overlaySegmentsFor(line: TobifetchLine): OverlaySegment[] {
  if (line.kind === "host") {
    return [{ color: OVERLAY_COLORS.host, text: line.value }];
  }

  if (line.kind === "rule") {
    return [{ color: OVERLAY_COLORS.rule, text: line.value }];
  }

  if (!line.key) {
    return line.value ? [{ color: OVERLAY_COLORS.value, text: line.value }] : [];
  }

  return [
    { color: OVERLAY_COLORS.key, text: line.key },
    { color: OVERLAY_COLORS.value, text: ` ${line.value}` },
  ];
}

/**
 * Superimpose the stats block onto the portrait frame, anchored at the
 * art's top-right corner. Lines never wrap; anything that falls outside
 * the image (horizontally or vertically) is clipped.
 */
function applyTobifetchOverlay(frame: AsciiFrame): AsciiFrame {
  if (frame.length === 0) {
    return frame;
  }

  const columns = frame[0].length;
  const lines = TOBIFETCH_LINES.map(overlaySegmentsFor);
  const blockWidth = Math.max(
    ...lines.map((segments) =>
      segments.reduce((sum, segment) => sum + segment.text.length, 0),
    ),
  );
  const left = Math.max(0, columns - OVERLAY_MARGIN_RIGHT - blockWidth);
  const result = frame.map((row) => row.slice());

  lines.forEach((segments, index) => {
    const row = OVERLAY_MARGIN_TOP + index;

    if (row >= result.length) {
      return;
    }

    /* Clear the full block width (plus a 1-char gutter) so the text sits in
       a clean panel knocked out of the art. */
    for (let col = left - 1; col <= left + blockWidth; col += 1) {
      if (col >= 0 && col < columns) {
        result[row][col] = { char: " ", color: "transparent" };
      }
    }

    let cursor = left;

    for (const segment of segments) {
      for (const char of segment.text) {
        if (cursor >= columns) {
          return;
        }

        result[row][cursor] = { char, color: segment.color } as AsciiCell;
        cursor += 1;
      }
    }
  });

  return result;
}

function useMatchesMaxWidth(maxWidthPx: number) {
  const query = `(max-width: ${maxWidthPx - 1}px)`;

  const subscribe = useCallback(
    (notify: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", notify);
      return () => mediaQueryList.removeEventListener("change", notify);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [
    query,
  ]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

function stackedInfoContent(line: TobifetchLine): ReactNode {
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
  runs: readonly { color: string; text: string }[] | undefined,
  width: number,
) {
  const safeRuns =
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
  const isStacked = useMatchesMaxWidth(TOBIFETCH_STACK_BREAKPOINT_PX);

  /* The art fills the terminal: every measured column, with the row count
     derived from the image's intrinsic resolution. */
  const imageSize = useImageSize(TOBIFETCH_IMAGE_PATH);
  const artColumns = Math.max(TOBIFETCH_MIN_COLUMNS, availableColumns);
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
    if (portraitFrame.length === 0) {
      return [];
    }

    const frame = isStacked
      ? portraitFrame
      : applyTobifetchOverlay(portraitFrame);

    return frame.map(buildRowRuns);
  }, [isStacked, portraitFrame]);

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

  const infoLineCount = isStacked ? TOBIFETCH_LINES.length : 0;
  const artLineCount = imageSize ? artRows : 0;

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
              {stackedInfoContent(line)}
            </span>
          </TerminalTranscriptLine>
        ))}
      {Array.from({ length: artLineCount }, (_, index) => (
        <TerminalTranscriptLine
          className="modal-terminal-line-fetch"
          key={`art-${index}`}
          lineNumber={firstLineNumber + infoLineCount + index}
        >
          <span className="modal-tobifetch-art" style={artWidthStyle}>
            {renderAsciiRuns(artRowRuns[index], artColumns)}
          </span>
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
