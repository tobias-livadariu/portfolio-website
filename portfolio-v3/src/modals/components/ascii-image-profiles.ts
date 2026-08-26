export type AsciiDitherMode = "atkinson" | "floyd-steinberg" | "none";

export interface AsciiImageProfile {
  /** Stable name included in the frame cache key. */
  id: string;
  raster: {
    /** Samples each output cell on an N-by-N grid before averaging it. */
    samplesPerAxis: number;
    /** Enables browser interpolation while shrinking the source image. */
    smoothingEnabled: boolean;
    /** Browser resampling quality used when smoothing is enabled. */
    smoothingQuality: ImageSmoothingQuality;
    /** Animated frames processed per task before yielding to user input. */
    framesPerYield: number;
  };
  alpha: {
    /** Cells below this average opacity become transparent spaces. */
    threshold: number;
  };
  tone: {
    /** Multiplies source RGB before tone analysis; values above 1 brighten. */
    exposure: number;
    /** Midtone curve; values above 1 brighten midtones without moving black. */
    gamma: number;
    /** Contrast around middle gray; 1 preserves the source contrast. */
    contrast: number;
    /** Ignores this darkest fraction when automatically finding black. */
    blackPointPercentile: number;
    /** Uses this luminance percentile as white during automatic leveling. */
    whitePointPercentile: number;
    /** Gaussian sigma used to remove detail too fine for one character cell. */
    preBlurSigma: number;
    /** Small-scale Gaussian sigma used by the unsharp-mask stage. */
    sharpenSigma: number;
    /** Strength of fine edge sharpening; 0 disables the stage. */
    sharpenAmount: number;
    /** Large-scale Gaussian sigma used to measure surrounding brightness. */
    localContrastSigma: number;
    /** Strength of large-scale local contrast; 0 disables the stage. */
    localContrastAmount: number;
    /** Adds Sobel edge magnitude to glyph density; 0 preserves pure tone. */
    edgeBoost: number;
  };
  color: {
    /** Color saturation multiplier; 0 is grayscale and 1 preserves source. */
    saturation: number;
    /** Blends output color brightness toward processed glyph luminance. */
    toneMapStrength: number;
  };
  quantization: {
    /** Characters ordered from visually lightest to visually densest. */
    ramp: string;
    /** Error-diffusion algorithm applied to glyph-density quantization. */
    dither: AsciiDitherMode;
    /** Fraction of quantization error diffused into neighboring cells. */
    ditherStrength: number;
    /** Alternates scan direction each row to avoid directional streaking. */
    serpentine: boolean;
  };
  structure: {
    /** Replaces strong contour cells with direction-matched line glyphs. */
    enabled: boolean;
    /** Minimum normalized Sobel magnitude required for a contour glyph. */
    edgeThreshold: number;
    /** Prevents contour glyphs in tones darker than this value. */
    minTone: number;
    /** Prevents contour glyphs in tones brighter than this value. */
    maxTone: number;
    /** Glyph used when an image contour runs horizontally. */
    horizontalGlyph: string;
    /** Glyph used when an image contour runs vertically. */
    verticalGlyph: string;
    /** Glyph used for a bottom-left to top-right contour. */
    forwardSlashGlyph: string;
    /** Glyph used for a top-left to bottom-right contour. */
    backwardSlashGlyph: string;
  };
}

/**
 * Runtime image-to-ASCII tuning knobs.
 *
 * These profiles intentionally remain separate: the tiny animated header
 * planets need aggressive simplification, while Tobifetch has enough cells
 * to preserve subtler facial structure. Every stage accepts a neutral value
 * (usually 0, 1, or "none") so experiments can be isolated easily.
 */
export const STATIC_ASCII_PROFILES = {
  modalHeaderPlanet: {
    id: "modal-header-planet-v2",
    raster: {
      samplesPerAxis: 2,
      smoothingEnabled: true,
      smoothingQuality: "high",
      framesPerYield: 2,
    },
    alpha: {
      threshold: 0.075,
    },
    tone: {
      exposure: 1.08,
      gamma: 1.02,
      contrast: 1.08,
      blackPointPercentile: 0.025,
      whitePointPercentile: 0.985,
      preBlurSigma: 0.35,
      sharpenSigma: 0.8,
      sharpenAmount: 0.55,
      localContrastSigma: 2.3,
      localContrastAmount: 0.22,
      edgeBoost: 0.1,
    },
    color: {
      saturation: 1.08,
      toneMapStrength: 0.45,
    },
    quantization: {
      ramp: " .,:;irsXA253hMHGS#9B&@",
      dither: "floyd-steinberg",
      ditherStrength: 0.38,
      serpentine: true,
    },
    structure: {
      enabled: true,
      edgeThreshold: 0.34,
      minTone: 0.12,
      maxTone: 0.78,
      horizontalGlyph: "-",
      verticalGlyph: "|",
      forwardSlashGlyph: "/",
      backwardSlashGlyph: "\\",
    },
  },
  tobifetchPortrait: {
    id: "tobifetch-portrait-v2",
    raster: {
      samplesPerAxis: 3,
      smoothingEnabled: true,
      smoothingQuality: "high",
      framesPerYield: 1,
    },
    alpha: {
      threshold: 0.055,
    },
    tone: {
      exposure: 1.34,
      gamma: 1.06,
      contrast: 1.12,
      blackPointPercentile: 0.015,
      whitePointPercentile: 0.992,
      preBlurSigma: 0.3,
      sharpenSigma: 0.85,
      sharpenAmount: 0.62,
      localContrastSigma: 3.1,
      localContrastAmount: 0.26,
      edgeBoost: 0.12,
    },
    color: {
      saturation: 1.02,
      toneMapStrength: 0.52,
    },
    quantization: {
      ramp: " .,:;irsXA253hMHGS#9B&@",
      dither: "floyd-steinberg",
      ditherStrength: 0.28,
      serpentine: true,
    },
    structure: {
      enabled: true,
      edgeThreshold: 0.3,
      minTone: 0.1,
      maxTone: 0.82,
      horizontalGlyph: "-",
      verticalGlyph: "|",
      forwardSlashGlyph: "/",
      backwardSlashGlyph: "\\",
    },
  },
} as const satisfies Record<string, AsciiImageProfile>;
