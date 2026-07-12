import { useDeferredValue, useMemo } from "react";
import {
  composeInkBounceScene,
  composeInkWalkScene,
  type SceneRow,
} from "./ascii-story";
import { TerminalTranscriptLine } from "./Terminal";
import { useTerminalContentColumns } from "./use-terminal-content-columns";

export type AsciiStoryKind = "walk" | "bounce";

interface Props {
  blurbs: readonly string[];
  firstLineNumber: number;
  kind: AsciiStoryKind;
  seed: string;
  /** Scene ink hue: mint for the Shopify walk, cyan for the IdeaNotion ball. */
  theme: "mint" | "cyan";
}

function composeScene(
  kind: AsciiStoryKind,
  columns: number,
  blurbs: readonly string[],
  seed: string,
): SceneRow[] {
  if (kind === "walk") {
    return composeInkWalkScene(columns, [blurbs[0], blurbs[1]], seed);
  }

  return composeInkBounceScene(columns, [blurbs[0], blurbs[1], blurbs[2]], seed);
}

export default function AsciiStoryScene({
  blurbs,
  firstLineNumber,
  kind,
  seed,
  theme,
}: Props) {
  const { columns, measureRef, wrapperRef } = useTerminalContentColumns({
    fallback: 72,
    min: 22,
    step: 2,
  });
  /* Same deferral trick as WrappedTextOutput: regenerate the scene on an
     idle follow-up render instead of every resize frame. */
  const deferredColumns = useDeferredValue(columns);
  const rows = useMemo(
    () => composeScene(kind, deferredColumns, blurbs, seed),
    [blurbs, deferredColumns, kind, seed],
  );

  return (
    <div
      className={`modal-terminal-wrapped-output modal-ascii-story modal-ascii-story-${theme}`}
      ref={wrapperRef}
    >
      <span className="modal-terminal-ch-measure" ref={measureRef}>
        000000000000000000000000
      </span>
      {rows.map((segments, index) => (
        <TerminalTranscriptLine
          className="modal-terminal-line-story"
          key={index}
          lineNumber={firstLineNumber + index}
        >
          {segments.map((segment, segmentIndex) =>
            segment.className ? (
              <span
                className={`modal-ink-${segment.className}`}
                key={segmentIndex}
              >
                {segment.text}
              </span>
            ) : (
              segment.text
            ),
          )}
        </TerminalTranscriptLine>
      ))}
    </div>
  );
}
