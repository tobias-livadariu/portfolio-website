import { useLayoutEffect, useRef, useState } from "react";

type Props = {
  color?: string;      // symbol color
  fontSize?: number;   // px
  gap?: number;        // px between symbols (visual spacing)
  className?: string;
  active?: boolean;    // when false, skip measuring (lazy)
};

/**
 * HorizontalHashedLine
 * Renders a single row of ASCII: & - # - # - ... - &
 * - Non-wrapping, clipped overflow (no horizontal scroll)
 * - Accurate width fit calculated with an offscreen canvas
 * - Recomputes on container/viewport resize
 */
export default function HorizontalHashedLine({
  color = "#f7d8c0",
  fontSize = 16,
  gap = 2,
  className = "",
  active = true,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState("&"); // minimal fallback

  // single offscreen canvas (no DOM reflow)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  if (!canvasRef.current) canvasRef.current = document.createElement("canvas");

  // Build a line that fits width w, ending with "- &"
  const build = (w: number) => {
    const ctx = canvasRef.current!.getContext("2d")!;
    // Use the actual font family that will be rendered
    ctx.font = `${fontSize}px "Press Start 2P", monospace`;
    ctx.textBaseline = "alphabetic";

    const widthOf = (s: string) => ctx.measureText(s).width;
    const gapW = Math.max(0, gap);

    // Calculate the total width of a string with letter-spacing
    const calculateTotalWidth = (str: string) => {
      if (str.length === 0) return 0;
      let total = widthOf(str);
      // Add gaps between characters (letter-spacing effect)
      if (str.length > 1) {
        total += gapW * (str.length - 1);
      }
      return total;
    };

    // Start with minimal pattern: "& -"
    let pattern = "&-";
    let totalWidth = calculateTotalWidth(pattern);

    // If even the minimal pattern doesn't fit, return just "&"
    if (totalWidth > w) {
      return "&";
    }

    // Add "# -" pairs while we can still fit the final "&"
    while (true) {
      // Try adding another "# -" pair
      const testPattern = pattern + "#-";
      const testWidth = calculateTotalWidth(testPattern);
      
      // Check if we can still add the final "&"
      const finalPattern = testPattern + "&";
      const finalWidth = calculateTotalWidth(finalPattern);
      
      if (finalWidth <= w) {
        pattern = testPattern;
        totalWidth = testWidth;
      } else {
        break;
      }
    }

    // Add the final "&"
    pattern += "&";
    
    return pattern;
  };

  useLayoutEffect(() => {
    if (!active) return; // lazy: no compute until activated

    const calc = () => {
      const el = wrapRef.current;
      if (!el) return;
      // clientWidth is what we can fill with no scrollbars
      const w = el.clientWidth;
      setLine(build(w));
    };

    // initial
    requestAnimationFrame(calc);

    // observe container
    const ro = new ResizeObserver(() => requestAnimationFrame(calc));
    if (wrapRef.current) ro.observe(wrapRef.current);

    // observe viewport
    const onWin = () => requestAnimationFrame(calc);
    window.addEventListener("resize", onWin);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWin);
    };
  }, [active, fontSize, gap]);

  return (
    <div
      ref={wrapRef}
      className={`w-full overflow-hidden ${className}`}
      style={{
        // Prevent layout trashing outside
        contain: "content",
      }}
      aria-hidden="true"
    >
      <div
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: `${fontSize}px`,
          lineHeight: 1,
          color,
          // critical: no wrapping, clip if too long
          whiteSpace: "nowrap",
          textOverflow: "clip",
          overflow: "hidden",
          // visual spacing handled by letter-spacing;
          // our width math already accounted for gapW
          letterSpacing: `${gap}px`,
          // unselectable
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
          textRendering: "optimizeSpeed",
        }}
      >
        {line}
      </div>
    </div>
  );
}
