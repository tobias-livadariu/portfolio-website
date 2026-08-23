import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
const FINTA_LOGO_SIDE = 3.1;
/* These are visual proportions, not font metrics. Each Text3D geometry is
   measured at runtime and scaled to these widths relative to the logo. */
const WIDE_TITLE_WIDTH_IN_LOGOS = 3.7;
const NARROW_TITLE_WIDTH_IN_LOGOS = 2.65;
const NARROW_AT_WIDTH_IN_LOGOS = 0.24;
const SEASON_WIDTH_IN_LOGOS = 0.95;
const STACK_GAP_IN_LOGOS = 0.12;
const VIEWPORT_FILL = 0.94;
const NARROW_LAYOUT_SCALE_ADVANTAGE = 1.08;
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
  isMain = true,
}: {
  children: string;
  color: string;
  meshRef: React.RefObject<Mesh | null>;
  isMain?: boolean;
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
      <meshStandardMaterial
        color={color}
        toneMapped={false}
        emissive={color}
        emissiveIntensity={isMain ? 0.4 : 0.3}
      />
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
  width: number;
}

function measureItem(mesh: Mesh | null, targetWidth: number) {
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

  const scale = targetWidth / naturalSize.x;

  return {
    center: bounds.getCenter(new Vector3()),
    height: naturalSize.y * scale,
    mesh,
    scale,
    width: targetWidth,
  } satisfies MeasuredItem;
}

function createStack(items: Array<MeasuredItem | null>): StackLayout | null {
  if (items.some((item) => item === null)) {
    return null;
  }

  const measuredItems = items as MeasuredItem[];
  const gap = FINTA_LOGO_SIDE * STACK_GAP_IN_LOGOS;

  return {
    height:
      measuredItems.reduce((total, item) => total + item.height, 0) +
      gap * Math.max(0, measuredItems.length - 1),
    items: measuredItems,
    width: Math.max(...measuredItems.map((item) => item.width)),
  };
}

function fitScale(
  layout: StackLayout,
  viewportWidth: number,
  viewportHeight: number,
) {
  return Math.min(
    (viewportWidth * VIEWPORT_FILL) / layout.width,
    (viewportHeight * VIEWPORT_FILL) / layout.height,
  );
}

function placeStack(layout: StackLayout) {
  const gap = FINTA_LOGO_SIDE * STACK_GAP_IN_LOGOS;
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

function IncomingContent() {
  const groupRef = useRef<Group>(null);
  const wideTitleRef = useRef<Mesh>(null);
  const narrowTitleRef = useRef<Mesh>(null);
  const narrowAtRef = useRef<Mesh>(null);
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
      wideTitleRef.current?.geometry.uuid,
      narrowTitleRef.current?.geometry.uuid,
      narrowAtRef.current?.geometry.uuid,
      logoRef.current?.geometry.uuid,
      seasonRef.current?.geometry.uuid,
    ].join("|");

    if (layoutSignature !== layoutSignatureRef.current) {
      const logo = measureItem(logoRef.current, FINTA_LOGO_SIDE);
      const season = measureItem(
        seasonRef.current,
        FINTA_LOGO_SIDE * SEASON_WIDTH_IN_LOGOS,
      );
      const wideLayout = createStack([
        measureItem(
          wideTitleRef.current,
          FINTA_LOGO_SIDE * WIDE_TITLE_WIDTH_IN_LOGOS,
        ),
        logo,
        season,
      ]);
      const narrowLayout = createStack([
        measureItem(
          narrowTitleRef.current,
          FINTA_LOGO_SIDE * NARROW_TITLE_WIDTH_IN_LOGOS,
        ),
        measureItem(
          narrowAtRef.current,
          FINTA_LOGO_SIDE * NARROW_AT_WIDTH_IN_LOGOS,
        ),
        logo,
        season,
      ]);

      if (wideLayout && narrowLayout) {
        const wideScale = fitScale(wideLayout, viewport.width, viewport.height);
        const narrowScale = fitScale(
          narrowLayout,
          viewport.width,
          viewport.height,
        );
        const useNarrow =
          narrowScale > wideScale * NARROW_LAYOUT_SCALE_ADVANTAGE;
        const layout = useNarrow ? narrowLayout : wideLayout;

        wideTitleRef.current!.visible = !useNarrow;
        narrowTitleRef.current!.visible = useNarrow;
        narrowAtRef.current!.visible = useNarrow;
        logoRef.current!.visible = false;
        seasonRef.current!.visible = false;
        placeStack(layout);
        group.scale.setScalar(useNarrow ? narrowScale : wideScale);
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
      <IncomingText color={DRAGON_LUCY.cyan} meshRef={wideTitleRef}>
        INCOMING @
      </IncomingText>
      <IncomingText color="#dcd7ba" meshRef={narrowTitleRef}>
        INCOMING
      </IncomingText>
      <IncomingText color="#dcd7ba" meshRef={narrowAtRef}>
        @
      </IncomingText>
      <FintaLogo meshRef={logoRef} />
      <IncomingText color="#51c7da" meshRef={seasonRef} isMain={false}>
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
    >
      <Canvas
        dpr={CANVAS_DPR}
        flat
        frameloop={isOnScreen ? "always" : "never"}
        gl={{ alpha: true, antialias: true }}
        camera={{ fov: 42, position: [0, 0, 9.5] }}
      >
        <ambientLight intensity={1.1} />
        <directionalLight intensity={1.4} position={[3, 4, 6]} />
        <Suspense fallback={null}>
          <IncomingContent />
        </Suspense>
        <TransparentAsciiRenderer />
      </Canvas>
    </div>
  );
}
