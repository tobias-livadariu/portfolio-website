import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  LinearFilter,
  NearestFilter,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from "three";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { usePortfolioAsciiGlyphSize } from "../hooks/usePortfolioAsciiGlyphSize";

const ASCII_GLYPHS = " .:-=+*#%@";
const GLYPH_WIDTH = 12;
const GLYPH_HEIGHT = 20;

interface Props {
  baseCellHeight?: number;
  baseCellWidth?: number;
}

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

function createAsciiMaterial(glyphTexture: CanvasTexture) {
  return new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    uniforms: {
      cellSize: { value: new Vector2(1, 1) },
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
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
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
        vec4 source = texture2D(tDiffuse, sampleUv);
        float coverage = source.a;
        float luminance = dot(source.rgb, vec3(0.299, 0.587, 0.114));
        float normalized = clamp(pow(luminance * 1.45, 0.72), 0.0, 1.0);
        float glyphIndex = floor(normalized * (glyphCount - 1.0) + 0.5);
        float glyph = readGlyph(glyphIndex, localUv);
        vec3 cellColor = max(source.rgb * 1.35, vec3(luminance * 0.72));

        gl_FragColor = vec4(cellColor, glyph * step(0.04, coverage * normalized));
      }
    `,
  });
}

/**
 * Render the R3F scene through a transparent, color-preserving ASCII pass.
 * Empty cells keep an alpha of zero so the result can sit over any surface.
 */
export default function TransparentAsciiRenderer({
  baseCellHeight = 10,
  baseCellWidth = 6,
}: Props) {
  const { camera, gl, scene, size } = useThree();
  const pixelRatio = gl.getPixelRatio();
  const glyphSize = usePortfolioAsciiGlyphSize({
    baseHeight: baseCellHeight,
    baseWidth: baseCellWidth,
    pixelRatio,
    viewportWidth: size.width,
  });
  const resources = useMemo(() => {
    const glyphTexture = createGlyphTexture();
    const material = createAsciiMaterial(glyphTexture);
    const target = new WebGLRenderTarget(1, 1, { depthBuffer: true });

    material.uniforms.tDiffuse.value = target.texture;

    return {
      glyphTexture,
      material,
      quad: new FullScreenQuad(material),
      target,
    };
  }, []);

  useEffect(() => {
    return () => {
      resources.target.dispose();
      resources.material.dispose();
      resources.glyphTexture.dispose();
      resources.quad.dispose();
    };
  }, [resources]);

  useEffect(() => {
    const width = Math.max(1, Math.round(size.width * pixelRatio));
    const height = Math.max(1, Math.round(size.height * pixelRatio));

    resources.target.setSize(width, height);
    resources.material.uniforms.resolution.value.set(width, height);
    resources.material.uniforms.cellSize.value.set(
      glyphSize.width,
      glyphSize.height,
    );
  }, [glyphSize.height, glyphSize.width, pixelRatio, resources, size]);

  useFrame(() => {
    const previousTarget = gl.getRenderTarget();

    gl.setRenderTarget(resources.target);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    gl.render(scene, camera);

    gl.setRenderTarget(previousTarget);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    resources.quad.render(gl);
  }, 1);

  return null;
}
