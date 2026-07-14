import { useDeferredValue, useMemo } from "react";
import { useAsciiLogoStamps } from "./ascii-image-rows";
import { composeLogoBounceScene } from "./ascii-story";
import { TerminalTranscriptLine } from "./Terminal";
import { useTerminalContentColumns } from "./use-terminal-content-columns";

interface Props {
  blurbs: readonly string[];
  firstLineNumber: number;
  /** Public path of the logo that bounces through the scene. */
  logoPath: string;
  /** Optional luminance boost applied when rasterizing the logo. */
  logoBrightness?: number;
  seed: string;
  /** Explosion ink hue: mint for Shopify, cyan for IdeaNotion. */
  theme: "mint" | "cyan";
}

/** Spin schedule: one entry per stamp drawn along the flights, in order. */
const SPIN_ANGLES = Array.from({ length: 14 }, (_, index) => index * 38);

export default function AsciiStoryScene({
  blurbs,
  firstLineNumber,
  logoPath,
  logoBrightness = 1,
  seed,
  theme,
}: Props) {
  const { columns, measureRef, wrapperRef } = useTerminalContentColumns({
    fallback: 72,
    min: 22,
    step: 2,
  });
  /* Same deferral trick as the old wrapped output: regenerate the scene on
     an idle follow-up render instead of every resize frame. */
  const deferredColumns = useDeferredValue(columns);
  const logoColumns =
    Math.round(Math.min(26, Math.max(14, deferredColumns * 0.17)) / 2) * 2;
  const stamps = useAsciiLogoStamps({
    angles: SPIN_ANGLES,
    brightness: logoBrightness,
    columns: logoColumns,
    imagePath: logoPath,
  });

  const rows = useMemo(() => {
    if (!stamps) {
      return null;
    }

    return composeLogoBounceScene({
      blurbs,
      columns: deferredColumns,
      seed,
      stamps,
    });
  }, [blurbs, deferredColumns, seed, stamps]);

  return (
    <div
      className={`modal-terminal-wrapped-output modal-ascii-story modal-ascii-story-${theme}`}
      ref={wrapperRef}
    >
      <span className="modal-terminal-ch-measure" ref={measureRef}>
        000000000000000000000000
      </span>
      {rows?.map((segments, index) => (
        <TerminalTranscriptLine
          className="modal-terminal-line-story"
          key={index}
          lineNumber={firstLineNumber + index}
        >
          {segments.map((segment, segmentIndex) => {
            if (segment.color) {
              return (
                <span key={segmentIndex} style={{ color: segment.color }}>
                  {segment.text}
                </span>
              );
            }

            if (segment.className) {
              return (
                <span
                  className={`modal-ink-${segment.className}`}
                  key={segmentIndex}
                >
                  {segment.text}
                </span>
              );
            }

            return segment.text;
          })}
        </TerminalTranscriptLine>
      ))}
    </div>
  );
}
