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

const STORY_CELL_WIDTH = 5;
const STORY_CELL_HEIGHT = 9;
const MAX_CARD_COLUMNS = 96;

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

function fitText(text: string, width: number) {
  return text.length <= width
    ? text
    : `${text.slice(0, Math.max(0, width - 1))}…`;
}

function framedTextRow({
  characters,
  content,
  contentClassName = "modal-story-body",
  indent,
  innerWidth,
  labelLength = 0,
}: {
  characters: FrameCharacters;
  content: string;
  contentClassName?: string;
  indent: number;
  innerWidth: number;
  labelLength?: number;
}): StoryRow {
  const fitted = fitText(content, innerWidth);
  const body = fitted.slice(labelLength);

  return [
    {
      className: "modal-story-frame",
      text: `${" ".repeat(indent)}${characters.vertical} `,
    },
    ...(labelLength > 0
      ? [
          {
            className: "modal-story-meta-label",
            text: fitted.slice(0, labelLength),
          },
        ]
      : []),
    {
      className: contentClassName,
      text: body,
    },
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
  const cardWidth = Math.max(22, Math.min(columns, MAX_CARD_COLUMNS));
  const indent = Math.max(0, Math.floor((columns - cardWidth) / 2));
  const innerWidth = cardWidth - 4;
  const title = fitText(
    `${String(index + 1).padStart(2, "0")} // ${highlight.title}`,
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
  for (const [lineIndex, line] of wrapWords(
    `${impactLabel}${highlight.impact}`,
    innerWidth,
  ).entries()) {
    rows.push(
      framedTextRow({
        characters,
        content: line,
        contentClassName: "modal-story-meta",
        indent,
        innerWidth,
        labelLength: lineIndex === 0 ? impactLabel.length : 0,
      }),
    );
  }

  const stackLabel = "STACK  // ";
  for (const [lineIndex, line] of wrapWords(
    `${stackLabel}${highlight.stack}`,
    innerWidth,
  ).entries()) {
    rows.push(
      framedTextRow({
        characters,
        content: line,
        contentClassName: "modal-story-meta",
        indent,
        innerWidth,
        labelLength: lineIndex === 0 ? stackLabel.length : 0,
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
      <mesh ref={meshRef} visible={false}>
        <planeGeometry args={[0.86, 0.86]} />
        <meshBasicMaterial map={texture} toneMapped={false} transparent />
      </mesh>
    </>
  );
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
  const pointer = useRef({ x: 0, y: 0 });
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

      pointer.current.x = MathUtils.clamp(
        (event.clientX - rect.left - rect.width / 2) / rect.width,
        -1.2,
        1.2,
      );
      pointer.current.y = MathUtils.clamp(
        (event.clientY - rect.top - rect.height / 2) / rect.height,
        -1.4,
        1.4,
      );
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
        viewport.width * 0.88,
        viewport.height * 0.225,
      );
      const subtitleTopReady = centerMeshAtWidth(
        subtitleTopRef.current,
        viewport.width * 0.82,
        viewport.height * 0.13,
      );
      const subtitleBottomReady = centerMeshAtWidth(
        subtitleBottomRef.current,
        viewport.width * 0.82,
        viewport.height * 0.13,
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
          viewport.width * 0.28,
          viewport.height * 0.38,
        );
        const titleY = viewport.height * 0.28;
        const subtitleY = 0;
        const subtitleOffset = viewport.height * 0.095;
        const logoY = -viewport.height * 0.3;

        titleGroup.position.set(0, titleY, 0);
        subtitleGroup.position.set(0, subtitleY, 0);
        subtitleTopRef.current.position.y += subtitleOffset;
        subtitleBottomRef.current.position.y -= subtitleOffset;
        logoGroup.position.set(0, logoY, 0);
        logoGroup.scale.setScalar(logoSize);
        logoRef.current.visible = true;
        railGroup.position.set(0, -viewport.height * 0.13, -0.06);
        railGroup.scale.setScalar(viewport.width * 0.13);
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
    const damping = 1 - Math.exp(-delta * 5);

    titleGroup.rotation.y +=
      (pointer.current.x * 0.2 +
        Math.sin(time * 0.42) * 0.025 -
        titleGroup.rotation.y) *
      damping;
    titleGroup.rotation.x +=
      (pointer.current.y * 0.09 - titleGroup.rotation.x) * damping;
    titleGroup.rotation.z = Math.sin(time * 0.3) * 0.009;
    titleGroup.position.y = titleY + Math.sin(time * 0.58) * 0.035;

    subtitleGroup.rotation.x = Math.sin(time * 0.72) * 0.075;
    subtitleGroup.rotation.y = Math.cos(time * 0.51) * 0.04;
    subtitleGroup.rotation.z = Math.sin(time * 0.63) * 0.045;
    subtitleGroup.position.y = subtitleY + Math.cos(time * 0.7) * 0.025;

    logoGroup.rotation.x = Math.sin(time * 0.46) * 0.07;
    logoGroup.rotation.y = Math.cos(time * 0.4) * 0.16;
    logoGroup.rotation.z = Math.sin(time * 0.34) * 0.025;
    logoGroup.position.y = logoY + Math.sin(time * 0.5) * 0.05;
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
  const heroLineCount = columns < 40 ? 20 : columns < 72 ? 22 : 24;
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
              baseCellHeight={STORY_CELL_HEIGHT}
              baseCellWidth={STORY_CELL_WIDTH}
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
