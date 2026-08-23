import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text3D, useTexture } from "@react-three/drei";
import type { Group, Mesh } from "three";
import {
  CanvasTexture,
  LinearFilter,
  MathUtils,
  NearestFilter,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { CANVAS_DPR } from "../../scene/canvas.constants";
import { THREE_FONTS } from "../../theme/fonts";
import publicPath from "../../utility/public-path";
import { DRAGON_LUCY } from "../modals.constants";

const ASCII_GLYPHS = " .:-=+*#%@";
/* On-screen cell size (CSS px) — finer than the background AsciiPass since
   this strip is small and has to stay legible. */
const CELL_WIDTH = 6;
const CELL_HEIGHT = 10;
/* Glyph atlas resolution per cell; sampled by UV so it can exceed the
   on-screen cell size for crisper characters. */
const GLYPH_WIDTH = 12;
const GLYPH_HEIGHT = 20;
const FINTA_LOGO_PATH = publicPath("/logos/finta-modified-rmbg.png");

/* Incoming-section tuning knobs. Logo width is a fraction of INCOMING's
   rendered width. A season-text size of 1 gives it the same glyph size as
   INCOMING; lower values keep it visually subordinate. Changing either
   value grows the section vertically without reducing the title size. */
const FINTA_LOGO_WIDTH_RELATIVE_TO_TITLE = 0.27;
const SEASON_TEXT_SIZE_RELATIVE_TO_TITLE = 0.8;

const TITLE_LAYOUT_WIDTH = 1;
const STACK_GAP_RELATIVE_TO_TITLE = 0.032;
const TITLE_VIEWPORT_WIDTH = 0.9;
const MOTION_HEIGHT_PADDING = 1.08;
const FINE_ASCII_MAX_WIDTH_PX = 620;

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

/**
 * Like the background AsciiPass, but it writes alpha instead of painting a
 * background color: cells where nothing rendered stay fully transparent, so
 * the glyphs float directly over the modal.
 */
function createAsciiMaterial(glyphTexture: CanvasTexture) {
  return new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    uniforms: {
      cellSize: { value: new Vector2(CELL_WIDTH, CELL_HEIGHT) },
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
 * Takes over the frame loop: renders the scene into an offscreen target with
 * a fully transparent clear, then draws the ASCII-filtered result to the
 * (alpha-enabled) canvas.
 */
function TransparentAsciiRenderer() {
  const { gl, scene, camera, size } = useThree();
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
    const pixelRatio = gl.getPixelRatio();
    const width = Math.max(1, Math.round(size.width * pixelRatio));
    const height = Math.max(1, Math.round(size.height * pixelRatio));
    /* Finer cells on narrow canvases so the type keeps enough resolution. */
    const cellScale = size.width < FINE_ASCII_MAX_WIDTH_PX ? 0.8 : 1;

    resources.target.setSize(width, height);
    resources.material.uniforms.resolution.value.set(width, height);
    /* Keep glyphs the same on-screen size regardless of device pixel ratio. */
    resources.material.uniforms.cellSize.value.set(
      Math.round(CELL_WIDTH * cellScale * pixelRatio),
      Math.round(CELL_HEIGHT * cellScale * pixelRatio),
    );
  }, [gl, resources, size.height, size.width]);

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

function FintaLogo({ meshRef }: { meshRef: React.RefObject<Mesh | null> }) {
  const texture = useTexture(FINTA_LOGO_PATH);

  return (
    <mesh ref={meshRef} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

function IncomingText({
  children,
  color,
  meshRef,
}: {
  children: string;
  color: string;
  meshRef: React.RefObject<Mesh | null>;
}) {
  return (
    <Text3D
      bevelEnabled={false}
      curveSegments={2}
      font={THREE_FONTS.pixelEmulator}
      height={0.14}
      ref={meshRef}
      size={1}
      visible={false}
    >
      {children}
      <meshBasicMaterial color={color} toneMapped={false} />
    </Text3D>
  );
}

interface MeasuredItem {
  center: Vector3;
  height: number;
  mesh: Mesh;
  scale: number;
  width: number;
}

interface StackLayout {
  height: number;
  items: MeasuredItem[];
}

function measureItemAtScale(mesh: Mesh | null, scale: number) {
  if (!mesh) {
    return null;
  }

  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox;

  if (!bounds) {
    return null;
  }

  const naturalSize = bounds.getSize(new Vector3());

  if (naturalSize.x <= 0 || naturalSize.y <= 0) {
    return null;
  }

  return {
    center: bounds.getCenter(new Vector3()),
    height: naturalSize.y * scale,
    mesh,
    scale,
    width: naturalSize.x * scale,
  } satisfies MeasuredItem;
}

function measureItem(mesh: Mesh | null, targetWidth: number) {
  const naturalItem = measureItemAtScale(mesh, 1);

  if (!naturalItem) {
    return null;
  }

  return measureItemAtScale(mesh, targetWidth / naturalItem.width);
}

function createStack(items: Array<MeasuredItem | null>): StackLayout | null {
  if (items.some((item) => item === null)) {
    return null;
  }

  const measuredItems = items as MeasuredItem[];
  const gap = TITLE_LAYOUT_WIDTH * STACK_GAP_RELATIVE_TO_TITLE;

  return {
    height:
      measuredItems.reduce((total, item) => total + item.height, 0) +
      gap * Math.max(0, measuredItems.length - 1),
    items: measuredItems,
  };
}

function fitTitleToWidth(viewportWidth: number) {
  return (viewportWidth * TITLE_VIEWPORT_WIDTH) / TITLE_LAYOUT_WIDTH;
}

function placeStack(layout: StackLayout) {
  const gap = TITLE_LAYOUT_WIDTH * STACK_GAP_RELATIVE_TO_TITLE;
  let top = layout.height / 2;

  for (const item of layout.items) {
    const centerY = top - item.height / 2;

    item.mesh.scale.setScalar(item.scale);
    item.mesh.position.set(
      -item.center.x * item.scale,
      centerY - item.center.y * item.scale,
      -item.center.z * item.scale,
    );
    item.mesh.visible = true;
    top -= item.height + gap;
  }
}

function IncomingContent({
  onLayoutAspectRatioChange,
}: {
  onLayoutAspectRatioChange: (aspectRatio: number) => void;
}) {
  const groupRef = useRef<Group>(null);
  const titleRef = useRef<Mesh>(null);
  const atRef = useRef<Mesh>(null);
  const logoRef = useRef<Mesh>(null);
  const seasonRef = useRef<Mesh>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const layoutSignatureRef = useRef("");
  const { gl, viewport } = useThree();

  /* Track the cursor across the whole window (the canvas is just one strip
     of the modal), normalized against the canvas center. */
  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (event.clientY - rect.top - rect.height / 2) / rect.height;

      pointer.current.x = MathUtils.clamp(x, -1.2, 1.2);
      pointer.current.y = MathUtils.clamp(y, -1.6, 1.6);
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [gl]);

  useFrame((state, delta) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const layoutSignature = [
      viewport.width,
      viewport.height,
      titleRef.current?.geometry.uuid,
      atRef.current?.geometry.uuid,
      logoRef.current?.geometry.uuid,
      seasonRef.current?.geometry.uuid,
    ].join("|");

    if (layoutSignature !== layoutSignatureRef.current) {
      const title = measureItem(titleRef.current, TITLE_LAYOUT_WIDTH);
      const logo = measureItem(
        logoRef.current,
        TITLE_LAYOUT_WIDTH * FINTA_LOGO_WIDTH_RELATIVE_TO_TITLE,
      );
      const season = measureItemAtScale(
        seasonRef.current,
        (title?.scale ?? 1) * SEASON_TEXT_SIZE_RELATIVE_TO_TITLE,
      );
      const layout = createStack([
        title,
        measureItemAtScale(atRef.current, title?.scale ?? 1),
        logo,
        season,
      ]);

      if (layout) {
        placeStack(layout);
        group.scale.setScalar(fitTitleToWidth(viewport.width));
        onLayoutAspectRatioChange(
          TITLE_LAYOUT_WIDTH / (layout.height * MOTION_HEIGHT_PADDING),
        );
        layoutSignatureRef.current = layoutSignature;
      }
    }

    const damping = 1 - Math.exp(-delta * 5);
    const idle = Math.sin(state.clock.elapsedTime * 0.7) * 0.03;

    group.rotation.y +=
      (pointer.current.x * 0.24 + idle - group.rotation.y) * damping;
    group.rotation.x += (pointer.current.y * 0.12 - group.rotation.x) * damping;
    group.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.06;
  });

  return (
    <group ref={groupRef}>
      <IncomingText color={DRAGON_LUCY.cyan} meshRef={titleRef}>
        INCOMING
      </IncomingText>
      <IncomingText color={DRAGON_LUCY.cyan} meshRef={atRef}>
        @
      </IncomingText>
      <FintaLogo meshRef={logoRef} />
      <IncomingText color={DRAGON_LUCY.cyan} meshRef={seasonRef}>
        (F26)
      </IncomingText>
    </group>
  );
}

/**
 * "INCOMING @ [finta] (F26)" — a three.js canvas with a transparent ASCII
 * filter, so only the glyphs render, floating over the modal. The whole
 * group tilts subtly toward the cursor. The frame loop only runs while the
 * strip is actually on screen.
 */
export default function IncomingSection() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOnScreen, setIsOnScreen] = useState(false);
  const [layoutAspectRatio, setLayoutAspectRatio] = useState<number>();
  const handleLayoutAspectRatioChange = useCallback((aspectRatio: number) => {
    setLayoutAspectRatio((current) =>
      current !== undefined && Math.abs(current - aspectRatio) < 0.0001
        ? current
        : aspectRatio,
    );
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (!wrapper) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsOnScreen(entry?.isIntersecting ?? false);
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="modal-incoming"
      aria-label="Incoming: Finta, Fall 2026"
      ref={wrapperRef}
      style={{ aspectRatio: layoutAspectRatio }}
    >
      <Canvas
        dpr={CANVAS_DPR}
        flat
        frameloop={isOnScreen ? "always" : "never"}
        gl={{ alpha: true, antialias: true }}
        camera={{ fov: 42, position: [0, 0, 9.5] }}
      >
        <Suspense fallback={null}>
          <IncomingContent
            onLayoutAspectRatioChange={handleLayoutAspectRatioChange}
          />
        </Suspense>
        <TransparentAsciiRenderer />
      </Canvas>
    </div>
  );
}
