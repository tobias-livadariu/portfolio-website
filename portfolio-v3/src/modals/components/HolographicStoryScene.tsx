import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Text3D, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { MathUtils, Vector3 } from "three";
import TransparentAsciiRenderer from "../../scene/ascii/TransparentAsciiRenderer";
import { CANVAS_DPR } from "../../scene/canvas.constants";
import { THREE_FONTS } from "../../theme/fonts";
import publicPath from "../../utility/public-path";
import { DRAGON_LUCY } from "../modals.constants";
import { TerminalTranscriptLine } from "./Terminal";
import { useTerminalContentColumns } from "./use-terminal-content-columns";

/* Shared story-scene tuning knobs. These are intentionally collected here so
   the hologram can be art-directed without hunting through render code. */
const STORY_SCENE_TUNING = {
  cardMaxColumns: 96,
  decoratorSizeMultiplier: 1,
  glyphCellHeight: 9,
  glyphCellWidth: 5,
  heroLinesNarrow: 24,
  heroLinesRegular: 26,
  heroLinesWide: 28,
  heroNarrowMaxColumns: 40,
  heroRegularMaxColumns: 72,
  logoFloatAmount: 0.05,
  logoMaxHeightRelativeToViewport: 0.32,
  logoTwistDegrees: { x: 4, y: 9.2, z: 1.4 },
  logoWidthRelativeToViewport: 0.28,
  logoYRelativeToViewport: -0.29,
  motionDamping: 5,
  railScaleRelativeToViewport: 0.13,
  railYRelativeToViewport: -0.13,
  subtitleDepth: 0.12,
  subtitleFloatAmount: 0.025,
  subtitleMaxHeightRelativeToViewport: 0.13,
  subtitleOffsetRelativeToViewport: 0.095,
  subtitleWidthRelativeToViewport: 0.82,
  titleCursorActivationDistance: 0.075,
  titleCursorBlendDistance: 0.14,
  titleCursorRegionHalfHeight: 0.145,
  titleCursorRegionHalfWidth: 0.47,
  titleDepth: -1.1,
  titleFloatAmount: 0.035,
  titleIdleTwistDegrees: 4.3,
  titleMaxHeightRelativeToViewport: 0.225,
  titleMaxTwistDegrees: 12,
  titleWidthRelativeToViewport: 0.94,
  titleYRelativeToViewport: 0.315,
} as const;

export type StoryFrame = "bracket" | "circuit" | "double";
export type StoryTheme = "cyan" | "mint";

export interface StoryHighlight {
  body: string;
  frame: StoryFrame;
  impact: string;
  stack: string;
  title: string;
}

export interface HolographicStoryDefinition {
  company: string;
  highlights: readonly StoryHighlight[];
  logoPath: string;
  motionPhase: number;
  subtitle: readonly [string, string];
  theme: StoryTheme;
}

interface StoryPalette {
  accent: string;
  primary: string;
}

interface RowSegment {
  className?: string;
  text: string;
}

type StoryRow = RowSegment[];

interface WrappedTextLine {
  start: number;
  text: string;
}

interface FrameCharacters {
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  topLeft: string;
  topRight: string;
  vertical: string;
}

const PALETTES: Record<StoryTheme, StoryPalette> = {
  cyan: {
    accent: DRAGON_LUCY.lavender,
    primary: DRAGON_LUCY.cyan,
  },
  mint: {
    accent: DRAGON_LUCY.yellow,
    primary: DRAGON_LUCY.mint,
  },
};

const FRAME_CHARACTERS: Record<StoryFrame, FrameCharacters> = {
  bracket: {
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    topLeft: "┌",
    topRight: "┐",
    vertical: "│",
  },
  circuit: {
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "·",
    topLeft: "╭",
    topRight: "╮",
    vertical: "│",
  },
  double: {
    bottomLeft: "╚",
    bottomRight: "╝",
    horizontal: "═",
    topLeft: "╔",
    topRight: "╗",
    vertical: "║",
  },
};

