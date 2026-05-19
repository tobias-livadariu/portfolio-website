import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ASCII_FRAME_CACHE,
  buildRowRuns,
  flipFrame,
  loadAsciiFrames,
  rotateFrame,
} from "./ascii-image-rows";
import type { AsciiFrame } from "./ascii-image-rows";

interface Props {
  alt: string;
  atlasKey?: string;
  className?: string;
  columns: number;
  imagePath: string;
  flipX?: boolean;
  flipY?: boolean;
  intervalMs?: number;
  jsonPath?: string;
  rotateQuarterTurns?: number;
  rows: number;
}

function AsciiImage(props: Props) {
  const {
    alt,
    atlasKey,
    className,
    columns,
    flipX = false,
    flipY = false,
    imagePath,
    intervalMs = 140,
    jsonPath,
    rotateQuarterTurns = 0,
    rows,
  } = props;
  const [frames, setFrames] = useState<AsciiFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const imageRef = useRef<HTMLPreElement>(null);
  const cacheKey = useMemo(
    () => `${imagePath}|${jsonPath ?? ""}|${atlasKey ?? ""}|${columns}|${rows}`,
    [atlasKey, columns, imagePath, jsonPath, rows],
  );

  useEffect(() => {
    let isMounted = true;
    let promise = ASCII_FRAME_CACHE.get(cacheKey);

    if (!promise) {
      promise = loadAsciiFrames({
        atlasKey,
        columns,
        imagePath,
        jsonPath,
        rows,
      });
      ASCII_FRAME_CACHE.set(cacheKey, promise);
    }

    void promise.then((nextFrames) => {
      if (isMounted) {
        setFrames(nextFrames);
        setFrameIndex(0);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [atlasKey, cacheKey, columns, imagePath, jsonPath, rows]);

  useEffect(() => {
    const element = imageRef.current;

    if (!element || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(Boolean(entry?.isIntersecting));
      },
      { rootMargin: "160px 0px" },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isVisible || frames.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % frames.length);
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [frames.length, intervalMs, isVisible]);

  const displayFrame = useMemo(() => {
    const source = frames[frameIndex];

    if (!source) {
      return [] as AsciiFrame;
    }

    return flipFrame(rotateFrame(source, rotateQuarterTurns), flipX, flipY);
  }, [flipX, flipY, frameIndex, frames, rotateQuarterTurns]);

  const rowRuns = useMemo(
    () => displayFrame.map(buildRowRuns),
    [displayFrame],
  );

  return (
    <pre
      aria-label={alt}
      className={`modal-ascii-image ${className ?? ""}`.trim()}
      ref={imageRef}
    >
      {rowRuns.map((runs, rowIndex) => (
        <span className="modal-ascii-image-line" key={rowIndex}>
          {runs.map((run, runIndex) => (
            <span
              aria-hidden="true"
              key={runIndex}
              style={{ color: run.color }}
            >
              {run.text}
            </span>
          ))}
          {"\n"}
        </span>
      ))}
    </pre>
  );
}

export default memo(AsciiImage);
