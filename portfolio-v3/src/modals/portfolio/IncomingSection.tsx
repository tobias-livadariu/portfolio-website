import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text3D, useTexture } from "@react-three/drei";
import type { Group, Mesh } from "three";
import { MathUtils, Vector3 } from "three";
import TransparentAsciiRenderer from "../../scene/ascii/TransparentAsciiRenderer";
import { CANVAS_DPR } from "../../scene/canvas.constants";
import { THREE_FONTS } from "../../theme/fonts";
import publicPath from "../../utility/public-path";
import { DRAGON_LUCY } from "../modals.constants";

const FINTA_LOGO_PATH = publicPath("/logos/finta-modified-rmbg.png");

/* Finta-scene tuning knobs. The values are grouped so the full composition
   can be adjusted from one place without modifying layout or animation code. */
const INCOMING_SCENE_TUNING = {
  backdropDepth: -0.42,
  backdropFloatAmount: 0.035,
  backdropLogoOpacity: 0.38,
  backdropLogoWidthRelativeToTitle: 0.3,
  backdropTwistDegrees: 7,
  baseBottomMarginRem: 1.25,
  baseTopMarginRem: 0.5,
  baseWhitespaceRelativeToStack: 0.04,
  bottomWhitespaceMultiplier: 0,
  decoratorSizeMultiplier: 1,
  fallbackLayoutAspectRatio: 1.35,
  fintaStageHeightRelativeToTitle: 0.52,
  fintaTextDepth: 0.18,
  fintaTextWidthRelativeToTitle: 0.64,
  glyphCellHeight: 10,
  glyphCellWidth: 6,
  idleTwistDegrees: 1.7,
  logoBlue: "#2a42ff",
  mainFloatAmount: 0.06,
  maxPointerTwistDegrees: 13.5,
  motionDamping: 5,
  pointerPitchRatio: 0.5,
  seasonTextSizeRelativeToTitle: 0.8,
  sectionSizeMultiplier: 0.78,
  stackGapRelativeToTitle: 0.032,
  titleLayoutWidth: 1,
  titleViewportWidth: 0.9,
  topWhitespaceMultiplier: 0,
  wordmarkBlue: "#344bc4",
} as const;

function FintaBackdrop({
  groupRef,
}: {
  groupRef: React.RefObject<Group | null>;
}) {
  const texture = useTexture(FINTA_LOGO_PATH);

  return (
    <group ref={groupRef} visible={false}>
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[0.88, 0.88]} />
        <meshBasicMaterial
          depthWrite={false}
          map={texture}
          opacity={INCOMING_SCENE_TUNING.backdropLogoOpacity}
          transparent
          toneMapped={false}
        />
      </mesh>

      <group scale={INCOMING_SCENE_TUNING.decoratorSizeMultiplier}>
        <mesh position={[0, 0, -0.04]}>
          <ringGeometry args={[0.56, 0.59, 72]} />
          <meshBasicMaterial
            color={INCOMING_SCENE_TUNING.logoBlue}
            opacity={0.72}
            transparent
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0, -0.05]}>
          <ringGeometry args={[0.67, 0.685, 72]} />
          <meshBasicMaterial
            color={DRAGON_LUCY.cyan}
            opacity={0.42}
            transparent
            toneMapped={false}
          />
        </mesh>

        {[
          [0, 0.77, 0],
          [0, -0.77, 0],
          [0.77, 0, Math.PI / 2],
          [-0.77, 0, Math.PI / 2],
        ].map(([x, y, rotation], index) => (
          <mesh key={index} position={[x, y, 0]} rotation={[0, 0, rotation]}>
            <planeGeometry args={[0.22, 0.026]} />
            <meshBasicMaterial color={DRAGON_LUCY.cyan} toneMapped={false} />
          </mesh>
        ))}

        {[-0.18, 0, 0.18].flatMap((y, rowIndex) =>
          [-1, 1].map((side) => (
            <mesh key={`${rowIndex}-${side}`} position={[side * 1.18, y, 0]}>
              <planeGeometry args={[0.095, 0.095]} />
              <meshBasicMaterial
                color={INCOMING_SCENE_TUNING.logoBlue}
                toneMapped={false}
              />
            </mesh>
          )),
        )}

        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.94, 0, -0.03]}>
            <planeGeometry args={[0.56, 0.025]} />
            <meshBasicMaterial
              color={DRAGON_LUCY.cyan}
              opacity={0.68}
              transparent
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
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
  const gap =
    INCOMING_SCENE_TUNING.titleLayoutWidth *
    INCOMING_SCENE_TUNING.stackGapRelativeToTitle;

  return {
    height:
      measuredItems.reduce((total, item) => total + item.height, 0) +
      gap * Math.max(0, measuredItems.length - 1),
    items: measuredItems,
  };
}

