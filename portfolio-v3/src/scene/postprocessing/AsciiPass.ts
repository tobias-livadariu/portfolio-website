import {
  CanvasTexture,
  Color,
  LinearFilter,
  NearestFilter,
  Vector2,
} from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

const ASCII_GLYPHS = " .:-=+*#%@";
const GLYPH_WIDTH = 8;
const GLYPH_HEIGHT = 14;

function createGlyphTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = GLYPH_WIDTH * ASCII_GLYPHS.length;
  canvas.height = GLYPH_HEIGHT;

  const context = canvas.getContext("2d");

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fff";
    context.font = `700 ${Math.floor(GLYPH_HEIGHT * 0.82)}px "Iosevka Term Web", monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    for (let index = 0; index < ASCII_GLYPHS.length; index += 1) {
      context.fillText(
        ASCII_GLYPHS[index],
        index * GLYPH_WIDTH + GLYPH_WIDTH / 2,
        GLYPH_HEIGHT / 2,
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
        cellSize: { value: new Vector2(GLYPH_WIDTH, GLYPH_HEIGHT) },
        glyphCount: { value: ASCII_GLYPHS.length },
        glyphResolution: {
          value: new Vector2(GLYPH_WIDTH * ASCII_GLYPHS.length, GLYPH_HEIGHT),
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
  }

  override dispose() {
    super.dispose();
    this.glyphTexture.dispose();
  }
}
