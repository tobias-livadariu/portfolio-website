import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ASCII_FRAME_CACHE,
  ASCII_PREVIEW_FRAME_CACHE,
  buildRowRuns,
  flipFrame,
  getAsciiFrameCacheKey,
  loadAsciiFrames,
  loadAsciiPreviewFrame,
  rotateFrame,
} from "./ascii-image-rows";
import type { AsciiFrame } from "./ascii-image-rows";
import type { AsciiImageProfile } from "./ascii-image-profiles";

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
  profile: AsciiImageProfile;
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
    profile,
    rotateQuarterTurns = 0,
    rows,
  } = props;
  const [frames, setFrames] = useState<AsciiFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const imageRef = useRef<HTMLPreElement>(null);
  const frameRequest = useMemo(
    () => ({ atlasKey, columns, imagePath, jsonPath, profile, rows }),
    [atlasKey, columns, imagePath, jsonPath, profile, rows],
  );
  const cacheKey = useMemo(
    () => getAsciiFrameCacheKey(frameRequest),
    [frameRequest],
  );

  useEffect(() => {
    let isMounted = true;
    let previewPromise = ASCII_PREVIEW_FRAME_CACHE.get(cacheKey);

    if (!previewPromise) {
      previewPromise = loadAsciiPreviewFrame(frameRequest);
      ASCII_PREVIEW_FRAME_CACHE.set(cacheKey, previewPromise);
    }

    void previewPromise.then((previewFrame) => {
      if (isMounted) {
        setFrames((current) =>
          current.length === 0 ? [previewFrame] : current,
        );
      }
    });

    return () => {
      isMounted = false;
    };
  }, [cacheKey, frameRequest]);

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
    if (!isVisible) {
      return;
    }

    let isMounted = true;
    let promise = ASCII_FRAME_CACHE.get(cacheKey);

    if (!promise) {
      promise = loadAsciiFrames(frameRequest);
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
  }, [cacheKey, frameRequest, isVisible]);

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

  const rowRuns = useMemo(() => displayFrame.map(buildRowRuns), [displayFrame]);

  return (
    <pre
      aria-label={alt}
      className={`modal-ascii-image ${className ?? ""}`.trim()}
      data-ascii-profile={profile.id}
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
