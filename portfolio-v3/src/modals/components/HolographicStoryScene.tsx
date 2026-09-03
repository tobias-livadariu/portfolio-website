import { Suspense, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { PerspectiveCamera, Text3D, useTexture, View } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { MathUtils, Vector3 } from "three";
import TransparentAsciiRenderer from "../../scene/ascii/TransparentAsciiRenderer";
import { THREE_FONTS } from "../../theme/fonts";
import publicPath from "../../utility/public-path";
import { DRAGON_LUCY } from "../modals.constants";
import { isModalScenePosterCapture } from "../portfolio/modal-scene-poster-capture";
import { TerminalTranscriptLine } from "./Terminal";
import { useScenePointer } from "./use-scene-pointer";
import { useTerminalContentColumns } from "./use-terminal-content-columns";

/* Complete art-direction panel for both company story scenes. Every visual
   tuning value used by the scene lives here; units are included in names when
   a value is not a dimensionless multiplier. */
const STORY_SCENE_TUNING = {
  // Number of empty terminal rows inserted before each story card.
  cardGapRows: 1,
  // Number of columns consumed by a card's two borders and inner spaces.
  cardInnerWidthReservedColumns: 4,
  // Number of digits used for the zero-based card index (for example, 00).
  cardIndexDigits: 2,
  // Minimum alphanumeric length whose first letter gets an IMPACT accent.
  cardImpactLongWordMinimumCharacters: 7,
  // Widest a story card may grow, measured in terminal character columns.
  cardMaximumWidthColumns: 96,
  // Narrowest a story card may shrink, measured in terminal columns.
  cardMinimumWidthColumns: 22,
  // Columns reserved for title framing while fitting the card heading.
  cardTitleFitReservedColumns: 6,
  // Columns reserved for the heading's corners, spaces, and separator glyphs.
  cardTitleFillReservedColumns: 5,

  // Fallback column count used before the terminal has been measured.
  contentFallbackColumns: 88,
  // Lowest column count returned by the responsive terminal measurement.
  contentMinimumColumns: 22,
  // Column increment used to reduce re-renders during continuous resizing.
  contentSnapStepColumns: 2,
  // Character count in the hidden sample used to calculate one monospace cell.
  contentWidthSampleCharacters: 24,

  // Horizontal pixel size of one output glyph in the ASCII renderer.
  asciiGlyphCellWidthPx: 5,
  // Vertical pixel size of one output glyph in the ASCII renderer.
  asciiGlyphCellHeightPx: 9,

  // Perspective field of view for the three.js camera, in degrees.
  cameraFieldOfViewDegrees: 42,
  // Camera distance from the scene along the positive Z axis.
  cameraZPosition: 9.5,

  // Master scale applied to reticles, ticks, rails, and telemetry blocks.
  decoratorScaleMultiplier: 1,

  // Terminal-row height of the hero below the narrow-width breakpoint.
  heroNarrowLineCount: 20,
  // CSS-pixel width below which the narrow hero height is selected.
  heroNarrowMaxWidthPx: 520,
  // Terminal-row height of the hero between narrow and regular breakpoints.
  heroRegularLineCount: 21,
  // CSS-pixel width below which the regular hero height is selected.
  heroRegularMaxWidthPx: 900,
  // Terminal-row height of the hero at wide widths.
  heroWideLineCount: 28,

  // Vertical distance that the logo floats in scene-world units.
  logoFloatAmplitude: 0.05,
  // Angular frequency of the logo's vertical float, in radians per second.
  logoFloatSpeed: 0.5,
  // Maximum logo height as a fraction of the canvas viewport height.
  logoMaxHeightRelativeToViewport: 0.32,
  // Natural width and height of the square logo plane before group scaling.
  logoPlaneSize: 0.86,
  // Maximum idle rotation amplitudes for the logo, in degrees.
  logoTwistDegrees: {
    // Up/down tilt around the X axis.
    x: 4,
    // Left/right turn around the Y axis.
    y: 9.2,
    // Clockwise/counterclockwise roll around the Z axis.
    z: 1.4,
  },
  // Angular frequencies of the logo twist, in radians per second.
  logoTwistSpeeds: {
    // Speed of X-axis tilt.
    x: 0.46,
    // Speed of Y-axis turning.
    y: 0.4,
    // Speed of Z-axis roll.
    z: 0.34,
  },
  // Target logo width as a fraction of the canvas viewport width.
  logoWidthRelativeToViewport: 0.28,
  // Vertical logo center as a fraction of viewport height; negative is down.
  logoYRelativeToViewport: -0.29,

  // Depth of the logo reticle behind the logo plane.
  logoReticleDepth: -0.08,
  // Inner radius of the thin circular logo reticle in logo-local units.
  logoReticleInnerRadius: 0.58,
  // Outer radius of the thin circular logo reticle in logo-local units.
  logoReticleOuterRadius: 0.61,
  // Opacity of the circular logo reticle.
  logoReticleOpacity: 0.58,
  // Segment count used to make the circular logo reticle smooth.
  logoReticleSegments: 72,
  // Distance from the logo center to each cardinal reticle tick.
  logoReticleTickOffset: 0.7,
  // Length of each cardinal reticle tick.
  logoReticleTickLength: 0.18,
  // Thickness of each cardinal reticle tick.
  logoReticleTickThickness: 0.04,

  // Exponential damping strength used when motion follows a target value.
  motionDamping: 5,

  // Maximum normalized pointer X value used by title tracking.
  pointerClampX: 1.2,
  // Maximum normalized pointer Y value used by title tracking.
  pointerClampY: 1.4,
  // Distance from the title region at which pointer tracking is fully active.
  pointerTitleActivationDistance: 0.075,
  // Distance over which title motion blends from pointer-following to idle.
  pointerTitleBlendDistance: 0.14,
  // Half-height of the normalized rectangular title interaction region.
  pointerTitleRegionHalfHeight: 0.145,
  // Half-width of the normalized rectangular title interaction region.
  pointerTitleRegionHalfWidth: 0.47,

  // Side-to-side spacing added between the three telemetry blocks per side.
  telemetryBlockLocalSpread: 0.53,
  // Multiplier converting block spread into horizontal position changes.
  telemetryBlockPositionMultiplier: 0.34,
  // Base horizontal distance of telemetry blocks from the scene center.
  telemetryBlockPositionX: 2.52,
  // Width and height of each square telemetry block.
  telemetryBlockSize: 0.12,
  // Depth of the complete rail and telemetry-block group.
  telemetryDepth: -0.06,
  // Horizontal distance from center to each rail segment's center.
  telemetryRailCenterX: 1.52,
  // Length of each left and right telemetry rail segment.
  telemetryRailLength: 1.7,
  // Master rail size as a fraction of viewport width.
  telemetryRailScaleRelativeToViewport: 0.13,
  // Thickness of each telemetry rail segment.
  telemetryRailThickness: 0.03,
  // Vertical rail offset from the logo center as a viewport-height fraction.
  telemetryRailYOffsetRelativeToLogo: 0,
  // Maximum Z-axis wobble of the rail group, in radians.
  telemetryWobbleAmplitudeRadians: 0.008,
  // Angular frequency of rail wobble, in radians per second.
  telemetryWobbleSpeed: 0.24,

  // Z depth of the role subtitle; positive values render toward the camera.
  subtitleDepth: 0.12,
  // Vertical distance that the subtitle floats in scene-world units.
  subtitleFloatAmplitude: 0.025,
  // Angular frequency of the subtitle's vertical float.
  subtitleFloatSpeed: 0.7,
  // Maximum subtitle height as a fraction of viewport height.
  subtitleMaxHeightRelativeToViewport: 0.13,
  // Maximum subtitle glyph scale relative to the company title glyph scale.
  subtitleScaleRelativeToTitle: 0.9,
  // Angular frequencies of the subtitle's idle twist.
  subtitleTwistSpeeds: {
    // Speed of X-axis tilt.
    x: 0.72,
    // Speed of Y-axis turning.
    y: 0.51,
    // Speed of Z-axis roll.
    z: 0.63,
  },
  // Rotation amplitudes relative to the configured idle twist amount.
  subtitleTwistRatios: {
    // Fraction of idle twist applied to Y-axis turning.
    y: 0.55,
    // Fraction of idle twist applied to Z-axis roll.
    z: 0.6,
  },
  // Distance of each subtitle line from center as a viewport-height fraction.
  subtitleVerticalLineOffsetRelativeToViewport: 0.095,
  // Target subtitle width as a fraction of viewport width.
  subtitleWidthRelativeToViewport: 0.82,
  // Vertical subtitle-group center as a fraction of viewport height.
  subtitleYRelativeToViewport: 0,

  // Curve subdivision count used when constructing title/subtitle geometry.
  textCurveSegments: 2,
  // Front-to-back extrusion depth of title/subtitle geometry.
  textExtrusionDepth: 0.12,
  // Natural unscaled font size passed into Text3D.
  textNaturalSize: 1,

  // Z depth of the company title; negative values keep it behind the subtitle.
  titleDepth: -1.1,
  // Vertical distance that the company title floats in scene-world units.
  titleFloatAmplitude: 0.035,
  // Angular frequency of the company title's vertical float.
  titleFloatSpeed: 0.58,
  // Idle twist amplitude shared by the subtitle and inverse-moving title.
  titleIdleTwistDegrees: 4.3,
  // Maximum title height as a fraction of viewport height.
  titleMaxHeightRelativeToViewport: 0.225,
  // Maximum pointer-driven title rotation, in degrees.
  titleMaxTwistDegrees: 12,
  // X-axis pointer rotation relative to the maximum title twist.
  titlePointerPitchRatio: 0.48,
  // Target title width as a fraction of viewport width.
  titleWidthRelativeToViewport: 0.94,
  // Vertical title center as a viewport-height fraction; positive is up.
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
  const source = impact.trim();
  const indices = new Set<number>();

  for (const wordMatch of source.matchAll(/\S+/g)) {
    const word = wordMatch[0];
    const wordCharacters = word.match(/[A-Za-z0-9]/g)?.length ?? 0;
    const firstCharacter = word.search(/[A-Za-z0-9]/);

    if (
      wordCharacters >=
        STORY_SCENE_TUNING.cardImpactLongWordMinimumCharacters &&
      firstCharacter >= 0
    ) {
      indices.add(labelLength + wordMatch.index + firstCharacter);
    }
  }

  return indices;
}

function stackAccentIndices(labelLength: number, stack: string) {
  const source = stack.trim();
  const indices = new Set<number>();

  for (const technologyMatch of source.matchAll(/[^/]+/g)) {
    const technology = technologyMatch[0];
    const firstVisibleCharacter = technology.search(/\S/);
    const firstAlphanumericCharacter = technology.search(/[A-Za-z0-9]/);

    if (firstVisibleCharacter < 0 || firstAlphanumericCharacter < 0) {
      continue;
    }

    for (
      let index = firstVisibleCharacter;
      index <= firstAlphanumericCharacter;
      index += 1
    ) {
      if (!"()[]{}".includes(technology[index])) {
        indices.add(labelLength + technologyMatch.index + index);
      }
    }
  }

  return indices;
}

function numericAccentIndices(labelLength: number, text: string) {
  const source = text.trim();
  const indices = new Set<number>();

  /* Keep punctuation attached to a number in the same accent span: 4,500+,
     15%, 6–10, and similar measurements should read as one visual token. */
  for (const numberMatch of source.matchAll(
    /[+\-−–—.,%$#~<>]*\d[\d+\-−–—.,:%$#~<>/]*/g,
  )) {
    for (let index = 0; index < numberMatch[0].length; index += 1) {
      indices.add(labelLength + numberMatch.index + index);
    }
  }

  return indices;
}

function mergeAccentIndices(...sets: ReadonlySet<number>[]) {
  return new Set(sets.flatMap((set) => Array.from(set)));
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
    STORY_SCENE_TUNING.cardMinimumWidthColumns,
    Math.min(columns, STORY_SCENE_TUNING.cardMaximumWidthColumns),
  );
  const indent = Math.max(0, Math.floor((columns - cardWidth) / 2));
  const innerWidth =
    cardWidth - STORY_SCENE_TUNING.cardInnerWidthReservedColumns;
  const title = fitText(
    `${String(index).padStart(STORY_SCENE_TUNING.cardIndexDigits, "0")} // ${highlight.title}`,
    cardWidth - STORY_SCENE_TUNING.cardTitleFitReservedColumns,
  );
  const titleFill = Math.max(
    0,
    cardWidth - title.length - STORY_SCENE_TUNING.cardTitleFillReservedColumns,
  );
  const rows: StoryRow[] = [
    [
      {
        className: "modal-story-frame modal-story-heading",
        text: `${" ".repeat(indent)}${characters.topLeft}${characters.horizontal} ${title} ${characters.horizontal.repeat(titleFill)}${characters.topRight}`,
      },
    ],
  ];

  const bodyAccents = numericAccentIndices(0, highlight.body);
  for (const line of wrapWordsWithOffsets(highlight.body, innerWidth)) {
    rows.push(
      framedTextRow({
        accentIndices: bodyAccents,
        characters,
        content: line.text,
        indent,
        innerWidth,
        lineStart: line.start,
      }),
    );
  }

  const impactLabel = "IMPACT // ";
  const impactText = `${impactLabel}${highlight.impact}`;
  const impactAccents = mergeAccentIndices(
    impactAccentIndices(impactLabel.length, highlight.impact),
    numericAccentIndices(impactLabel.length, highlight.impact),
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
  const stackAccents = mergeAccentIndices(
    stackAccentIndices(stackLabel.length, highlight.stack),
    numericAccentIndices(stackLabel.length, highlight.stack),
  );
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
    ...Array.from(
      { length: STORY_SCENE_TUNING.cardGapRows },
      (): StoryRow => [{ text: " " }],
    ),
    ...buildHighlightRows(highlight, index, columns),
  ]);
}

