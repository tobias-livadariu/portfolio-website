import { Suspense, useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Text3D, useTexture, View } from "@react-three/drei";
import type { Group, Mesh } from "three";
import { MathUtils, Vector3 } from "three";
import TransparentAsciiRenderer from "../../scene/ascii/TransparentAsciiRenderer";
import { THREE_FONTS } from "../../theme/fonts";
import publicPath from "../../utility/public-path";
import { useScenePointer } from "../components/use-scene-pointer";
import { DRAGON_LUCY } from "../modals.constants";
import { isModalScenePosterCapture } from "./modal-scene-poster-capture";

const FINTA_LOGO_PATH = publicPath("/logos/finta-modified-rmbg.webp");

/* Complete art-direction panel for INCOMING @ Finta. Geometry that is useful
   to tweak is named here instead of being hidden inside the JSX. */
const INCOMING_SCENE_TUNING = {
  // Base CSS margin below the canvas before whitespace multipliers are applied.
  baseBottomMarginRem: 1.25,
  // Base CSS margin above the canvas before whitespace multipliers are applied.
  baseTopMarginRem: 0.5,
  // Base internal whitespace as a fraction of the measured vertical stack.
  baseWhitespaceRelativeToStack: 0.04,
  // Multiplier for bottom internal whitespace and the bottom CSS margin.
  bottomWhitespaceMultiplier: 0,
  // Perspective field of view for the three.js camera, in degrees.
  cameraFieldOfViewDegrees: 42,
  // Camera distance from the scene along the positive Z axis.
  cameraZPosition: 9.5,
  // Distance of each cardinal crosshair tick from the logo center.
  crosshairTickOffset: 0.77,
  // Length of each cardinal crosshair tick.
  crosshairTickLength: 0.22,
  // Thickness of each cardinal crosshair tick.
  crosshairTickThickness: 0.026,
  // Z depth of the logo reticle/decorator group.
  decoratorDepth: -0.12,
  // Vertical floating distance of the logo reticle group.
  decoratorFloatAmount: 0.035,
  // Angular frequency of the reticle's vertical float.
  decoratorFloatSpeed: 0.56,
  // Master scale for rings, ticks, rails, and telemetry blocks.
  decoratorSizeMultiplier: 1,
  // Maximum Y-axis reticle twist, in degrees.
  decoratorTwistDegrees: 7,
  // Angular frequency of reticle twisting.
  decoratorTwistSpeed: 0.47,
  // Reticle width relative to the INCOMING title width.
  decoratorWidthRelativeToTitle: 0.3,
  // Initial aspect ratio used before the measured stack becomes available.
  fallbackLayoutAspectRatio: 1.43,
  // Vertical pixel size of one output glyph in the ASCII renderer.
  asciiGlyphCellHeightPx: 10,
  // Horizontal pixel size of one output glyph in the ASCII renderer.
  asciiGlyphCellWidthPx: 6,
  // Idle Y-axis twist amplitude of the complete composition, in degrees.
  idleTwistDegrees: 1.7,
  // Angular frequency of the complete composition's idle twist.
  idleTwistSpeed: 0.7,
  // Side length of the inner rotating square relative to title width.
  innerSquareSizeRelativeToTitle: 0.5,
  // Color used by the Finta logo reticle and telemetry boxes.
  logoBlue: "#2a42ff",
  // Z depth of the bright Finta logo plane.
  logoDepth: 0.18,
  // Reserved vertical height around the logo relative to title width.
  logoStageHeightRelativeToTitle: 0.48,
  // Finta logo width relative to the INCOMING title width.
  logoWidthRelativeToTitle: 0.3,
  // Vertical floating distance of the complete composition.
  mainFloatAmount: 0.06,
  // Angular frequency of the complete composition's vertical float.
  mainFloatSpeed: 0.8,
  // Maximum pointer-driven composition twist, in degrees.
  maxPointerTwistDegrees: 13.5,
  // Exponential damping strength used while following the pointer.
  motionDamping: 5,
  // Initial Z rotation of the outer square, in degrees.
  outerSquareInitialRotationDegrees: 45,
  // Side length of the outer rotating square relative to title width.
  outerSquareSizeRelativeToTitle: 0.68,
  // Maximum normalized pointer X value used by the scene.
  pointerClampX: 1.2,
  // Maximum normalized pointer Y value used by the scene.
  pointerClampY: 1.6,
  // X-axis pointer tilt relative to the maximum Y-axis twist.
  pointerPitchRatio: 0.5,
  // Glyph scale of (F26) relative to the INCOMING title glyph scale.
  seasonTextSizeRelativeToTitle: 0.8,
  // Master multiplier for the whole scene, including its calculated height.
  sectionSizeMultiplier: 0.78,
  // Thickness of both hollow square outlines relative to title width.
  squareBorderRelativeToTitle: 0.01,
  // Dark blue color shared by both rotating square outlines.
  squareColor: "#106ae0",
  // Z depth of the rotating squares behind the complete composition.
  squareDepth: -0.56,
  // Opacity of both square outlines; raise this for a more defined frame.
  squareOpacity: 0.6,
  // Equal-and-opposite rotation speed of the two squares, in degrees/second.
  squareSpinDegreesPerSecond: 3.6,
  // Vertical gap between INCOMING, @, logo, and (F26), relative to title width.
  stackGapRelativeToTitle: 0.032,
  // Extrusion-depth curve subdivision count used by the Text3D meshes.
  textCurveSegments: 2,
  // Front-to-back extrusion depth of INCOMING, @, and (F26).
  textExtrusionDepth: 0.14,
  // Natural unscaled font size passed into Text3D.
  textNaturalSize: 1,
  // Vertical spacing between each telemetry-box row.
  telemetryBoxRowSpacing: 0.18,
  // Horizontal distance of the telemetry boxes from the logo center.
  telemetryBoxX: 1.18,
  // Width and height of each of the six telemetry boxes.
  telemetryBoxSize: 0.095,
  // Horizontal distance of each telemetry rail's center from the logo center.
  telemetryRailCenterX: 0.94,
  // Z depth of the telemetry rails inside the reticle group.
  telemetryRailDepth: -0.03,
  // Length of each left and right telemetry rail segment.
  telemetryRailLength: 0.56,
  // Opacity of the telemetry rail segments.
  telemetryRailOpacity: 0.78,
  // Thickness of each telemetry rail; this is the primary rail-weight knob.
  telemetryRailThickness: 0.04,
  // Inner radius of the blue reticle ring around the Finta logo.
  reticleInnerBlueRadius: 0.56,
  // Outer radius of the blue reticle ring around the Finta logo.
  reticleOuterBlueRadius: 0.59,
  // Opacity of the blue reticle ring.
  reticleBlueOpacity: 0.72,
  // Inner radius of the cyan secondary reticle ring.
  reticleInnerCyanRadius: 0.67,
  // Outer radius of the cyan secondary reticle ring.
  reticleOuterCyanRadius: 0.685,
  // Opacity of the cyan secondary reticle ring.
  reticleCyanOpacity: 0.42,
  // Segment count used to make both circular reticles smooth.
  reticleSegments: 72,
  // Local Z depth of the blue reticle ring.
  reticleBlueDepth: -0.04,
  // Local Z depth of the cyan reticle ring.
  reticleCyanDepth: -0.05,
  // Natural layout width used as the reference for relative measurements.
  titleLayoutWidth: 1,
  // Width of INCOMING as a fraction of the canvas viewport.
  titleViewportWidth: 0.9,
  // Multiplier for top internal whitespace and the top CSS margin.
  topWhitespaceMultiplier: 0,
} as const;