function wrapWords(text: string, width: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if (!line) {
      line = word;
    } else if (`${line} ${word}`.length <= width) {
      line = `${line} ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

function wrapWordsWithOffsets(text: string, width: number) {
  const source = text.trim();
  const words = Array.from(source.matchAll(/\S+/g));
  const lines: WrappedTextLine[] = [];
  let line = "";
  let lineStart = 0;
  let previousWordEnd = 0;

  for (const wordMatch of words) {
    const word = wordMatch[0];
    const wordStart = wordMatch.index;

    if (!line) {
      line = word;
      lineStart = wordStart;
    } else {
      const separator = source.slice(previousWordEnd, wordStart);

      if (`${line}${separator}${word}`.length <= width) {
        line = `${line}${separator}${word}`;
      } else {
        lines.push({ start: lineStart, text: line });
        line = word;
        lineStart = wordStart;
      }
    }

    previousWordEnd = wordStart + word.length;
  }

  if (line) {
    lines.push({ start: lineStart, text: line });
  }

  return lines;
}

function impactAccentIndices(labelLength: number, impact: string) {
  const normalized = impact.trim().replace(/\s+/g, " ");
  const indices = new Set<number>();

  for (const wordMatch of normalized.matchAll(/\S+/g)) {
    const word = wordMatch[0];
    const wordCharacters = word.match(/[A-Za-z0-9]/g)?.length ?? 0;
    const firstCharacter = word.search(/[A-Za-z0-9]/);

    if (wordCharacters > 6 && firstCharacter >= 0) {
      indices.add(labelLength + wordMatch.index + firstCharacter);
    }
  }

  return indices;
}

function stackAccentIndices(labelLength: number, stack: string) {
  const normalized = stack.trim().replace(/\s+/g, " ");
  const indices = new Set<number>();

  for (const technologyMatch of normalized.matchAll(/[^/]+/g)) {
    const firstCharacter = technologyMatch[0].search(/[A-Za-z0-9]/);

    if (firstCharacter >= 0) {
      indices.add(labelLength + technologyMatch.index + firstCharacter);
    }
  }

  return indices;
}

function styledContentSegments({
  accentIndices,
  content,
  contentClassName,
  labelLength,
  lineStart,
}: {
  accentIndices?: ReadonlySet<number>;
  content: string;
  contentClassName: string;
  labelLength: number;
  lineStart: number;
}) {
  const segments: StoryRow = [];

  for (let index = 0; index < content.length; index += 1) {
    const absoluteIndex = lineStart + index;
    const className =
      absoluteIndex < labelLength
        ? "modal-story-meta-label"
        : accentIndices?.has(absoluteIndex)
          ? "modal-story-meta-accent"
          : contentClassName;
    const previous = segments.at(-1);

    if (previous?.className === className) {
      previous.text += content[index];
    } else {
      segments.push({ className, text: content[index] });
    }
  }

  return segments;
}

function fitText(text: string, width: number) {
  return text.length <= width
    ? text
    : `${text.slice(0, Math.max(0, width - 1))}…`;
}

function framedTextRow({
  accentIndices,
  characters,
  content,
  contentClassName = "modal-story-body",
  indent,
  innerWidth,
  labelLength = 0,
  lineStart = 0,
}: {
  accentIndices?: ReadonlySet<number>;
  characters: FrameCharacters;
  content: string;
  contentClassName?: string;
  indent: number;
  innerWidth: number;
  labelLength?: number;
  lineStart?: number;
}): StoryRow {
  const fitted = fitText(content, innerWidth);

  return [
    {
      className: "modal-story-frame",
      text: `${" ".repeat(indent)}${characters.vertical} `,
    },
    ...styledContentSegments({
      accentIndices,
      content: fitted,
      contentClassName,
      labelLength,
      lineStart,
    }),
    {
      className: "modal-story-frame",
      text: `${" ".repeat(Math.max(0, innerWidth - fitted.length))} ${characters.vertical}`,
    },
  ];
}

function buildHighlightRows(
  highlight: StoryHighlight,
  index: number,
  columns: number,
): StoryRow[] {
  const characters = FRAME_CHARACTERS[highlight.frame];
  const cardWidth = Math.max(
    22,
    Math.min(columns, STORY_SCENE_TUNING.cardMaxColumns),
  );
  const indent = Math.max(0, Math.floor((columns - cardWidth) / 2));
  const innerWidth = cardWidth - 4;
  const title = fitText(
    `${String(index).padStart(2, "0")} // ${highlight.title}`,
    cardWidth - 6,
  );
  const titleFill = Math.max(0, cardWidth - title.length - 5);
  const rows: StoryRow[] = [
    [
      {
        className: "modal-story-frame modal-story-heading",
        text: `${" ".repeat(indent)}${characters.topLeft}${characters.horizontal} ${title} ${characters.horizontal.repeat(titleFill)}${characters.topRight}`,
      },
    ],
  ];

  for (const line of wrapWords(highlight.body, innerWidth)) {
    rows.push(framedTextRow({ characters, content: line, indent, innerWidth }));
  }

  const impactLabel = "IMPACT // ";
  const impactText = `${impactLabel}${highlight.impact}`;
  const impactAccents = impactAccentIndices(
    impactLabel.length,
    highlight.impact,
  );
  for (const line of wrapWordsWithOffsets(impactText, innerWidth)) {
    rows.push(
      framedTextRow({
        accentIndices: impactAccents,
        characters,
        content: line.text,
        contentClassName: "modal-story-meta",
        indent,
        innerWidth,
        labelLength: impactLabel.length,
        lineStart: line.start,
      }),
    );
  }

  const stackLabel = "STACK  // ";
  const stackText = `${stackLabel}${highlight.stack}`;
  const stackAccents = stackAccentIndices(stackLabel.length, highlight.stack);
  for (const line of wrapWordsWithOffsets(stackText, innerWidth)) {
    rows.push(
      framedTextRow({
        accentIndices: stackAccents,
        characters,
        content: line.text,
        contentClassName: "modal-story-meta",
        indent,
        innerWidth,
        labelLength: stackLabel.length,
        lineStart: line.start,
      }),
    );
  }

  rows.push([
    {
      className: "modal-story-frame",
      text: `${" ".repeat(indent)}${characters.bottomLeft}${characters.horizontal.repeat(cardWidth - 2)}${characters.bottomRight}`,
    },
  ]);

  return rows;
}

