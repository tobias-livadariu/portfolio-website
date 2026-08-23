import { useMemo } from "react";
import { getResponsiveAsciiGlyphSize } from "../../utility/ascii-glyph-size";

interface UseAsciiGlyphSizeOptions {
  baseHeight: number;
  baseWidth: number;
  pixelRatio?: number;
  referenceWidth?: number;
  viewportWidth: number;
}

/** Responsive glyph-cell dimensions for a canvas-backed ASCII renderer. */
export function useAsciiGlyphSize({
  baseHeight,
  baseWidth,
  pixelRatio = 1,
  referenceWidth,
  viewportWidth,
}: UseAsciiGlyphSizeOptions) {
  return useMemo(
    () =>
      getResponsiveAsciiGlyphSize(viewportWidth * pixelRatio, {
        baseHeight,
        baseWidth,
        referenceWidth,
      }),
    [baseHeight, baseWidth, pixelRatio, referenceWidth, viewportWidth],
  );
}
