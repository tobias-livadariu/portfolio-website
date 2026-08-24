import { useMemo } from "react";
import { getResponsiveAsciiGlyphSize } from "../../utility/ascii-glyph-size";

/**
 * Responsive behavior shared only by the transparent ASCII canvases inside
 * the portfolio modal. These values are deliberately independent from the
 * full-page ASCII filter in `postprocessing/AsciiPass.ts`.
 */
export const PORTFOLIO_ASCII_GLYPH_SIZE_TUNING = {
  // Largest allowed multiplier for glyph cells on extremely wide canvases.
  maximumScale: 3,
  // Smallest physical height of one glyph cell in render-target pixels.
  minimumCellHeightPx: 5,
  // Smallest physical width of one glyph cell in render-target pixels.
  minimumCellWidthPx: 3,
  // Render-target width where each scene's configured base cell size is used.
  referenceRenderWidthPx: 1920,
  // 1 is linear scaling; lower values make glyphs grow more slowly on wide screens.
  renderWidthScaleExponent: 1,
} as const;

interface UsePortfolioAsciiGlyphSizeOptions {
  baseHeight: number;
  baseWidth: number;
  pixelRatio?: number;
  viewportWidth: number;
}

/** Responsive glyph-cell dimensions for portfolio-modal ASCII renderers. */
export function usePortfolioAsciiGlyphSize({
  baseHeight,
  baseWidth,
  pixelRatio = 1,
  viewportWidth,
}: UsePortfolioAsciiGlyphSizeOptions) {
  return useMemo(
    () =>
      getResponsiveAsciiGlyphSize(viewportWidth * pixelRatio, {
        baseHeight,
        baseWidth,
        maxScale: PORTFOLIO_ASCII_GLYPH_SIZE_TUNING.maximumScale,
        minHeight: PORTFOLIO_ASCII_GLYPH_SIZE_TUNING.minimumCellHeightPx,
        minWidth: PORTFOLIO_ASCII_GLYPH_SIZE_TUNING.minimumCellWidthPx,
        referenceWidth:
          PORTFOLIO_ASCII_GLYPH_SIZE_TUNING.referenceRenderWidthPx,
        scaleExponent:
          PORTFOLIO_ASCII_GLYPH_SIZE_TUNING.renderWidthScaleExponent,
      }),
    [baseHeight, baseWidth, pixelRatio, viewportWidth],
  );
}
