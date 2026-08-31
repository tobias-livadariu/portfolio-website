import { COLOR_PALETTE_STR } from "../theme/colors";

/**
 * Art-direction knobs for the full-screen transition into ASCII mode.
 *
 * The effect is a weighted triangular graph. Dijkstra exploration begins at
 * the renderer control, reaches the top-left goal, and then a goal-originating
 * wave closes any faces that the search did not already visit. Glyph colors
 * are assigned once and never change during a transition.
 */
export const ASCII_GRAPH_TRANSITION = {
  // Covering duration before the renderer is swapped to ASCII.
  coverDurationMs: 1_180,
  // Clearing duration used to reveal the fully initialized ASCII scene.
  clearDurationMs: 980,
  // Typical distance between graph nodes at the reference viewport width.
  nodeSpacingPx: 92,
  // Viewport width at which nodeSpacingPx and glyphFontPx apply exactly.
  referenceViewportWidthPx: 1_440,
  // Controls how gently graph and glyph dimensions respond to viewport width.
  responsiveScaleExponent: 0.22,
  // Smallest responsive scale on narrow screens.
  minimumResponsiveScale: 0.72,
  // Largest responsive scale on ultrawide screens.
  maximumResponsiveScale: 1.16,
  // Random interior-node displacement as a fraction of node spacing.
  nodeJitterRatio: 0.24,
  // Random addition to every graph edge weight. Higher is more dendritic.
  edgeWeightJitter: 1.55,
  // Portion of the cover timeline at which Dijkstra reaches the top-left goal.
  goalFoundProgress: 0.57,
  // Shapes the top-left wave after the goal is reached. Below 1 moves quickly.
  explosionDistanceExponent: 0.82,
  // Progress span over which an enclosed triangular face grows to full size.
  facePopProgressSpan: 0.105,
  // Slight face overdraw prevents antialiased cracks between adjacent faces.
  faceOverdrawScale: 1.035,
  // Minimum CSS-pixel distance between glyph centers at the reference width.
  // This exceeds the settled Iosevka ink cell so adjacent glyphs stay crisp.
  glyphMinimumSpacingPx: 22,
  // Base glyph font size at the reference viewport width.
  glyphFontPx: 14,
  // Largest glyph-list index permitted when an edge first appears.
  initialGlyphMaximumIndex: 2,
  // Graph vertices always use a connected glyph instead of punctuation.
  nodeMinimumGlyphIndex: 4,
  // Slightly emphasizes vertices without breaking the shared density ramp.
  nodeScaleMultiplier: 1.08,
  // Above 1 biases settled glyph selection toward denser characters.
  finalGlyphDensityBias: 2.1,
  // Glyph scale when a node or edge is first explored.
  glyphInitialScale: 0.56,
  // Glyph scale after it has settled into the generated field.
  glyphFinalScale: 1.28,
  // Below 1 biases glyph growth toward becoming large earlier.
  glyphGrowthExponent: 0.62,
  /* Low-frequency size modulation. Both rates stay well below three cycles per
     second, colors remain fixed, and coverage/reveal is strictly monotonic. */
  glyphScalePulseHz: 1.35,
  glyphScalePulseAmplitude: 0.12,
  // Width of the colored glyph frontier during the clearing phase.
  clearFrontierProgressWidth: 0.13,
  // Quantized monotonic clear steps create a choppy reveal without flashing.
  clearStepCount: 12,
  // Subtle graph rails behind glyphs; raise alpha/width for stronger geometry.
  edgeLineAlpha: 0.2,
  edgeLineWidthPx: 0.75,
  // Keeps rails from showing through punctuation-shaped vertex glyphs.
  edgeNodeClearancePx: 6,
  // Glyphs progress from sparse to dense as their node settles.
  glyphs: [".", ":", "-", "=", "+", "*", "#", "%", "@"],
  /* Weighted palette measured from the finished ASCII scene's non-black
     pixels, then slightly saturated. No saturated-red entry is used. */
  colors: [
    { color: COLOR_PALETTE_STR.campfireAsh, weight: 0.24 },
    { color: COLOR_PALETTE_STR.campfireAshDark, weight: 0.2 },
    { color: COLOR_PALETTE_STR.campfire, weight: 0.14 },
    { color: "#b05a54", weight: 0.1 },
    { color: "#76cce6", weight: 0.1 },
    { color: "#7f9ed8", weight: 0.09 },
    { color: "#79bd9a", weight: 0.07 },
    { color: COLOR_PALETTE_STR.mutedWhite, weight: 0.06 },
  ],
} as const;