function fitTitleToWidth(viewportWidth: number) {
  return (
    (viewportWidth *
      INCOMING_SCENE_TUNING.titleViewportWidth *
      INCOMING_SCENE_TUNING.sectionSizeMultiplier) /
    INCOMING_SCENE_TUNING.titleLayoutWidth
  );
}

function placeStack(layout: StackLayout, verticalOffset: number) {
  const gap =
    INCOMING_SCENE_TUNING.titleLayoutWidth *
    INCOMING_SCENE_TUNING.stackGapRelativeToTitle;
  const centers = new Map<Mesh, number>();
  let top = layout.height / 2;

  for (const item of layout.items) {
    const centerY = top - item.height / 2;

    item.mesh.scale.setScalar(item.scale);
    item.mesh.position.set(
      -item.center.x * item.scale,
      centerY + verticalOffset - item.center.y * item.scale,
      -item.center.z * item.scale,
    );
    item.mesh.visible = true;
    centers.set(item.mesh, centerY + verticalOffset);
    top -= item.height + gap;
  }

  return centers;
}

function IncomingContent({
  onLayoutAspectRatioChange,
}: {
  onLayoutAspectRatioChange: (aspectRatio: number) => void;
}) {
  const groupRef = useRef<Group>(null);
  const backdropRef = useRef<Group>(null);
  const titleRef = useRef<Mesh>(null);
  const atRef = useRef<Mesh>(null);
  const fintaRef = useRef<Mesh>(null);
  const seasonRef = useRef<Mesh>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const backdropBaseY = useRef(0);
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
      INCOMING_SCENE_TUNING.sectionSizeMultiplier,
      INCOMING_SCENE_TUNING.fintaTextWidthRelativeToTitle,
      INCOMING_SCENE_TUNING.backdropLogoWidthRelativeToTitle,
      INCOMING_SCENE_TUNING.decoratorSizeMultiplier,
      INCOMING_SCENE_TUNING.seasonTextSizeRelativeToTitle,
      INCOMING_SCENE_TUNING.topWhitespaceMultiplier,
      INCOMING_SCENE_TUNING.bottomWhitespaceMultiplier,
      titleRef.current?.geometry.uuid,
      atRef.current?.geometry.uuid,
      fintaRef.current?.geometry.uuid,
      seasonRef.current?.geometry.uuid,
    ].join("|");

    if (layoutSignature !== layoutSignatureRef.current) {
      const title = measureItem(
        titleRef.current,
        INCOMING_SCENE_TUNING.titleLayoutWidth,
      );
      const finta = measureItem(
        fintaRef.current,
        INCOMING_SCENE_TUNING.titleLayoutWidth *
          INCOMING_SCENE_TUNING.fintaTextWidthRelativeToTitle,
      );
      const fintaStage = finta
        ? {
            ...finta,
            height: Math.max(
              finta.height,
              INCOMING_SCENE_TUNING.titleLayoutWidth *
                INCOMING_SCENE_TUNING.fintaStageHeightRelativeToTitle,
            ),
          }
        : null;
      const season = measureItemAtScale(
        seasonRef.current,
        (title?.scale ?? 1) *
          INCOMING_SCENE_TUNING.seasonTextSizeRelativeToTitle,
      );
      const layout = createStack([
        title,
        measureItemAtScale(atRef.current, title?.scale ?? 1),
        fintaStage,
        season,
      ]);

      if (layout && fintaStage && backdropRef.current) {
        const baseWhitespace =
          layout.height * INCOMING_SCENE_TUNING.baseWhitespaceRelativeToStack;
        const topWhitespace =
          baseWhitespace * INCOMING_SCENE_TUNING.topWhitespaceMultiplier;
        const bottomWhitespace =
          baseWhitespace * INCOMING_SCENE_TUNING.bottomWhitespaceMultiplier;

        const itemCenters = placeStack(
          layout,
          (bottomWhitespace - topWhitespace) / 2,
        );
        const fintaCenter = itemCenters.get(fintaStage.mesh) ?? 0;

        fintaStage.mesh.position.z = INCOMING_SCENE_TUNING.fintaTextDepth;
        backdropRef.current.position.set(
          0,
          fintaCenter,
          INCOMING_SCENE_TUNING.backdropDepth,
        );
        backdropRef.current.scale.setScalar(
          INCOMING_SCENE_TUNING.titleLayoutWidth *
            INCOMING_SCENE_TUNING.backdropLogoWidthRelativeToTitle,
        );
        backdropRef.current.visible = true;
        backdropBaseY.current = fintaCenter;
        group.scale.setScalar(fitTitleToWidth(viewport.width));
        onLayoutAspectRatioChange(
          INCOMING_SCENE_TUNING.titleLayoutWidth /
            ((layout.height + topWhitespace + bottomWhitespace) *
              INCOMING_SCENE_TUNING.sectionSizeMultiplier),
        );
        layoutSignatureRef.current = layoutSignature;
      }
    }

    const damping = 1 - Math.exp(-delta * INCOMING_SCENE_TUNING.motionDamping);
    const time = state.clock.elapsedTime;
    const idle =
      Math.sin(time * 0.7) *
      MathUtils.degToRad(INCOMING_SCENE_TUNING.idleTwistDegrees);
    const maximumPointerTwist = MathUtils.degToRad(
      INCOMING_SCENE_TUNING.maxPointerTwistDegrees,
    );

    group.rotation.y +=
      (pointer.current.x * maximumPointerTwist + idle - group.rotation.y) *
      damping;
    group.rotation.x +=
      (pointer.current.y *
        maximumPointerTwist *
        INCOMING_SCENE_TUNING.pointerPitchRatio -
        group.rotation.x) *
      damping;
    group.position.y =
      Math.sin(time * 0.8) * INCOMING_SCENE_TUNING.mainFloatAmount;

    if (backdropRef.current) {
      const backdropTwist = MathUtils.degToRad(
        INCOMING_SCENE_TUNING.backdropTwistDegrees,
      );

      backdropRef.current.rotation.y = Math.sin(time * 0.47) * backdropTwist;
      backdropRef.current.rotation.z =
        Math.cos(time * 0.39) * backdropTwist * 0.32;
      backdropRef.current.position.y =
        backdropBaseY.current +
        Math.sin(time * 0.56) * INCOMING_SCENE_TUNING.backdropFloatAmount;
    }
  });

  return (
    <group ref={groupRef}>
      <FintaBackdrop groupRef={backdropRef} />
      <IncomingText color={DRAGON_LUCY.cyan} meshRef={titleRef}>
        INCOMING
      </IncomingText>
      <IncomingText color={DRAGON_LUCY.cyan} meshRef={atRef}>
        @
      </IncomingText>
      <IncomingText
        color={INCOMING_SCENE_TUNING.wordmarkBlue}
        meshRef={fintaRef}
      >
        FINTA
      </IncomingText>
      <IncomingText color={DRAGON_LUCY.cyan} meshRef={seasonRef}>
        (F26)
      </IncomingText>
    </group>
  );
}