function FintaDecorators({
  groupRef,
}: {
  groupRef: React.RefObject<Group | null>;
}) {
  return (
    <group ref={groupRef} visible={false}>
      <group scale={INCOMING_SCENE_TUNING.decoratorSizeMultiplier}>
        <mesh position={[0, 0, INCOMING_SCENE_TUNING.reticleBlueDepth]}>
          <ringGeometry
            args={[
              INCOMING_SCENE_TUNING.reticleInnerBlueRadius,
              INCOMING_SCENE_TUNING.reticleOuterBlueRadius,
              INCOMING_SCENE_TUNING.reticleSegments,
            ]}
          />
          <meshBasicMaterial
            color={INCOMING_SCENE_TUNING.logoBlue}
            opacity={INCOMING_SCENE_TUNING.reticleBlueOpacity}
            transparent
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0, INCOMING_SCENE_TUNING.reticleCyanDepth]}>
          <ringGeometry
            args={[
              INCOMING_SCENE_TUNING.reticleInnerCyanRadius,
              INCOMING_SCENE_TUNING.reticleOuterCyanRadius,
              INCOMING_SCENE_TUNING.reticleSegments,
            ]}
          />
          <meshBasicMaterial
            color={DRAGON_LUCY.cyan}
            opacity={INCOMING_SCENE_TUNING.reticleCyanOpacity}
            transparent
            toneMapped={false}
          />
        </mesh>

        {[
          [0, INCOMING_SCENE_TUNING.crosshairTickOffset, 0],
          [0, -INCOMING_SCENE_TUNING.crosshairTickOffset, 0],
          [INCOMING_SCENE_TUNING.crosshairTickOffset, 0, Math.PI / 2],
          [-INCOMING_SCENE_TUNING.crosshairTickOffset, 0, Math.PI / 2],
        ].map(([x, y, rotation], index) => (
          <mesh key={index} position={[x, y, 0]} rotation={[0, 0, rotation]}>
            <planeGeometry
              args={[
                INCOMING_SCENE_TUNING.crosshairTickLength,
                INCOMING_SCENE_TUNING.crosshairTickThickness,
              ]}
            />
            <meshBasicMaterial color={DRAGON_LUCY.cyan} toneMapped={false} />
          </mesh>
        ))}

        {[
          -INCOMING_SCENE_TUNING.telemetryBoxRowSpacing,
          0,
          INCOMING_SCENE_TUNING.telemetryBoxRowSpacing,
        ].flatMap((y, rowIndex) =>
          [-1, 1].map((side) => (
            <mesh
              key={`${rowIndex}-${side}`}
              position={[side * INCOMING_SCENE_TUNING.telemetryBoxX, y, 0]}
            >
              <planeGeometry
                args={[
                  INCOMING_SCENE_TUNING.telemetryBoxSize,
                  INCOMING_SCENE_TUNING.telemetryBoxSize,
                ]}
              />
              <meshBasicMaterial
                color={INCOMING_SCENE_TUNING.logoBlue}
                toneMapped={false}
              />
            </mesh>
          )),
        )}

        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[
              side * INCOMING_SCENE_TUNING.telemetryRailCenterX,
              0,
              INCOMING_SCENE_TUNING.telemetryRailDepth,
            ]}
          >
            <planeGeometry
              args={[
                INCOMING_SCENE_TUNING.telemetryRailLength,
                INCOMING_SCENE_TUNING.telemetryRailThickness,
              ]}
            />
            <meshBasicMaterial
              color={DRAGON_LUCY.cyan}
              opacity={INCOMING_SCENE_TUNING.telemetryRailOpacity}
              transparent
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function HollowSquare({ size }: { size: number }) {
  const border = INCOMING_SCENE_TUNING.squareBorderRelativeToTitle;
  const material = (
    <meshBasicMaterial
      color={INCOMING_SCENE_TUNING.squareColor}
      depthWrite={false}
      opacity={INCOMING_SCENE_TUNING.squareOpacity}
      toneMapped={false}
      transparent
    />
  );

  return (
    <>
      {[-1, 1].map((side) => (
        <mesh key={`horizontal-${side}`} position={[0, (side * size) / 2, 0]}>
          <planeGeometry args={[size, border]} />
          {material}
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`vertical-${side}`} position={[(side * size) / 2, 0, 0]}>
          <planeGeometry args={[border, size]} />
          {material}
        </mesh>
      ))}
    </>
  );
}