export interface AsciiTransitionNode {
  color: string;
  initialGlyphIndex: number;
  modulationPhase: number;
  startProgress: number;
  targetGlyphIndex: number;
  x: number;
  y: number;
}

export interface AsciiTransitionEdge {
  a: number;
  b: number;
  color: string;
  initialGlyphIndex: number;
  isGoalPath: boolean;
  isTreeEdge: boolean;
  modulationPhase: number;
  startProgress: number;
  targetGlyphIndex: number;
  endProgress: number;
}

export interface AsciiTransitionFace {
  a: number;
  b: number;
  c: number;
  coverProgress: number;
}

export interface AsciiTransitionField {
  edges: AsciiTransitionEdge[];
  faces: AsciiTransitionFace[];
  goalIndex: number;
  height: number;
  nodes: AsciiTransitionNode[];
  responsiveScale: number;
  seedIndex: number;
  width: number;
}

export interface AsciiTransitionGlyphPlacement {
  alpha: number;
  color: string;
  glyph: string;
  scale: number;
  source: "edge" | "node";
  x: number;
  y: number;
}

interface GraphEdge {
  a: number;
  b: number;
  color: string;
  initialGlyphIndex: number;
  modulationPhase: number;
  targetGlyphIndex: number;
  weight: number;
}

interface HeapEntry {
  distance: number;
  index: number;
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

function getResponsiveScale(width: number) {
  return clamp(
    (Math.max(1, width) / ASCII_GRAPH_TRANSITION.referenceViewportWidthPx) **
      ASCII_GRAPH_TRANSITION.responsiveScaleExponent,
    ASCII_GRAPH_TRANSITION.minimumResponsiveScale,
    ASCII_GRAPH_TRANSITION.maximumResponsiveScale,
  );
}

function pickColor(random: () => number) {
  const totalWeight = ASCII_GRAPH_TRANSITION.colors.reduce(
    (sum, entry) => sum + entry.weight,
    0,
  );
  let target = random() * totalWeight;

  for (const entry of ASCII_GRAPH_TRANSITION.colors) {
    target -= entry.weight;
    if (target <= 0) {
      return entry.color;
    }
  }

  return ASCII_GRAPH_TRANSITION.colors.at(-1)?.color ?? "#ffffff";
}

function pickGlyphRange(random: () => number, minimumGlyphIndex = 0) {
  const maximumGlyphIndex = ASCII_GRAPH_TRANSITION.glyphs.length - 1;
  const initialGlyphIndex = Math.max(
    Math.min(maximumGlyphIndex, minimumGlyphIndex),
    Math.floor(
      random() *
        (Math.min(
          maximumGlyphIndex,
          ASCII_GRAPH_TRANSITION.initialGlyphMaximumIndex,
        ) +
          1),
    ),
  );
  const biasedProgress =
    1 - random() ** ASCII_GRAPH_TRANSITION.finalGlyphDensityBias;
  const targetGlyphIndex = Math.round(
    initialGlyphIndex +
      (maximumGlyphIndex - initialGlyphIndex) * biasedProgress,
  );

  return { initialGlyphIndex, targetGlyphIndex };
}

function pushHeap(heap: HeapEntry[], entry: HeapEntry) {
  heap.push(entry);
  let index = heap.length - 1;

  while (index > 0) {
    const parent = (index - 1) >> 1;
    if (heap[parent].distance <= entry.distance) {
      break;
    }
    heap[index] = heap[parent];
    index = parent;
  }

  heap[index] = entry;
}

function popHeap(heap: HeapEntry[]) {
  const first = heap[0];
  const last = heap.pop();

  if (!first || !last || heap.length === 0) {
    return first ?? null;
  }

  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    const right = left + 1;
    if (left >= heap.length) {
      break;
    }
    const child =
      right < heap.length && heap[right].distance < heap[left].distance
        ? right
        : left;
    if (heap[child].distance >= last.distance) {
      break;
    }
    heap[index] = heap[child];
    index = child;
  }
  heap[index] = last;
  return first;
}

