export const ASCII_GLYPH_REFERENCE_WIDTH_PX = 1920;
export const ASCII_GLYPH_MIN_WIDTH_PX = 3;
export const ASCII_GLYPH_MIN_HEIGHT_PX = 5;

export interface ResponsiveAsciiGlyphSizeOptions {
  baseHeight: number;
  baseWidth: number;
  maxScale?: number;
  minHeight?: number;
  minWidth?: number;
  referenceWidth?: number;
  scaleExponent?: number;
}

export interface ResponsiveAsciiGlyphSize {
  height: number;
  scale: number;
  width: number;
}

/**
 * Scales a pixel-grid glyph cell with render-target width. At the reference
 * width the base dimensions are used. An exponent of 1 keeps the approximate
 * number of glyph columns stable; lower exponents add proportionally more
 * glyphs as the render target grows.
 */
export function getResponsiveAsciiGlyphSize(
  renderWidth: number,
  {
    baseHeight,
    baseWidth,
    maxScale = Number.POSITIVE_INFINITY,
    minHeight = ASCII_GLYPH_MIN_HEIGHT_PX,
    minWidth = ASCII_GLYPH_MIN_WIDTH_PX,
    referenceWidth = ASCII_GLYPH_REFERENCE_WIDTH_PX,
    scaleExponent = 1,
  }: ResponsiveAsciiGlyphSizeOptions,
): ResponsiveAsciiGlyphSize {
  const safeReferenceWidth = Math.max(1, referenceWidth);
  const safeScaleExponent = Math.max(0, scaleExponent);
  const responsiveScale = Math.pow(
    Math.max(0, renderWidth) / safeReferenceWidth,
    safeScaleExponent,
  );
  const minimumScale = Math.max(
    minWidth / Math.max(1, baseWidth),
    minHeight / Math.max(1, baseHeight),
  );
  const scale = Math.min(
    Math.max(responsiveScale, minimumScale),
    Math.max(minimumScale, maxScale),
  );

  return {
    height: Math.round(baseHeight * scale),
    scale,
    width: Math.round(baseWidth * scale),
  };
}
