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
 * Renders one portalled scene into its own target, composites the ASCII result
 * into the corner of the one shared modal renderer, then copies that rectangle
 * into the section's own presentation canvas.
 *
 * The copy is what keeps the scene glued to the modal. A single viewport-sized
 * WebGL canvas has to be positioned against the document on the main thread
 * every frame, so a composited scroll moves the modal before the renderer can
 * follow and the scene visibly trails the panel it belongs to. An ordinary
 * in-flow canvas per section is translated by the compositor together with the
 * rest of the modal, so it cannot drift no matter how far behind the render
 * loop falls. This is the "one renderer, many canvases" arrangement from the
 * three.js manual: one WebGL context is still shared by every scene, and only
 * the finished pixels are handed to each section.
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
    const present = trackRef.current;

    if (!content || !(present instanceof HTMLCanvasElement)) {
      return;
    }

    const rendererCanvas = gl.domElement;
    const presentRect = present.getBoundingClientRect();

    /* Nothing is composited for a section the reader has scrolled away from.
       The shared renderer is viewport-sized, so its own rectangle is the
       cheapest stand-in for "still on screen". */
    if (
      presentRect.width <= 0 ||
      presentRect.height <= 0 ||
      presentRect.bottom <= 0 ||
      presentRect.top >= window.innerHeight ||
      presentRect.right <= 0 ||
      presentRect.left >= window.innerWidth
    ) {
      content.visible = false;
      return;
    }

    /* WebGLRenderer's viewport and scissor APIs take logical/CSS pixels and
       multiply them by its pixel ratio internally, flooring the result. The
       render target, the fragment shader, and the canvas backing stores all
       work in physical pixels. Deriving the physical size the same way the
       renderer does keeps the copy below aligned to the pixels just drawn. */
    const cssWidth = Math.max(1, presentRect.width);
    const cssHeight = Math.max(1, presentRect.height);

    /* The copy reads back out of the shared renderer, so a section has to be
       drawn inside that buffer. A section can legitimately be taller than the
       viewport — a tall hero on a short window — so oversized sections are
       rendered at a reduced density and stretched back by their canvas rather
       than being dropped. */
    const fitScale = Math.min(
      1,
      rendererCanvas.width / Math.max(1, cssWidth * pixelRatio),
      rendererCanvas.height / Math.max(1, cssHeight * pixelRatio),
    );
    const renderCssWidth = cssWidth * fitScale;
    const renderCssHeight = cssHeight * fitScale;
    const physicalWidth = Math.max(1, Math.floor(renderCssWidth * pixelRatio));
    const physicalHeight = Math.max(
      1,
      Math.floor(renderCssHeight * pixelRatio),
    );

    if (
      resources.target.width !== physicalWidth ||
      resources.target.height !== physicalHeight
    ) {
      resources.target.setSize(physicalWidth, physicalHeight);
    }
    resources.material.uniforms.resolution.value.set(
      physicalWidth,
      physicalHeight,
    );
    /* Glyph cells are sized in render pixels, so a section rendered below its
       full density needs proportionally smaller cells to keep the same
       apparent glyph size once its canvas stretches the result back out. At
       full density this is exactly the measured size. */
    resources.material.uniforms.cellSize.value.set(
      glyphSize.width * fitScale,
      glyphSize.height * fitScale,
    );

    /* Every scene is composited into the same corner of the shared renderer,
       so the glyph grid is anchored to the section itself. It no longer shifts
       phase by a pixel as the section's document position changes. */
    resources.material.uniforms.viewportOrigin.value.set(0, 0);

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
    gl.setViewport(0, 0, renderCssWidth, renderCssHeight);
    gl.setScissor(0, 0, renderCssWidth, renderCssHeight);
    gl.setScissorTest(true);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    resources.quad.render(gl);

    gl.setViewport(resources.previousViewport);
    gl.setScissor(resources.previousScissor);
    gl.setScissorTest(previousScissorTest);
    gl.setClearColor(resources.clearColor, previousClearAlpha);

    /* Hand the finished rectangle to the section. The read happens inside the
       same animation frame as the draw, so the drawing buffer is still intact
       and `preserveDrawingBuffer` is not needed. `copy` replaces the previous
       frame outright, which keeps the transparent cells transparent. */
    const context = present.getContext("2d");

    if (!context) {
      return;
    }

    if (present.width !== physicalWidth || present.height !== physicalHeight) {
      present.width = physicalWidth;
      present.height = physicalHeight;
    }

    context.globalCompositeOperation = "copy";
    context.drawImage(
      rendererCanvas,
      0,
      rendererCanvas.height - physicalHeight,
      physicalWidth,
      physicalHeight,
      0,
      0,
      physicalWidth,
      physicalHeight,
    );

    if (!hasReportedReadyRef.current) {
      hasReportedReadyRef.current = true;
      window.requestAnimationFrame(() => onReady?.());
    }
  }, renderPriority);

  return null;
}