function findNearestNode(
  positions: ReadonlyArray<{ x: number; y: number }>,
  x: number,
  y: number,
) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < positions.length; index += 1) {
    const distance = Math.hypot(positions[index].x - x, positions[index].y - y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

/** Build one graph per mode transition and retain it across all three phases. */
export function buildAsciiTransitionField(
  width: number,
  height: number,
  seedX: number,
  seedY: number,
  random: () => number = Math.random,
): AsciiTransitionField {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const responsiveScale = getResponsiveScale(safeWidth);
  const spacing = ASCII_GRAPH_TRANSITION.nodeSpacingPx * responsiveScale;
  const columns = Math.max(3, Math.ceil(safeWidth / spacing) + 1);
  const rows = Math.max(3, Math.ceil(safeHeight / spacing) + 1);
  const positions: Array<{ x: number; y: number }> = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const boundaryX = column === 0 || column === columns - 1;
      const boundaryY = row === 0 || row === rows - 1;
      const jitterX = boundaryX
        ? 0
        : (random() - 0.5) * spacing * ASCII_GRAPH_TRANSITION.nodeJitterRatio;
      const jitterY = boundaryY
        ? 0
        : (random() - 0.5) * spacing * ASCII_GRAPH_TRANSITION.nodeJitterRatio;

      positions.push({
        x: (column / (columns - 1)) * safeWidth + jitterX,
        y: (row / (rows - 1)) * safeHeight + jitterY,
      });
    }
  }

  const adjacency: Array<Array<{ index: number; weight: number }>> = Array.from(
    { length: positions.length },
    () => [],
  );
  const graphEdges: GraphEdge[] = [];
  const edgeByKey = new Map<string, number>();
  const faces: AsciiTransitionFace[] = [];

  const addEdge = (a: number, b: number) => {
    const low = Math.min(a, b);
    const high = Math.max(a, b);
    const key = `${low}:${high}`;
    const existing = edgeByKey.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const distance = Math.hypot(
      positions[a].x - positions[b].x,
      positions[a].y - positions[b].y,
    );
    const weight =
      (distance / Math.max(spacing, 1)) *
      (1 + ASCII_GRAPH_TRANSITION.edgeWeightJitter * random());
    const index = graphEdges.length;
    const glyphRange = pickGlyphRange(random);

    graphEdges.push({
      a,
      b,
      color: pickColor(random),
      ...glyphRange,
      modulationPhase: random() * Math.PI * 2,
      weight,
    });
    edgeByKey.set(key, index);
    adjacency[a].push({ index: b, weight });
    adjacency[b].push({ index: a, weight });
    return index;
  };

  const indexAt = (column: number, row: number) => row * columns + column;

  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const topLeft = indexAt(column, row);
      const topRight = indexAt(column + 1, row);
      const bottomLeft = indexAt(column, row + 1);
      const bottomRight = indexAt(column + 1, row + 1);

      addEdge(topLeft, topRight);
      addEdge(topLeft, bottomLeft);
      addEdge(topRight, bottomRight);
      addEdge(bottomLeft, bottomRight);

      if (random() < 0.5) {
        addEdge(topLeft, bottomRight);
        faces.push(
          { a: topLeft, b: topRight, c: bottomRight, coverProgress: 0 },
          { a: topLeft, b: bottomRight, c: bottomLeft, coverProgress: 0 },
        );
      } else {
        addEdge(topRight, bottomLeft);
        faces.push(
          { a: topLeft, b: topRight, c: bottomLeft, coverProgress: 0 },
          { a: topRight, b: bottomRight, c: bottomLeft, coverProgress: 0 },
        );
      }
    }
  }

  const seedIndex = findNearestNode(positions, seedX, seedY);
  const goalIndex = findNearestNode(positions, 0, 0);
  const distances = new Float64Array(positions.length).fill(Infinity);
  const predecessors = new Int32Array(positions.length).fill(-1);
  const settled = new Uint8Array(positions.length);
  const heap: HeapEntry[] = [];

  distances[seedIndex] = 0;
  pushHeap(heap, { distance: 0, index: seedIndex });

  while (heap.length > 0) {
    const current = popHeap(heap);
    if (!current || settled[current.index]) {
      continue;
    }
    settled[current.index] = 1;

    for (const neighbor of adjacency[current.index]) {
      const candidate = current.distance + neighbor.weight;
      if (candidate < distances[neighbor.index]) {
        distances[neighbor.index] = candidate;
        predecessors[neighbor.index] = current.index;
        pushHeap(heap, { distance: candidate, index: neighbor.index });
      }
    }
  }

  const goalDistance = Math.max(distances[goalIndex], 1e-6);
  const cornerDistance = Math.max(Math.hypot(safeWidth, safeHeight), 1);
  const nodes: AsciiTransitionNode[] = positions.map((position, index) => {
    const searchProgress =
      distances[index] <= goalDistance
        ? (distances[index] / goalDistance) *
          ASCII_GRAPH_TRANSITION.goalFoundProgress
        : Number.POSITIVE_INFINITY;
    const explosionDistance =
      Math.hypot(position.x, position.y) / cornerDistance;
    const explosionProgress =
      ASCII_GRAPH_TRANSITION.goalFoundProgress +
      explosionDistance ** ASCII_GRAPH_TRANSITION.explosionDistanceExponent *
        (1 - ASCII_GRAPH_TRANSITION.goalFoundProgress);
    const glyphRange = pickGlyphRange(
      random,
      ASCII_GRAPH_TRANSITION.nodeMinimumGlyphIndex,
    );

    return {
      color: pickColor(random),
      ...glyphRange,
      modulationPhase: random() * Math.PI * 2,
      startProgress: clamp(Math.min(searchProgress, explosionProgress)),
      x: position.x,
      y: position.y,
    };
  });

  for (const face of faces) {
    face.coverProgress = Math.max(
      nodes[face.a].startProgress,
      nodes[face.b].startProgress,
      nodes[face.c].startProgress,
    );
  }

  const goalPathEdges = new Set<string>();
  let pathNode = goalIndex;
  while (predecessors[pathNode] >= 0) {
    const previous = predecessors[pathNode];
    goalPathEdges.add(
      `${Math.min(pathNode, previous)}:${Math.max(pathNode, previous)}`,
    );
    pathNode = previous;
  }

  const edges = graphEdges.map((edge) => {
    const key = `${Math.min(edge.a, edge.b)}:${Math.max(edge.a, edge.b)}`;
    return {
      a: edge.a,
      b: edge.b,
      color: edge.color,
      endProgress: Math.max(
        nodes[edge.a].startProgress,
        nodes[edge.b].startProgress,
      ),
      initialGlyphIndex: edge.initialGlyphIndex,
      isGoalPath: goalPathEdges.has(key),
      isTreeEdge:
        predecessors[edge.a] === edge.b || predecessors[edge.b] === edge.a,
      modulationPhase: edge.modulationPhase,
      startProgress: Math.min(
        nodes[edge.a].startProgress,
        nodes[edge.b].startProgress,
      ),
      targetGlyphIndex: edge.targetGlyphIndex,
    };
  });

  return {
    edges,
    faces,
    goalIndex,
    height: safeHeight,
    nodes,
    responsiveScale,
    seedIndex,
    width: safeWidth,
  };
}