function centerMeshAtWidth(
  mesh: Mesh | null,
  targetWidth: number,
  maximumHeight = Number.POSITIVE_INFINITY,
  maximumScale = Number.POSITIVE_INFINITY,
) {
  if (!mesh) {
    return null;
  }

  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox;

  if (!bounds) {
    return null;
  }

  const size = bounds.getSize(new Vector3());

  if (size.x <= 0 || size.y <= 0) {
    return null;
  }

  const center = bounds.getCenter(new Vector3());
  const scale = Math.min(
    targetWidth / size.x,
    maximumHeight / size.y,
    maximumScale,
  );

  mesh.scale.setScalar(scale);
  mesh.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  mesh.visible = true;
  return scale;
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
      curveSegments={STORY_SCENE_TUNING.textCurveSegments}
      font={THREE_FONTS.pixelEmulator}
      height={STORY_SCENE_TUNING.textExtrusionDepth}
      ref={meshRef}
      size={STORY_SCENE_TUNING.textNaturalSize}
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
      <group scale={STORY_SCENE_TUNING.decoratorScaleMultiplier}>
        <mesh position={[0, 0, STORY_SCENE_TUNING.logoReticleDepth]}>
          <ringGeometry
            args={[
              STORY_SCENE_TUNING.logoReticleInnerRadius,
              STORY_SCENE_TUNING.logoReticleOuterRadius,
              STORY_SCENE_TUNING.logoReticleSegments,
            ]}
          />
          <meshBasicMaterial
            color={accent}
            opacity={STORY_SCENE_TUNING.logoReticleOpacity}
            toneMapped={false}
            transparent
          />
        </mesh>
        {[
          [0, STORY_SCENE_TUNING.logoReticleTickOffset, 0],
          [0, -STORY_SCENE_TUNING.logoReticleTickOffset, 0],
          [STORY_SCENE_TUNING.logoReticleTickOffset, 0, Math.PI / 2],
          [-STORY_SCENE_TUNING.logoReticleTickOffset, 0, Math.PI / 2],
        ].map(([x, y, rotation], index) => (
          <mesh key={index} position={[x, y, 0]} rotation={[0, 0, rotation]}>
            <planeGeometry
              args={[
                STORY_SCENE_TUNING.logoReticleTickLength,
                STORY_SCENE_TUNING.logoReticleTickThickness,
              ]}
            />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh ref={meshRef} visible={false}>
        <planeGeometry
          args={[
            STORY_SCENE_TUNING.logoPlaneSize,
            STORY_SCENE_TUNING.logoPlaneSize,
          ]}
        />
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
      <mesh position={[-STORY_SCENE_TUNING.telemetryRailCenterX, 0, 0]}>
        <planeGeometry
          args={[
            STORY_SCENE_TUNING.telemetryRailLength,
            STORY_SCENE_TUNING.telemetryRailThickness,
          ]}
        />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[STORY_SCENE_TUNING.telemetryRailCenterX, 0, 0]}>
        <planeGeometry
          args={[
            STORY_SCENE_TUNING.telemetryRailLength,
            STORY_SCENE_TUNING.telemetryRailThickness,
          ]}
        />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {[
        -STORY_SCENE_TUNING.telemetryBlockLocalSpread,
        0,
        STORY_SCENE_TUNING.telemetryBlockLocalSpread,
      ].flatMap((offset, sideIndex) =>
        [-1, 1].map((side) => (
          <mesh
            key={`${sideIndex}-${side}`}
            position={[
              side *
                (STORY_SCENE_TUNING.telemetryBlockPositionX +
                  offset * STORY_SCENE_TUNING.telemetryBlockPositionMultiplier),
              0,
              0,
            ]}
          >
            <planeGeometry
              args={[
                STORY_SCENE_TUNING.telemetryBlockSize,
                STORY_SCENE_TUNING.telemetryBlockSize,
              ]}
            />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        )),
      )}
    </group>
  );
}

function HologramContent({
  definition,
  trackRef,
}: {
  definition: HolographicStoryDefinition;
  trackRef: RefObject<HTMLElement | null>;
}) {
  const titleGroupRef = useRef<Group>(null);
  const subtitleGroupRef = useRef<Group>(null);
  const logoGroupRef = useRef<Group>(null);
  const railGroupRef = useRef<Group>(null);
  const titleRef = useRef<Mesh>(null);
  const subtitleTopRef = useRef<Mesh>(null);
  const subtitleBottomRef = useRef<Mesh>(null);
  const logoRef = useRef<Mesh>(null);
  const basePositions = useRef({ logoY: 0, subtitleY: 0, titleY: 0 });
  const layoutSignatureRef = useRef("");
  const palette = PALETTES[definition.theme];
  const pointer = useScenePointer(trackRef, {
    clampX: STORY_SCENE_TUNING.pointerClampX,
    clampY: STORY_SCENE_TUNING.pointerClampY,
  });

  useFrame((state, delta) => {
    const titleGroup = titleGroupRef.current;
    const subtitleGroup = subtitleGroupRef.current;
    const logoGroup = logoGroupRef.current;
    const railGroup = railGroupRef.current;
    const trackRect = trackRef.current?.getBoundingClientRect();

    if (
      !titleGroup ||
      !subtitleGroup ||
      !logoGroup ||
      !railGroup ||
      !trackRect ||
      trackRect.width <= 0 ||
      trackRect.height <= 0
    ) {
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
      const maximumSubtitleScale =
        (titleReady ?? Number.POSITIVE_INFINITY) *
        STORY_SCENE_TUNING.subtitleScaleRelativeToTitle;
      const subtitleTopReady = centerMeshAtWidth(
        subtitleTopRef.current,
        viewport.width * STORY_SCENE_TUNING.subtitleWidthRelativeToViewport,
        viewport.height *
          STORY_SCENE_TUNING.subtitleMaxHeightRelativeToViewport,
        maximumSubtitleScale,
      );
      const subtitleBottomReady = centerMeshAtWidth(
        subtitleBottomRef.current,
        viewport.width * STORY_SCENE_TUNING.subtitleWidthRelativeToViewport,
        viewport.height *
          STORY_SCENE_TUNING.subtitleMaxHeightRelativeToViewport,
        maximumSubtitleScale,
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
        const subtitleY =
          viewport.height * STORY_SCENE_TUNING.subtitleYRelativeToViewport;
        const subtitleOffset =
          viewport.height *
          STORY_SCENE_TUNING.subtitleVerticalLineOffsetRelativeToViewport;
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
          logoY +
            viewport.height *
              STORY_SCENE_TUNING.telemetryRailYOffsetRelativeToLogo,
          STORY_SCENE_TUNING.telemetryDepth,
        );
        railGroup.scale.setScalar(
          viewport.width *
            STORY_SCENE_TUNING.telemetryRailScaleRelativeToViewport *
            STORY_SCENE_TUNING.decoratorScaleMultiplier,
        );
        basePositions.current = { logoY, subtitleY, titleY };
        layoutSignatureRef.current = layoutSignature;
      }
    }

    const { logoY, subtitleY, titleY } = basePositions.current;

    if (isModalScenePosterCapture()) {
      titleGroup.position.y = titleY;
      titleGroup.rotation.set(0, 0, 0);
      subtitleGroup.position.y = subtitleY;
      subtitleGroup.rotation.set(0, 0, 0);
      logoGroup.position.y = logoY;
      logoGroup.rotation.set(0, 0, 0);
      railGroup.rotation.set(0, 0, 0);
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
    const subtitleRotationX =
      Math.sin(time * STORY_SCENE_TUNING.subtitleTwistSpeeds.x) * idleTwist;
    const subtitleRotationY =
      Math.cos(time * STORY_SCENE_TUNING.subtitleTwistSpeeds.y) *
      idleTwist *
      STORY_SCENE_TUNING.subtitleTwistRatios.y;
    const subtitleRotationZ =
      Math.sin(time * STORY_SCENE_TUNING.subtitleTwistSpeeds.z) *
      idleTwist *
      STORY_SCENE_TUNING.subtitleTwistRatios.z;
    const titleCenterY = -STORY_SCENE_TUNING.titleYRelativeToViewport;
    const titleDistance = pointer.current.isInsideCanvas
      ? distanceFromRectangle(
          pointer.current.x,
          pointer.current.y - titleCenterY,
          STORY_SCENE_TUNING.pointerTitleRegionHalfWidth,
          STORY_SCENE_TUNING.pointerTitleRegionHalfHeight,
        )
      : Number.POSITIVE_INFINITY;
    const pointerInfluence =
      1 -
      MathUtils.smoothstep(
        titleDistance,
        STORY_SCENE_TUNING.pointerTitleActivationDistance,
        STORY_SCENE_TUNING.pointerTitleBlendDistance,
      );
    const pointerRotationX =
      MathUtils.clamp(
        (pointer.current.y - titleCenterY) /
          STORY_SCENE_TUNING.pointerTitleRegionHalfHeight,
        -1,
        1,
      ) *
      maximumTwist *
      STORY_SCENE_TUNING.titlePointerPitchRatio;
    const pointerRotationY =
      MathUtils.clamp(
        pointer.current.x / STORY_SCENE_TUNING.pointerTitleRegionHalfWidth,
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
      titleY +
      Math.sin(time * STORY_SCENE_TUNING.titleFloatSpeed) *
        STORY_SCENE_TUNING.titleFloatAmplitude;

    subtitleGroup.rotation.x = subtitleRotationX;
    subtitleGroup.rotation.y = subtitleRotationY;
    subtitleGroup.rotation.z = subtitleRotationZ;
    subtitleGroup.position.y =
      subtitleY +
      Math.cos(time * STORY_SCENE_TUNING.subtitleFloatSpeed) *
        STORY_SCENE_TUNING.subtitleFloatAmplitude;

    logoGroup.rotation.x =
      Math.sin(time * STORY_SCENE_TUNING.logoTwistSpeeds.x) *
      MathUtils.degToRad(STORY_SCENE_TUNING.logoTwistDegrees.x);
    logoGroup.rotation.y =
      Math.cos(time * STORY_SCENE_TUNING.logoTwistSpeeds.y) *
      MathUtils.degToRad(STORY_SCENE_TUNING.logoTwistDegrees.y);
    logoGroup.rotation.z =
      Math.sin(time * STORY_SCENE_TUNING.logoTwistSpeeds.z) *
      MathUtils.degToRad(STORY_SCENE_TUNING.logoTwistDegrees.z);
    logoGroup.position.y =
      logoY +
      Math.sin(time * STORY_SCENE_TUNING.logoFloatSpeed) *
        STORY_SCENE_TUNING.logoFloatAmplitude;
    railGroup.rotation.z =
      Math.sin(time * STORY_SCENE_TUNING.telemetryWobbleSpeed) *
      STORY_SCENE_TUNING.telemetryWobbleAmplitudeRadians;
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

export default function HolographicStoryScene({
  definition,
  firstLineNumber,
}: {
  definition: HolographicStoryDefinition;
  firstLineNumber: number;
}) {
  const { columns, contentWidth, measureRef, wrapperRef } =
    useTerminalContentColumns({
      fallback: STORY_SCENE_TUNING.contentFallbackColumns,
      min: STORY_SCENE_TUNING.contentMinimumColumns,
      step: STORY_SCENE_TUNING.contentSnapStepColumns,
    });
  const contentRef = useRef<Group>(null);
  const viewRef = useRef<HTMLElement>(null);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const isShopifyScene = definition.theme === "mint";
  const viewIndex = isShopifyScene ? 4 : 6;
  const measuredHeroWidth = contentWidth || Number.POSITIVE_INFINITY;
  const heroLineCount =
    measuredHeroWidth < STORY_SCENE_TUNING.heroNarrowMaxWidthPx
      ? STORY_SCENE_TUNING.heroNarrowLineCount
      : measuredHeroWidth < STORY_SCENE_TUNING.heroRegularMaxWidthPx
        ? STORY_SCENE_TUNING.heroRegularLineCount
        : STORY_SCENE_TUNING.heroWideLineCount;
  const rows = useMemo(
    () => buildStoryRows(definition.highlights, columns),
    [columns, definition.highlights],
  );

  return (
    <div
      className={`modal-terminal-wrapped-output modal-holographic-story modal-holographic-story-${definition.theme}`}
      ref={wrapperRef}
    >
      <span className="modal-terminal-ch-measure" ref={measureRef}>
        {"0".repeat(STORY_SCENE_TUNING.contentWidthSampleCharacters)}
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

      <div className="modal-story-hero">
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
          <img
            alt=""
            className="modal-r3f-scene-poster"
            data-scene-ready={isSceneReady ? "true" : undefined}
            src={publicPath(
              isShopifyScene
                ? "/posters/modal-shopify.svg"
                : "/posters/modal-ideanotion.svg",
            )}
          />
          <View
            className="modal-shared-scene-view"
            frames={Infinity}
            index={viewIndex}
            ref={viewRef}
            visible={false}
          >
            <PerspectiveCamera
              makeDefault
              fov={STORY_SCENE_TUNING.cameraFieldOfViewDegrees}
              position={[0, 0, STORY_SCENE_TUNING.cameraZPosition]}
            />
            <Suspense fallback={null}>
              <group ref={contentRef} visible={false}>
                <HologramContent definition={definition} trackRef={viewRef} />
              </group>
            </Suspense>
            <TransparentAsciiRenderer
              baseCellHeight={STORY_SCENE_TUNING.asciiGlyphCellHeightPx}
              baseCellWidth={STORY_SCENE_TUNING.asciiGlyphCellWidthPx}
              contentRef={contentRef}
              onReady={() => setIsSceneReady(true)}
              renderPriority={viewIndex + 1}
              trackRef={viewRef}
            />
          </View>
        </div>
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
