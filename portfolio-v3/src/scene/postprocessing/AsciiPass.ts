import {
  CanvasTexture,
  Color,
  LinearFilter,
  NearestFilter,
  Vector2,
} from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { getResponsiveAsciiGlyphSize } from "../../utility/ascii-glyph-size";

const ASCII_GLYPHS = " .:-=+*#%@";
const GLYPH_ATLAS_CELL_WIDTH_PX = 8;
const GLYPH_ATLAS_CELL_HEIGHT_PX = 14;

/**
 * Art-direction knobs for the full-page R3F ASCII filter. They are separate
 * from the transparent portfolio-modal renderer so the two systems can use
 * different glyph densities and responsive growth curves.
 */
export const ASCII_FILTER_GLYPH_SIZE_TUNING = {
  // Glyph-cell height at the reference render-target width. Lower is denser.
  baseCellHeightPx: 5,
  // Glyph-cell width at the reference render-target width. Lower is denser.
  baseCellWidthPx: 3,
  // Hard cap on cell growth. Lower values add more glyphs on very wide screens.
  maximumScale: 1.2,
  // Smallest cell height allowed on narrow render targets.
  minimumCellHeightPx: 3,
  // Smallest cell width allowed on narrow render targets.
  minimumCellWidthPx: 2,
  // Render-target width at which the base cell dimensions are used exactly.
  referenceRenderWidthPx: 1920,
  // 1 is linear; lower values make cells grow more slowly as screens get wider.
  renderWidthScaleExponent: 0.64,
} as const;

function createGlyphTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = GLYPH_ATLAS_CELL_WIDTH_PX * ASCII_GLYPHS.length;
  canvas.height = GLYPH_ATLAS_CELL_HEIGHT_PX;

  const context = canvas.getContext("2d");

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fff";
    context.font = `700 ${Math.floor(GLYPH_ATLAS_CELL_HEIGHT_PX * 0.82)}px "Iosevka Term Web", monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    for (let index = 0; index < ASCII_GLYPHS.length; index += 1) {
      context.fillText(
        ASCII_GLYPHS[index],
        index * GLYPH_ATLAS_CELL_WIDTH_PX + GLYPH_ATLAS_CELL_WIDTH_PX / 2,
        GLYPH_ATLAS_CELL_HEIGHT_PX / 2,
      );
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.magFilter = NearestFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export default class AsciiPass extends ShaderPass {
  private readonly glyphTexture: CanvasTexture;

  constructor() {
    const glyphTexture = createGlyphTexture();

    super({
      name: "PortfolioAsciiShader",
      uniforms: {
        backgroundColor: { value: new Color("#02040a") },
        cellSize: {
          value: new Vector2(
            ASCII_FILTER_GLYPH_SIZE_TUNING.baseCellWidthPx,
            ASCII_FILTER_GLYPH_SIZE_TUNING.baseCellHeightPx,
          ),
        },
        glyphCount: { value: ASCII_GLYPHS.length },
        glyphResolution: {
          value: new Vector2(
            GLYPH_ATLAS_CELL_WIDTH_PX * ASCII_GLYPHS.length,
            GLYPH_ATLAS_CELL_HEIGHT_PX,
          ),
        },
        resolution: { value: new Vector2(1, 1) },
        tDiffuse: { value: null },
        tGlyphs: { value: glyphTexture },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 backgroundColor;
        uniform vec2 cellSize;
        uniform float glyphCount;
        uniform vec2 glyphResolution;
        uniform vec2 resolution;
        uniform sampler2D tDiffuse;
        uniform sampler2D tGlyphs;
        varying vec2 vUv;

        float readGlyph(float glyphIndex, vec2 localUv) {
          vec2 safeUv = clamp(localUv, vec2(0.025), vec2(0.975));
          vec2 atlasUv = vec2(
            (glyphIndex + safeUv.x) / glyphCount,
            safeUv.y
          );
          return texture2D(tGlyphs, atlasUv).r;
        }

        void main() {
          vec2 cell = floor(gl_FragCoord.xy / cellSize);
          vec2 localUv = fract(gl_FragCoord.xy / cellSize);
          vec2 sampleUv = (cell + 0.5) * cellSize / resolution;
          vec3 sourceColor = texture2D(tDiffuse, sampleUv).rgb;
          float luminance = dot(sourceColor, vec3(0.299, 0.587, 0.114));
          float normalized = clamp(pow(luminance * 1.45, 0.72), 0.0, 1.0);
          float glyphIndex = floor(normalized * (glyphCount - 1.0) + 0.5);
          float glyph = readGlyph(glyphIndex, localUv);
          vec2 glyphStep = vec2(
            glyphCount / glyphResolution.x,
            1.0 / glyphResolution.y
          ) * 1.35;
          float outline = 0.0;
          outline = max(outline, readGlyph(glyphIndex, localUv + vec2(glyphStep.x, 0.0)));
          outline = max(outline, readGlyph(glyphIndex, localUv - vec2(glyphStep.x, 0.0)));
          outline = max(outline, readGlyph(glyphIndex, localUv + vec2(0.0, glyphStep.y)));
          outline = max(outline, readGlyph(glyphIndex, localUv - vec2(0.0, glyphStep.y)));
          outline = max(outline, readGlyph(glyphIndex, localUv + glyphStep));
          outline = max(outline, readGlyph(glyphIndex, localUv - glyphStep));

          vec3 cellColor = max(sourceColor * 1.35, vec3(luminance * 0.72));
          vec3 finalColor = mix(backgroundColor, vec3(0.0), outline * 0.96);
          finalColor = mix(finalColor, cellColor, glyph);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });

    this.glyphTexture = glyphTexture;
  }

  override setSize(width: number, height: number) {
    this.uniforms?.resolution.value.set(width, height);
    const glyphSize = getResponsiveAsciiGlyphSize(width, {
      baseHeight: ASCII_FILTER_GLYPH_SIZE_TUNING.baseCellHeightPx,
      baseWidth: ASCII_FILTER_GLYPH_SIZE_TUNING.baseCellWidthPx,
      maxScale: ASCII_FILTER_GLYPH_SIZE_TUNING.maximumScale,
      minHeight: ASCII_FILTER_GLYPH_SIZE_TUNING.minimumCellHeightPx,
      minWidth: ASCII_FILTER_GLYPH_SIZE_TUNING.minimumCellWidthPx,
      referenceWidth: ASCII_FILTER_GLYPH_SIZE_TUNING.referenceRenderWidthPx,
      scaleExponent: ASCII_FILTER_GLYPH_SIZE_TUNING.renderWidthScaleExponent,
    });

    this.uniforms?.cellSize.value.set(glyphSize.width, glyphSize.height);
  }

  override dispose() {
    super.dispose();
    this.glyphTexture.dispose();
  }
}
