import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  Color,
  Group,
  LinearFilter,
  NearestFilter,
  ShaderMaterial,
  Vector2,
  Vector4,
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
  contentRef: RefObject<Group | null>;
  onReady?: () => void;
  renderPriority: number;
  trackRef: RefObject<HTMLElement | null>;
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
      viewportOrigin: { value: new Vector2(0, 0) },
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
      uniform vec2 viewportOrigin;
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
        vec2 localFragment = gl_FragCoord.xy - viewportOrigin;
        vec2 cell = floor(localFragment / cellSize);
        vec2 localUv = fract(localFragment / cellSize);
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
 * Renders one portalled scene into its own target, then composites the ASCII
 * result into the tracked DOM rectangle on the one shared modal canvas.
 */
export default function TransparentAsciiRenderer({
  baseCellHeight = 10,
  baseCellWidth = 6,
  contentRef,
  onReady,
  renderPriority,
  trackRef,
}: Props) {
  const { camera, gl, scene, size } = useThree();
  const hasReportedReadyRef = useRef(false);
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
      clearColor: new Color(),
      glyphTexture,
      material,
      previousScissor: new Vector4(),
      previousViewport: new Vector4(),
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

  useFrame(() => {
    const content = contentRef.current;
    const track = trackRef.current;

    if (!content || !track) {
      return;
    }

    const canvasRect = gl.domElement.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();

    if (
      canvasRect.width <= 0 ||
      canvasRect.height <= 0 ||
      trackRect.width <= 0 ||
      trackRect.height <= 0 ||
      trackRect.right <= canvasRect.left ||
      trackRect.left >= canvasRect.right ||
      trackRect.bottom <= canvasRect.top ||
      trackRect.top >= canvasRect.bottom
    ) {
      content.visible = false;
      return;
    }

    // WebGLRenderer's viewport and scissor APIs take logical/CSS pixels and
    // multiply them by its pixel ratio internally. The render target and
    // fragment shader, however, operate in physical pixels. Keeping these
    // coordinate spaces separate prevents DPR from being applied twice on
    // Retina and other dense displays.
    const destinationLeft = trackRect.left - canvasRect.left;
    const destinationBottom = canvasRect.bottom - trackRect.bottom;
    const destinationWidth = Math.max(1, trackRect.width);
    const destinationHeight = Math.max(1, trackRect.height);
    const targetWidth = Math.max(1, Math.round(destinationWidth * pixelRatio));
    const targetHeight = Math.max(
      1,
      Math.round(destinationHeight * pixelRatio),
    );
    const clipLeft = Math.max(0, destinationLeft);
    const clipBottom = Math.max(0, destinationBottom);
    const clipRight = Math.min(
      canvasRect.width,
      destinationLeft + destinationWidth,
    );
    const clipTop = Math.min(
      canvasRect.height,
      destinationBottom + destinationHeight,
    );

    if (clipRight <= clipLeft || clipTop <= clipBottom) {
      content.visible = false;
      return;
    }

    if (
      resources.target.width !== targetWidth ||
      resources.target.height !== targetHeight
    ) {
      resources.target.setSize(targetWidth, targetHeight);
    }
    resources.material.uniforms.resolution.value.set(targetWidth, targetHeight);
    resources.material.uniforms.cellSize.value.set(
      glyphSize.width,
      glyphSize.height,
    );
    resources.material.uniforms.viewportOrigin.value.set(
      Math.round(destinationLeft * pixelRatio),
      Math.round(destinationBottom * pixelRatio),
    );

    const previousTarget = gl.getRenderTarget();
    const previousScissorTest = gl.getScissorTest();
    const previousClearAlpha = gl.getClearAlpha();
    gl.getClearColor(resources.clearColor);
    gl.getViewport(resources.previousViewport);
    gl.getScissor(resources.previousScissor);

    gl.setScissorTest(false);
    gl.setRenderTarget(resources.target);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    content.visible = true;
    gl.render(scene, camera);
    content.visible = false;

    gl.setRenderTarget(previousTarget);
    gl.setViewport(
      destinationLeft,
      destinationBottom,
      destinationWidth,
      destinationHeight,
    );
    gl.setScissor(
      clipLeft,
      clipBottom,
      clipRight - clipLeft,
      clipTop - clipBottom,
    );
    gl.setScissorTest(true);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    resources.quad.render(gl);

    gl.setViewport(resources.previousViewport);
    gl.setScissor(resources.previousScissor);
    gl.setScissorTest(previousScissorTest);
    gl.setClearColor(resources.clearColor, previousClearAlpha);

    if (!hasReportedReadyRef.current) {
      hasReportedReadyRef.current = true;
      window.requestAnimationFrame(() => onReady?.());
    }
  }, renderPriority);

  return null;
}