function traceFace(
  ctx: CanvasRenderingContext2D,
  field: AsciiTransitionField,
  face: AsciiTransitionFace,
  scale: number,
) {
  const a = field.nodes[face.a];
  const b = field.nodes[face.b];
  const c = field.nodes[face.c];
  const centerX = (a.x + b.x + c.x) / 3;
  const centerY = (a.y + b.y + c.y) / 3;
  const point = (node: AsciiTransitionNode) => ({
    x: centerX + (node.x - centerX) * scale,
    y: centerY + (node.y - centerY) * scale,
  });
  const pa = point(a);
  const pb = point(b);
  const pc = point(c);

  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.lineTo(pc.x, pc.y);
  ctx.closePath();
}

function getGlyphPresentation(
  startProgress: number,
  progress: number,
  initialGlyphIndex: number,
  targetGlyphIndex: number,
  modulationPhase: number,
  elapsedMs: number,
) {
  const age = clamp(
    (progress - startProgress) / Math.max(1 - startProgress, 0.08),
  );
  const growth = age ** ASCII_GRAPH_TRANSITION.glyphGrowthExponent;
  const glyphIndex = Math.min(
    ASCII_GRAPH_TRANSITION.glyphs.length - 1,
    Math.round(
      initialGlyphIndex + (targetGlyphIndex - initialGlyphIndex) * growth,
    ),
  );
  const pulse =
    0.5 +
    0.5 *
      Math.sin(
        (elapsedMs / 1_000) *
          ASCII_GRAPH_TRANSITION.glyphScalePulseHz *
          Math.PI *
          2 +
          modulationPhase,
      );
  const settledScale =
    ASCII_GRAPH_TRANSITION.glyphInitialScale +
    (ASCII_GRAPH_TRANSITION.glyphFinalScale -
      ASCII_GRAPH_TRANSITION.glyphInitialScale) *
      growth;

  return {
    glyph: ASCII_GRAPH_TRANSITION.glyphs[glyphIndex],
    scale:
      settledScale *
      (1 + ASCII_GRAPH_TRANSITION.glyphScalePulseAmplitude * pulse),
  };
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  placement: AsciiTransitionGlyphPlacement,
  glyphOffsets: Map<string, { x: number; y: number }>,
) {
  let offset = glyphOffsets.get(placement.glyph);

  if (!offset) {
    const metrics = ctx.measureText(placement.glyph);
    /* textAlign/textBaseline center the font's advance and em boxes, not its
       visible pixels. Center the actual ink bounds so punctuation such as `*`,
       `:`, and `=` sits directly on the graph coordinate. */
    offset = {
      x: (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2,
      y:
        (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) /
        2,
    };
    glyphOffsets.set(placement.glyph, offset);
  }

  ctx.save();
  ctx.globalAlpha = placement.alpha;
  ctx.fillStyle = placement.color;
  ctx.translate(placement.x, placement.y);
  const sourceScale =
    placement.source === "node"
      ? ASCII_GRAPH_TRANSITION.nodeScaleMultiplier
      : 1;
  const scale = placement.scale * sourceScale;
  ctx.scale(scale, scale);
  ctx.fillText(placement.glyph, offset.x, offset.y);
  ctx.restore();
}

function createGlyphOccupancy(minimumSpacing: number) {
  const cellSize = Math.max(1, minimumSpacing);
  const buckets = new Map<string, Array<{ x: number; y: number }>>();

  return (x: number, y: number) => {
    const column = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        const bucket = buckets.get(
          `${column + columnOffset}:${row + rowOffset}`,
        );

        if (
          bucket?.some(
            (point) => Math.hypot(point.x - x, point.y - y) < minimumSpacing,
          )
        ) {
          return false;
        }
      }
    }

    const key = `${column}:${row}`;
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.push({ x, y });
    } else {
      buckets.set(key, [{ x, y }]);
    }

    return true;
  };
}

