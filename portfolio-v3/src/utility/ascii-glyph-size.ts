export const ASCII_GLYPH_REFERENCE_WIDTH_PX = 1920;
export const ASCII_GLYPH_MIN_WIDTH_PX = 3;
export const ASCII_GLYPH_MIN_HEIGHT_PX = 5;

interface ResponsiveAsciiGlyphSizeOptions {
  baseHeight: number;
  baseWidth: number;
  minHeight?: number;
  minWidth?: number;
  referenceWidth?: number;
}

export interface ResponsiveAsciiGlyphSize {
  height: number;
  scale: number;
  width: number;
}

/**
 * Scales a pixel-grid glyph cell with render-target width. At the reference
 * width the base dimensions are used; at half that width both dimensions are
 * halved, keeping the approximate number of glyph columns stable.
 */
export function getResponsiveAsciiGlyphSize(
  renderWidth: number,
  {
    baseHeight,
    baseWidth,
    minHeight = ASCII_GLYPH_MIN_HEIGHT_PX,
    minWidth = ASCII_GLYPH_MIN_WIDTH_PX,
    referenceWidth = ASCII_GLYPH_REFERENCE_WIDTH_PX,
  }: ResponsiveAsciiGlyphSizeOptions,
): ResponsiveAsciiGlyphSize {
  const safeReferenceWidth = Math.max(1, referenceWidth);
  const responsiveScale = Math.max(0, renderWidth) / safeReferenceWidth;
  const scale = Math.max(
    responsiveScale,
    minWidth / Math.max(1, baseWidth),
    minHeight / Math.max(1, baseHeight),
  );

  return {
    height: Math.round(baseHeight * scale),
    scale,
    width: Math.round(baseWidth * scale),
  };
}
