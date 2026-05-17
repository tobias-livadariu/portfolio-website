import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Props {
  block: readonly string[];
  minGapCh?: number;
  minSideMarginCh?: number;
}

export default function AsciiDivider({
  block,
  minGapCh = 2,
  minSideMarginCh = 1,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLPreElement>(null);
  const chMeasureRef = useRef<HTMLSpanElement>(null);
  const [layout, setLayout] = useState({
    gapPx: 0,
    repeats: 1,
    sideMarginPx: 0,
  });
  const dividerText = useMemo(() => block.join("\n"), [block]);

  const updateLayout = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    const chMeasure = chMeasureRef.current;

    if (!container || !measure || !chMeasure) {
      return;
    }

    const containerWidth = container.clientWidth;
    const unitWidth = measure.getBoundingClientRect().width;
    const chWidth = chMeasure.getBoundingClientRect().width / 10;
    const gapPx = chWidth * minGapCh;
    const sideMarginPx = chWidth * minSideMarginCh;

    if (containerWidth <= 0 || unitWidth <= 0) {
      return;
    }

    const repeats = Math.max(
      1,
      Math.floor(
        (containerWidth - sideMarginPx * 2 + gapPx) / (unitWidth + gapPx),
      ),
    );

    setLayout((current) =>
      current.gapPx === gapPx &&
      current.repeats === repeats &&
      current.sideMarginPx === sideMarginPx
        ? current
        : { gapPx, repeats, sideMarginPx },
    );
  }, [minGapCh, minSideMarginCh]);

  useEffect(() => {
    updateLayout();

    const container = containerRef.current;

    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(updateLayout);
    observer.observe(container);

    void document.fonts?.ready.then(updateLayout);

    return () => {
      observer.disconnect();
    };
  }, [updateLayout]);

  return (
    <div
      className="modal-ascii-divider"
      aria-hidden="true"
      ref={containerRef}
      style={{
        columnGap: `${layout.gapPx}px`,
        paddingInline: `${layout.sideMarginPx}px`,
      }}
    >
      <span className="modal-ascii-divider-ch-measure" ref={chMeasureRef}>
        0000000000
      </span>
      <pre className="modal-ascii-divider-measure" ref={measureRef}>
        {dividerText}
      </pre>
      {Array.from({ length: layout.repeats }, (_, index) => (
        <pre className="modal-ascii-divider-unit" key={index}>
          {dividerText}
        </pre>
      ))}
    </div>
  );
}