/**
 * Resolve the glyph layer before painting it. Nodes reserve their cells first,
 * then stable interior edge slots fill the remaining space. This guarantees a
 * single glyph occupant at every visual cell, including shared edge endpoints.
 */
export function getAsciiTransitionGlyphPlacements(
  field: AsciiTransitionField,
  progress: number,
  elapsedMs: number,
  clearing: boolean,
) {
  const frontierWidth = ASCII_GRAPH_TRANSITION.clearFrontierProgressWidth;
  const minimumSpacing =
    ASCII_GRAPH_TRANSITION.glyphMinimumSpacingPx * field.responsiveScale;
  const tryOccupy = createGlyphOccupancy(minimumSpacing);
  const edgePlacements: AsciiTransitionGlyphPlacement[] = [];
  const nodePlacements: AsciiTransitionGlyphPlacement[] = [];

  /* Reserve visible graph nodes before considering edge decoration. The old
     renderer drew every edge endpoint and then drew its node again, producing
     the darkest and most obvious character stacks. */
  for (const node of field.nodes) {
    if (!clearing && progress < node.startProgress) {
      continue;
    }
    if (clearing && node.startProgress < progress - frontierWidth) {
      continue;
    }
    if (!tryOccupy(node.x, node.y)) {
      continue;
    }

    const presentation = getGlyphPresentation(
      node.startProgress,
      clearing ? 1 : progress,
      node.initialGlyphIndex,
      node.targetGlyphIndex,
      node.modulationPhase,
      elapsedMs,
    );

    nodePlacements.push({
      alpha: 0.96,
      color: node.color,
      ...presentation,
      source: "node",
      x: node.x,
      y: node.y,
    });
  }

  for (const edge of field.edges) {
    if (!edge.isTreeEdge || (!clearing && progress < edge.startProgress)) {
      continue;
    }
    if (clearing && edge.endProgress < progress - frontierWidth) {
      continue;
    }

    const a = field.nodes[edge.a];
    const b = field.nodes[edge.b];
    const edgeProgress = clearing
      ? 1
      : clamp(
          (progress - edge.startProgress) /
            Math.max(edge.endProgress - edge.startProgress, 0.035),
        );
    const edgeLength = Math.hypot(b.x - a.x, b.y - a.y);
    /* Leave a full slot at each endpoint for its node. Dividing the remaining
       edge into fixed slots also stops characters sliding and bunching while
       the exploration frontier advances. */
    const glyphCount = Math.max(
      0,
      Math.floor(edgeLength / Math.max(minimumSpacing, 1)) - 1,
    );

    for (let glyphIndex = 0; glyphIndex < glyphCount; glyphIndex += 1) {
      const along = (glyphIndex + 1) / (glyphCount + 1);

      if (along > edgeProgress) {
        break;
      }

      const x = a.x + (b.x - a.x) * along;
      const y = a.y + (b.y - a.y) * along;

      if (!tryOccupy(x, y)) {
        continue;
      }

      const presentation = getGlyphPresentation(
        edge.startProgress,
        clearing ? 1 : progress,
        edge.initialGlyphIndex,
        edge.targetGlyphIndex,
        edge.modulationPhase + (glyphIndex + 1) * 0.73,
        elapsedMs,
      );

      edgePlacements.push({
        alpha: edge.isGoalPath ? 0.95 : 0.72,
        color: edge.color,
        ...presentation,
        source: "edge",
        x,
        y,
      });
    }
  }

  /* Preserve the former paint order—edge decoration below graph nodes—while
     using the node-first reservation order above for collision priority. */
  return [...edgePlacements, ...nodePlacements];
}