function buildStoryRows(
  highlights: readonly StoryHighlight[],
  columns: number,
) {
  return highlights.flatMap((highlight, index) => [
    [{ text: " " }],
    ...buildHighlightRows(highlight, index, columns),
  ]);
}

function centerMeshAtWidth(
  mesh: Mesh | null,
  targetWidth: number,
  maximumHeight = Number.POSITIVE_INFINITY,
) {
  if (!mesh) {
    return false;
  }

  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox;

  if (!bounds) {
    return false;
  }

  const size = bounds.getSize(new Vector3());

  if (size.x <= 0 || size.y <= 0) {
    return false;
  }

  const center = bounds.getCenter(new Vector3());
  const scale = Math.min(targetWidth / size.x, maximumHeight / size.y);

  mesh.scale.setScalar(scale);
  mesh.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  mesh.visible = true;
  return true;
}

function HologramText({
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
      height={0.12}
      ref={meshRef}
      size={1}
      visible={false}
    >
      {children}
      <meshBasicMaterial color={color} toneMapped={false} />
    </Text3D>
  );
}

function HologramLogo({
  accent,
  logoPath,
  meshRef,
}: {
  accent: string;
  logoPath: string;
  meshRef: React.RefObject<Mesh | null>;
}) {
  const texture = useTexture(publicPath(logoPath));

  return (
    <>
      <group scale={STORY_SCENE_TUNING.decoratorSizeMultiplier}>
        <mesh position={[0, 0, -0.08]}>
          <ringGeometry args={[0.58, 0.61, 72]} />
          <meshBasicMaterial
            color={accent}
            opacity={0.58}
            toneMapped={false}
            transparent
          />
        </mesh>
        {[
          [0, 0.7, 0, 0.18],
          [0, -0.7, 0, 0.18],
          [0.7, 0, Math.PI / 2, 0.18],
          [-0.7, 0, Math.PI / 2, 0.18],
        ].map(([x, y, rotation, width], index) => (
          <mesh key={index} position={[x, y, 0]} rotation={[0, 0, rotation]}>
            <planeGeometry args={[width, 0.025]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh ref={meshRef} visible={false}>
        <planeGeometry args={[0.86, 0.86]} />
        <meshBasicMaterial map={texture} toneMapped={false} transparent />
      </mesh>
    </>
  );
}

function distanceFromRectangle(
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
) {
  const outsideX = Math.max(Math.abs(x) - halfWidth, 0);
  const outsideY = Math.max(Math.abs(y) - halfHeight, 0);
  return Math.hypot(outsideX, outsideY);
}

function TelemetryRail({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[-1.52, 0, 0]}>
        <planeGeometry args={[1.7, 0.025]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[1.52, 0, 0]}>
        <planeGeometry args={[1.7, 0.025]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {[-0.53, 0, 0.53].flatMap((offset, sideIndex) =>
        [-1, 1].map((side) => (
          <mesh
            key={`${sideIndex}-${side}`}
            position={[side * (2.52 + offset * 0.34), 0, 0]}
          >
            <planeGeometry args={[0.085, 0.085]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        )),
      )}
    </group>
  );
}

function HologramContent({
  definition,
  motionEnabled,
}: {
  definition: HolographicStoryDefinition;
  motionEnabled: boolean;
}) {
  const titleGroupRef = useRef<Group>(null);
  const subtitleGroupRef = useRef<Group>(null);
  const logoGroupRef = useRef<Group>(null);
  const railGroupRef = useRef<Group>(null);
  const titleRef = useRef<Mesh>(null);
  const subtitleTopRef = useRef<Mesh>(null);
  const subtitleBottomRef = useRef<Mesh>(null);
  const logoRef = useRef<Mesh>(null);
  const pointer = useRef({ isInsideCanvas: false, x: 0, y: 0 });
  const basePositions = useRef({ logoY: 0, subtitleY: 0, titleY: 0 });
  const layoutSignatureRef = useRef("");
  const { gl, viewport } = useThree();
  const palette = PALETTES[definition.theme];

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (event.clientY - rect.top - rect.height / 2) / rect.height;

      pointer.current = {
        isInsideCanvas: x >= -0.5 && x <= 0.5 && y >= -0.5 && y <= 0.5,
        x: MathUtils.clamp(x, -1.2, 1.2),
        y: MathUtils.clamp(y, -1.4, 1.4),
      };
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [gl]);

  useFrame((state, delta) => {
    const titleGroup = titleGroupRef.current;
    const subtitleGroup = subtitleGroupRef.current;
    const logoGroup = logoGroupRef.current;
    const railGroup = railGroupRef.current;

    if (!titleGroup || !subtitleGroup || !logoGroup || !railGroup) {
      return;
    }

    const layoutSignature = [
      viewport.width,
      viewport.height,
      definition.company,
      definition.subtitle.join("/"),
      titleRef.current?.geometry.uuid,
      subtitleTopRef.current?.geometry.uuid,
      subtitleBottomRef.current?.geometry.uuid,
      logoRef.current?.geometry.uuid,
    ].join("|");

    if (layoutSignature !== layoutSignatureRef.current) {
      const titleReady = centerMeshAtWidth(
        titleRef.current,
        viewport.width * STORY_SCENE_TUNING.titleWidthRelativeToViewport,
        viewport.height * STORY_SCENE_TUNING.titleMaxHeightRelativeToViewport,
      );
      const subtitleTopReady = centerMeshAtWidth(
        subtitleTopRef.current,
        viewport.width * STORY_SCENE_TUNING.subtitleWidthRelativeToViewport,
        viewport.height *
          STORY_SCENE_TUNING.subtitleMaxHeightRelativeToViewport,
      );
      const subtitleBottomReady = centerMeshAtWidth(
        subtitleBottomRef.current,
        viewport.width * STORY_SCENE_TUNING.subtitleWidthRelativeToViewport,
        viewport.height *
          STORY_SCENE_TUNING.subtitleMaxHeightRelativeToViewport,
      );

      if (
        titleReady &&
        subtitleTopReady &&
        subtitleBottomReady &&
        subtitleTopRef.current &&
        subtitleBottomRef.current &&
        logoRef.current
      ) {
        const logoSize = Math.min(
          viewport.width * STORY_SCENE_TUNING.logoWidthRelativeToViewport,
          viewport.height * STORY_SCENE_TUNING.logoMaxHeightRelativeToViewport,
        );
        const titleY =
          viewport.height * STORY_SCENE_TUNING.titleYRelativeToViewport;
        const subtitleY = 0;
        const subtitleOffset =
          viewport.height * STORY_SCENE_TUNING.subtitleOffsetRelativeToViewport;
        const logoY =
          viewport.height * STORY_SCENE_TUNING.logoYRelativeToViewport;

        titleGroup.position.set(0, titleY, STORY_SCENE_TUNING.titleDepth);
        subtitleGroup.position.set(
          0,
          subtitleY,
          STORY_SCENE_TUNING.subtitleDepth,
        );
        subtitleTopRef.current.position.y += subtitleOffset;
        subtitleBottomRef.current.position.y -= subtitleOffset;
        logoGroup.position.set(0, logoY, 0);
        logoGroup.scale.setScalar(logoSize);
        logoRef.current.visible = true;
        railGroup.position.set(
          0,
          viewport.height * STORY_SCENE_TUNING.railYRelativeToViewport,
          -0.06,
        );
        railGroup.scale.setScalar(
          viewport.width *
            STORY_SCENE_TUNING.railScaleRelativeToViewport *
            STORY_SCENE_TUNING.decoratorSizeMultiplier,
        );
        basePositions.current = { logoY, subtitleY, titleY };
        layoutSignatureRef.current = layoutSignature;
      }
    }

    const { logoY, subtitleY, titleY } = basePositions.current;

    if (!motionEnabled) {
      titleGroup.rotation.set(0, 0, 0);
      subtitleGroup.rotation.set(0, 0, 0);
      logoGroup.rotation.set(0, 0, 0);
      railGroup.rotation.set(0, 0, 0);
      titleGroup.position.y = titleY;
      subtitleGroup.position.y = subtitleY;
      logoGroup.position.y = logoY;
      return;
    }

    const time = state.clock.elapsedTime + definition.motionPhase;
    const damping = 1 - Math.exp(-delta * STORY_SCENE_TUNING.motionDamping);
    const idleTwist = MathUtils.degToRad(
      STORY_SCENE_TUNING.titleIdleTwistDegrees,
    );
    const maximumTwist = MathUtils.degToRad(
      STORY_SCENE_TUNING.titleMaxTwistDegrees,
    );
    const subtitleRotationX = Math.sin(time * 0.72) * idleTwist;
    const subtitleRotationY = Math.cos(time * 0.51) * idleTwist * 0.55;
    const subtitleRotationZ = Math.sin(time * 0.63) * idleTwist * 0.6;
    const titleCenterY = -STORY_SCENE_TUNING.titleYRelativeToViewport;
    const titleDistance = pointer.current.isInsideCanvas
      ? distanceFromRectangle(
          pointer.current.x,
          pointer.current.y - titleCenterY,
          STORY_SCENE_TUNING.titleCursorRegionHalfWidth,
          STORY_SCENE_TUNING.titleCursorRegionHalfHeight,
        )
      : Number.POSITIVE_INFINITY;
    const pointerInfluence =
      1 -
      MathUtils.smoothstep(
        titleDistance,
        STORY_SCENE_TUNING.titleCursorActivationDistance,
        STORY_SCENE_TUNING.titleCursorBlendDistance,
      );
    const pointerRotationX =
      MathUtils.clamp(
        (pointer.current.y - titleCenterY) /
          STORY_SCENE_TUNING.titleCursorRegionHalfHeight,
        -1,
        1,
      ) *
      maximumTwist *
      0.48;
    const pointerRotationY =
      MathUtils.clamp(
        pointer.current.x / STORY_SCENE_TUNING.titleCursorRegionHalfWidth,
        -1,
        1,
      ) * maximumTwist;
    const titleRotationX = MathUtils.lerp(
      -subtitleRotationX,
      pointerRotationX,
      pointerInfluence,
    );
    const titleRotationY = MathUtils.lerp(
      -subtitleRotationY,
      pointerRotationY,
      pointerInfluence,
    );
    const titleRotationZ = MathUtils.lerp(
      -subtitleRotationZ,
      0,
      pointerInfluence,
    );

    titleGroup.rotation.x += (titleRotationX - titleGroup.rotation.x) * damping;
    titleGroup.rotation.y += (titleRotationY - titleGroup.rotation.y) * damping;
    titleGroup.rotation.z += (titleRotationZ - titleGroup.rotation.z) * damping;
    titleGroup.position.y =
      titleY + Math.sin(time * 0.58) * STORY_SCENE_TUNING.titleFloatAmount;

    subtitleGroup.rotation.x = subtitleRotationX;
    subtitleGroup.rotation.y = subtitleRotationY;
    subtitleGroup.rotation.z = subtitleRotationZ;
    subtitleGroup.position.y =
      subtitleY + Math.cos(time * 0.7) * STORY_SCENE_TUNING.subtitleFloatAmount;

    logoGroup.rotation.x =
      Math.sin(time * 0.46) *
      MathUtils.degToRad(STORY_SCENE_TUNING.logoTwistDegrees.x);
    logoGroup.rotation.y =
      Math.cos(time * 0.4) *
      MathUtils.degToRad(STORY_SCENE_TUNING.logoTwistDegrees.y);
    logoGroup.rotation.z =
      Math.sin(time * 0.34) *
      MathUtils.degToRad(STORY_SCENE_TUNING.logoTwistDegrees.z);
    logoGroup.position.y =
      logoY + Math.sin(time * 0.5) * STORY_SCENE_TUNING.logoFloatAmount;
    railGroup.rotation.z = Math.sin(time * 0.24) * 0.008;
  });

  return (
    <>
      <group ref={titleGroupRef}>
        <HologramText color={palette.primary} meshRef={titleRef}>
          {definition.company}
        </HologramText>
      </group>
      <group ref={subtitleGroupRef}>
        <HologramText color={palette.accent} meshRef={subtitleTopRef}>
          {definition.subtitle[0]}
        </HologramText>
        <HologramText color={palette.accent} meshRef={subtitleBottomRef}>
          {definition.subtitle[1]}
        </HologramText>
      </group>
      <group ref={railGroupRef}>
        <TelemetryRail color={palette.primary} />
      </group>
      <group ref={logoGroupRef}>
        <HologramLogo
          accent={palette.accent}
          logoPath={definition.logoPath}
          meshRef={logoRef}
        />
      </group>
    </>
  );
}

function getPrefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    getPrefersReducedMotion,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);

    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

export default function HolographicStoryScene({
  definition,
  firstLineNumber,
}: {
  definition: HolographicStoryDefinition;
  firstLineNumber: number;
}) {
  const { columns, measureRef, wrapperRef } = useTerminalContentColumns({
    fallback: 88,
    min: 22,
    step: 2,
  });
  const heroRef = useRef<HTMLDivElement>(null);
  const [isOnScreen, setIsOnScreen] = useState(false);
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionEnabled = motionOverride ?? !prefersReducedMotion;
  const heroLineCount =
    columns < STORY_SCENE_TUNING.heroNarrowMaxColumns
      ? STORY_SCENE_TUNING.heroLinesNarrow
      : columns < STORY_SCENE_TUNING.heroRegularMaxColumns
        ? STORY_SCENE_TUNING.heroLinesRegular
        : STORY_SCENE_TUNING.heroLinesWide;
  const rows = useMemo(
    () => buildStoryRows(definition.highlights, columns),
    [columns, definition.highlights],
  );

  useEffect(() => {
    const hero = heroRef.current;

    if (!hero) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsOnScreen(entry?.isIntersecting ?? false);
    });

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`modal-terminal-wrapped-output modal-holographic-story modal-holographic-story-${definition.theme}`}
      ref={wrapperRef}
    >
      <span className="modal-terminal-ch-measure" ref={measureRef}>
        000000000000000000000000
      </span>

      <section className="modal-visually-hidden">
        <h3>{definition.company}: what I built</h3>
        <p>{definition.subtitle.join(" // ")}</p>
        <ul>
          {definition.highlights.map((highlight) => (
            <li key={highlight.title}>
              <strong>{highlight.title}.</strong> {highlight.body} Impact:{" "}
              {highlight.impact}. Technologies: {highlight.stack}.
            </li>
          ))}
        </ul>
      </section>

      <div className="modal-story-hero" ref={heroRef}>
        <div aria-hidden="true">
          {Array.from({ length: heroLineCount }, (_, index) => (
            <TerminalTranscriptLine
              className="modal-terminal-line-story modal-terminal-line-story-blank"
              key={index}
              lineNumber={firstLineNumber + index}
            >
              {" "}
            </TerminalTranscriptLine>
          ))}
        </div>
        <div aria-hidden="true" className="modal-story-canvas-shell">
          <Canvas
            camera={{ fov: 42, position: [0, 0, 9.5] }}
            dpr={CANVAS_DPR}
            flat
            frameloop={isOnScreen && motionEnabled ? "always" : "demand"}
            gl={{ alpha: true, antialias: true }}
          >
            <Suspense fallback={null}>
              <HologramContent
                definition={definition}
                motionEnabled={motionEnabled}
              />
            </Suspense>
            <TransparentAsciiRenderer
              baseCellHeight={STORY_SCENE_TUNING.glyphCellHeight}
              baseCellWidth={STORY_SCENE_TUNING.glyphCellWidth}
            />
          </Canvas>
        </div>
        <button
          aria-label={
            motionEnabled ? "Pause hologram motion" : "Resume hologram motion"
          }
          className="modal-story-motion-toggle"
          onClick={() => setMotionOverride(!motionEnabled)}
          type="button"
        >
          [motion:{motionEnabled ? "on" : "off"}]
        </button>
      </div>

      <div aria-hidden="true" className="modal-story-cards">
        {rows.map((segments, index) => (
          <TerminalTranscriptLine
            className="modal-terminal-line-story"
            key={index}
            lineNumber={firstLineNumber + heroLineCount + index}
          >
            {segments.map((segment, segmentIndex) => (
              <span className={segment.className} key={segmentIndex}>
                {segment.text}
              </span>
            ))}
          </TerminalTranscriptLine>
        ))}
      </div>
    </div>
  );
}