function SquareField({
  innerRef,
  outerRef,
}: {
  innerRef: React.RefObject<Group | null>;
  outerRef: React.RefObject<Group | null>;
}) {
  return (
    <group position={[0, 0, INCOMING_SCENE_TUNING.squareDepth]}>
      <group ref={outerRef}>
        <HollowSquare
          size={INCOMING_SCENE_TUNING.outerSquareSizeRelativeToTitle}
        />
      </group>
      <group ref={innerRef}>
        <HollowSquare
          size={INCOMING_SCENE_TUNING.innerSquareSizeRelativeToTitle}
        />
      </group>
    </group>
  );
}

function FintaLogo({ meshRef }: { meshRef: React.RefObject<Mesh | null> }) {
  const texture = useTexture(FINTA_LOGO_PATH);

  return (
    <mesh ref={meshRef} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent />
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
      curveSegments={INCOMING_SCENE_TUNING.textCurveSegments}
      font={THREE_FONTS.pixelEmulator}
      height={INCOMING_SCENE_TUNING.textExtrusionDepth}
      ref={meshRef}
      size={INCOMING_SCENE_TUNING.textNaturalSize}
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
  trackRef,
}: {
  onLayoutAspectRatioChange: (aspectRatio: number) => void;
  trackRef: RefObject<HTMLElement | null>;
}) {
  const groupRef = useRef<Group>(null);
  const decoratorRef = useRef<Group>(null);
  const innerSquareRef = useRef<Group>(null);
  const outerSquareRef = useRef<Group>(null);
  const titleRef = useRef<Mesh>(null);
  const atRef = useRef<Mesh>(null);
  const logoRef = useRef<Mesh>(null);
  const seasonRef = useRef<Mesh>(null);
  const decoratorBaseY = useRef(0);
  const layoutSignatureRef = useRef("");
  const pointer = useScenePointer(trackRef, {
    clampX: INCOMING_SCENE_TUNING.pointerClampX,
    clampY: INCOMING_SCENE_TUNING.pointerClampY,
  });

  useFrame((state, delta) => {
    const group = groupRef.current;
    const trackRect = trackRef.current?.getBoundingClientRect();

    if (!group || !trackRect || trackRect.width <= 0 || trackRect.height <= 0) {
      return;
    }

    const perspectiveCamera = state.camera as typeof state.camera & {
      aspect?: number;
      isPerspectiveCamera?: boolean;
    };
    const nextAspect = trackRect.width / trackRect.height;

    if (
      perspectiveCamera.isPerspectiveCamera &&
      perspectiveCamera.aspect !== nextAspect
    ) {
      perspectiveCamera.aspect = nextAspect;
      perspectiveCamera.updateProjectionMatrix();
    }

    const viewport = state.viewport.getCurrentViewport(
      state.camera,
      [0, 0, 0],
      {
        height: trackRect.height,
        left: 0,
        top: 0,
        width: trackRect.width,
      },
    );

    const layoutSignature = [
      viewport.width,
      viewport.height,
      INCOMING_SCENE_TUNING.sectionSizeMultiplier,
      INCOMING_SCENE_TUNING.logoWidthRelativeToTitle,
      INCOMING_SCENE_TUNING.decoratorWidthRelativeToTitle,
      INCOMING_SCENE_TUNING.decoratorSizeMultiplier,
      INCOMING_SCENE_TUNING.seasonTextSizeRelativeToTitle,
      INCOMING_SCENE_TUNING.topWhitespaceMultiplier,
      INCOMING_SCENE_TUNING.bottomWhitespaceMultiplier,
      titleRef.current?.geometry.uuid,
      atRef.current?.geometry.uuid,
      logoRef.current?.geometry.uuid,
      seasonRef.current?.geometry.uuid,
    ].join("|");

    if (layoutSignature !== layoutSignatureRef.current) {
      const title = measureItem(
        titleRef.current,
        INCOMING_SCENE_TUNING.titleLayoutWidth,
      );
      const logo = measureItem(
        logoRef.current,
        INCOMING_SCENE_TUNING.titleLayoutWidth *
          INCOMING_SCENE_TUNING.logoWidthRelativeToTitle,
      );
      const logoStage = logo
        ? {
            ...logo,
            height: Math.max(
              logo.height,
              INCOMING_SCENE_TUNING.titleLayoutWidth *
                INCOMING_SCENE_TUNING.logoStageHeightRelativeToTitle,
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
        logoStage,
        season,
      ]);

      if (layout && logoStage && decoratorRef.current) {
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
        const logoCenter = itemCenters.get(logoStage.mesh) ?? 0;

        logoStage.mesh.position.z = INCOMING_SCENE_TUNING.logoDepth;
        decoratorRef.current.position.set(
          0,
          logoCenter,
          INCOMING_SCENE_TUNING.decoratorDepth,
        );
        decoratorRef.current.scale.setScalar(
          INCOMING_SCENE_TUNING.titleLayoutWidth *
            INCOMING_SCENE_TUNING.decoratorWidthRelativeToTitle,
        );
        decoratorRef.current.visible = true;
        decoratorBaseY.current = logoCenter;
        group.scale.setScalar(fitTitleToWidth(viewport.width));
        onLayoutAspectRatioChange(
          INCOMING_SCENE_TUNING.titleLayoutWidth /
            ((layout.height + topWhitespace + bottomWhitespace) *
              INCOMING_SCENE_TUNING.sectionSizeMultiplier),
        );
        layoutSignatureRef.current = layoutSignature;
      }
    }

    if (isModalScenePosterCapture()) {
      group.position.y = 0;
      group.rotation.set(0, 0, 0);
      if (decoratorRef.current) {
        decoratorRef.current.position.y = decoratorBaseY.current;
        decoratorRef.current.rotation.set(0, 0, 0);
      }
      if (outerSquareRef.current && innerSquareRef.current) {
        outerSquareRef.current.rotation.z = MathUtils.degToRad(
          INCOMING_SCENE_TUNING.outerSquareInitialRotationDegrees,
        );
        innerSquareRef.current.rotation.z = 0;
      }
      return;
    }

    const damping = 1 - Math.exp(-delta * INCOMING_SCENE_TUNING.motionDamping);
    const time = state.clock.elapsedTime;
    const idle =
      Math.sin(time * INCOMING_SCENE_TUNING.idleTwistSpeed) *
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
      Math.sin(time * INCOMING_SCENE_TUNING.mainFloatSpeed) *
      INCOMING_SCENE_TUNING.mainFloatAmount;

    if (decoratorRef.current) {
      const decoratorTwist = MathUtils.degToRad(
        INCOMING_SCENE_TUNING.decoratorTwistDegrees,
      );

      decoratorRef.current.rotation.y =
        Math.sin(time * INCOMING_SCENE_TUNING.decoratorTwistSpeed) *
        decoratorTwist;
      decoratorRef.current.position.y =
        decoratorBaseY.current +
        Math.sin(time * INCOMING_SCENE_TUNING.decoratorFloatSpeed) *
          INCOMING_SCENE_TUNING.decoratorFloatAmount;
    }

    if (outerSquareRef.current && innerSquareRef.current) {
      const spin = MathUtils.degToRad(
        time * INCOMING_SCENE_TUNING.squareSpinDegreesPerSecond,
      );

      outerSquareRef.current.rotation.z =
        MathUtils.degToRad(
          INCOMING_SCENE_TUNING.outerSquareInitialRotationDegrees,
        ) + spin;
      innerSquareRef.current.rotation.z = -spin;
    }
  });

  return (
    <group ref={groupRef}>
      <SquareField innerRef={innerSquareRef} outerRef={outerSquareRef} />
      <FintaDecorators groupRef={decoratorRef} />
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
 * "INCOMING @ FINTA (F26)" — a three.js canvas with a transparent ASCII
 * filter, so only the glyphs render, floating over the modal. The whole
 * group tilts subtly toward the cursor. Off-screen rendering runs on demand
 * so layout can initialize with the page, then continuous animation starts
 * only while the strip is actually visible.
 */
export default function IncomingSection() {
  const contentRef = useRef<Group>(null);
  const viewRef = useRef<HTMLElement>(null);
  const [layoutAspectRatio, setLayoutAspectRatio] = useState<number>();
  const [isSceneReady, setIsSceneReady] = useState(false);
  const fallbackAspectRatio = INCOMING_SCENE_TUNING.fallbackLayoutAspectRatio;
  const handleLayoutAspectRatioChange = useCallback((aspectRatio: number) => {
    setLayoutAspectRatio((current) =>
      current !== undefined && Math.abs(current - aspectRatio) < 0.0001
        ? current
        : aspectRatio,
    );
  }, []);

  return (
    <div
      className="modal-incoming"
      aria-label="Incoming: Finta, Fall 2026"
      style={{
        aspectRatio: layoutAspectRatio ?? fallbackAspectRatio,
        marginBottom: `${INCOMING_SCENE_TUNING.baseBottomMarginRem * INCOMING_SCENE_TUNING.sectionSizeMultiplier * INCOMING_SCENE_TUNING.bottomWhitespaceMultiplier}rem`,
        marginTop: `${INCOMING_SCENE_TUNING.baseTopMarginRem * INCOMING_SCENE_TUNING.sectionSizeMultiplier * INCOMING_SCENE_TUNING.topWhitespaceMultiplier}rem`,
      }}
    >
      <img
        alt=""
        aria-hidden="true"
        className="modal-r3f-scene-poster"
        data-scene-ready={isSceneReady ? "true" : undefined}
        src={publicPath("/posters/modal-incoming.svg")}
      />
      <View
        as="canvas"
        className="modal-shared-scene-view"
        frames={Infinity}
        index={2}
        ref={viewRef}
        visible={false}
      >
        <PerspectiveCamera
          makeDefault
          fov={INCOMING_SCENE_TUNING.cameraFieldOfViewDegrees}
          position={[0, 0, INCOMING_SCENE_TUNING.cameraZPosition]}
        />
        <Suspense fallback={null}>
          <group ref={contentRef} visible={false}>
            <IncomingContent
              onLayoutAspectRatioChange={handleLayoutAspectRatioChange}
              trackRef={viewRef}
            />
          </group>
        </Suspense>
        <TransparentAsciiRenderer
          baseCellHeight={INCOMING_SCENE_TUNING.asciiGlyphCellHeightPx}
          baseCellWidth={INCOMING_SCENE_TUNING.asciiGlyphCellWidthPx}
          contentRef={contentRef}
          onReady={() => setIsSceneReady(true)}
          renderPriority={3}
          trackRef={viewRef}
        />
      </View>
    </div>
  );
}