function drawGeneratedGraph(
  ctx: CanvasRenderingContext2D,
  field: AsciiTransitionField,
  progress: number,
  elapsedMs: number,
  clearing: boolean,
) {
  const frontierWidth = ASCII_GRAPH_TRANSITION.clearFrontierProgressWidth;
  const fontSize = ASCII_GRAPH_TRANSITION.glyphFontPx * field.responsiveScale;

  ctx.font = `700 ${fontSize}px "Iosevka Term Web", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineCap = "round";
  const glyphOffsets = new Map<string, { x: number; y: number }>();

  for (const edge of field.edges) {
    if (!edge.isTreeEdge || (!clearing && progress < edge.startProgress)) {
      continue;
    }
    if (clearing && edge.endProgress < progress - frontierWidth) {
      continue;
    }

    const a = field.nodes[edge.a];
    const b = field.nodes[edge.b];
    const edgeProgress = clearing
      ? 1
      : clamp(
          (progress - edge.startProgress) /
            Math.max(edge.endProgress - edge.startProgress, 0.035),
        );
    const alpha = edge.isGoalPath ? 0.68 : ASCII_GRAPH_TRANSITION.edgeLineAlpha;
    const edgeLength = Math.hypot(b.x - a.x, b.y - a.y);
    const clearanceProgress = Math.min(
      0.5,
      (ASCII_GRAPH_TRANSITION.edgeNodeClearancePx * field.responsiveScale) /
        Math.max(edgeLength, 1),
    );
    const lineStartProgress = Math.min(clearanceProgress, edgeProgress);
    const lineEndProgress = Math.min(edgeProgress, 1 - clearanceProgress);

    if (lineEndProgress > lineStartProgress) {
      ctx.beginPath();
      ctx.moveTo(
        a.x + (b.x - a.x) * lineStartProgress,
        a.y + (b.y - a.y) * lineStartProgress,
      );
      ctx.lineTo(
        a.x + (b.x - a.x) * lineEndProgress,
        a.y + (b.y - a.y) * lineEndProgress,
      );
      ctx.lineWidth =
        ASCII_GRAPH_TRANSITION.edgeLineWidthPx *
        field.responsiveScale *
        (edge.isGoalPath ? 1.7 : 1);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = edge.color;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  for (const placement of getAsciiTransitionGlyphPlacements(
    field,
    progress,
    elapsedMs,
    clearing,
  )) {
    drawGlyph(ctx, placement, glyphOffsets);
  }
}

export type AsciiTransitionRenderStage = "covering" | "covered" | "clearing";

/** Draw a single frame. Coverage and clearing are monotonic by construction. */
export function renderAsciiTransitionFrame(
  ctx: CanvasRenderingContext2D,
  field: AsciiTransitionField,
  stage: AsciiTransitionRenderStage,
  progress: number,
  elapsedMs: number,
) {
  const safeProgress = clamp(progress);
  ctx.clearRect(0, 0, field.width, field.height);

  if (stage === "clearing") {
    const steppedProgress =
      Math.floor(safeProgress * ASCII_GRAPH_TRANSITION.clearStepCount) /
      ASCII_GRAPH_TRANSITION.clearStepCount;
    ctx.fillStyle = COLOR_PALETTE_STR.background;
    ctx.fillRect(0, 0, field.width, field.height);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000000";

    for (const face of field.faces) {
      const localProgress = clamp(
        (steppedProgress - face.coverProgress) /
          ASCII_GRAPH_TRANSITION.facePopProgressSpan,
      );
      if (localProgress <= 0) {
        continue;
      }
      ctx.beginPath();
      traceFace(
        ctx,
        field,
        face,
        easeOutCubic(localProgress) * ASCII_GRAPH_TRANSITION.faceOverdrawScale,
      );
      ctx.fill();
    }
    ctx.restore();
    drawGeneratedGraph(ctx, field, steppedProgress, elapsedMs, true);
    return;
  }

  ctx.fillStyle = COLOR_PALETTE_STR.background;
  if (stage === "covered") {
    ctx.fillRect(0, 0, field.width, field.height);
  } else {
    for (const face of field.faces) {
      const localProgress = clamp(
        (safeProgress - face.coverProgress) /
          ASCII_GRAPH_TRANSITION.facePopProgressSpan,
      );
      if (localProgress <= 0) {
        continue;
      }
      ctx.beginPath();
      traceFace(
        ctx,
        field,
        face,
        easeOutCubic(localProgress) * ASCII_GRAPH_TRANSITION.faceOverdrawScale,
      );
      ctx.fill();
    }
  }

  drawGeneratedGraph(ctx, field, safeProgress, elapsedMs, false);
}