/**
 * "INCOMING @ FINTA (F26)" — a three.js canvas with a transparent ASCII
 * filter, so only the glyphs render, floating over the modal. The whole
 * group tilts subtly toward the cursor. Off-screen rendering runs on demand
 * so layout can initialize with the page, then continuous animation starts
 * only while the strip is actually visible.
 */
export default function IncomingSection() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOnScreen, setIsOnScreen] = useState(false);
  const [layoutAspectRatio, setLayoutAspectRatio] = useState<number>();
  const fallbackAspectRatio =
    INCOMING_SCENE_TUNING.fallbackLayoutAspectRatio /
    INCOMING_SCENE_TUNING.sectionSizeMultiplier;
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
      style={{
        aspectRatio: layoutAspectRatio ?? fallbackAspectRatio,
        marginBottom: `${INCOMING_SCENE_TUNING.baseBottomMarginRem * INCOMING_SCENE_TUNING.sectionSizeMultiplier * INCOMING_SCENE_TUNING.bottomWhitespaceMultiplier}rem`,
        marginTop: `${INCOMING_SCENE_TUNING.baseTopMarginRem * INCOMING_SCENE_TUNING.sectionSizeMultiplier * INCOMING_SCENE_TUNING.topWhitespaceMultiplier}rem`,
      }}
    >
      <Canvas
        dpr={CANVAS_DPR}
        flat
        frameloop={isOnScreen ? "always" : "demand"}
        gl={{ alpha: true, antialias: true }}
        camera={{ fov: 42, position: [0, 0, 9.5] }}
      >
        <Suspense fallback={null}>
          <IncomingContent
            onLayoutAspectRatioChange={handleLayoutAspectRatioChange}
          />
        </Suspense>
        <TransparentAsciiRenderer
          baseCellHeight={INCOMING_SCENE_TUNING.glyphCellHeight}
          baseCellWidth={INCOMING_SCENE_TUNING.glyphCellWidth}
        />
      </Canvas>
    </div>
  );
}
