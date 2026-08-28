/* Diamond lattice used by the background transition overlay.
 *
 * The viewport is tiled with squares rotated 45 degrees (diamonds). Growth
 * order comes from a randomized-weight Dijkstra flood from the seed tile:
 * every edge of the 4-neighbor lattice graph gets a random weight, so the
 * frontier expands as an organic, dendritic blob that is different on every
 * run while still guaranteeing full coverage. Each tile's reveal time is its
 * normalized graph distance from the seed. */

export const DIAMOND_TRANSITION = {
  // Half-diagonal of each diamond in CSS px (point-to-point size is double).
  tileHalfDiagonalPx: 30,
  // Time from the first tile starting to the last tile starting its pop.
  growMs: 950,
  // Duration of a single tile's pop-in/pop-out.
  popMs: 160,
  // Tiles draw 6% oversized so anti-aliased edges never show seam cracks.
  overdraw: 1.06,
  // Extra hold after the last pop completes before the mode swap.
  swapBufferMs: 80,
  // Extra hold after the last clear pop before the overlay unmounts.
  clearDoneBufferMs: 50,
  // Per-edge random weight is 1 + jitter * random(); higher jitter makes the
  // growth more chaotic and branch-like.
  edgeWeightJitter: 1.6,
  // Solid-fade duration used when prefers-reduced-motion is set.
  reducedMotionFadeMs: 220,
} as const;

export interface DiamondTile {
  cx: number;
  cy: number;
  // When this tile begins its pop, in ms from the start of the phase.
  startMs: number;
}

interface MinHeap {
  push(distance: number, index: number): void;
  pop(): number | null;
}

function createMinHeap(): MinHeap {
  const distances: number[] = [];
  const indices: number[] = [];

  function swap(a: number, b: number) {
    const distance = distances[a];
    const index = indices[a];

    distances[a] = distances[b];
    indices[a] = indices[b];
    distances[b] = distance;
    indices[b] = index;
  }

  return {
    push(distance, index) {
      distances.push(distance);
      indices.push(index);

      let node = distances.length - 1;

      while (node > 0) {
        const parent = (node - 1) >> 1;

        if (distances[parent] <= distances[node]) {
          break;
        }

        swap(parent, node);
        node = parent;
      }
    },
    pop() {
      if (distances.length === 0) {
        return null;
      }

      const top = indices[0];
      const lastDistance = distances.pop() as number;
      const lastIndex = indices.pop() as number;

      if (distances.length > 0) {
        distances[0] = lastDistance;
        indices[0] = lastIndex;

        let node = 0;

        for (;;) {
          const left = node * 2 + 1;
          const right = left + 1;
          let smallest = node;

          if (
            left < distances.length &&
            distances[left] < distances[smallest]
          ) {
            smallest = left;
          }

          if (
            right < distances.length &&
            distances[right] < distances[smallest]
          ) {
            smallest = right;
          }

          if (smallest === node) {
            break;
          }

          swap(node, smallest);
          node = smallest;
        }
      }

      return top;
    },
  };
}

/* Builds the tile set and assigns every tile its randomized reveal time.
   Guaranteed to cover the whole width x height viewport: tile centers extend
   two tiles past every edge, and times are normalized against the realized
   maximum graph distance so the flood always finishes at growMs. */
export function buildDiamondField(
  width: number,
  height: number,
  seedX: number,
  seedY: number,
): DiamondTile[] {
  const s = DIAMOND_TRANSITION.tileHalfDiagonalPx;
  const margin = s * 2;

  /* Lattice coordinates: tile (u, v) sits at cx = (u+v)s, cy = (u-v)s, so
     edge-adjacent diamonds are (u±1, v) and (u, v±1). */
  const toU = (x: number, y: number) => Math.round((x + y) / (2 * s));
  const toV = (x: number, y: number) => Math.round((x - y) / (2 * s));

  const corners = [
    [-margin, -margin],
    [width + margin, -margin],
    [-margin, height + margin],
    [width + margin, height + margin],
  ];
  const uValues = corners.map(([x, y]) => toU(x, y));
  const vValues = corners.map(([x, y]) => toV(x, y));
  const uMin = Math.min(...uValues) - 1;
  const uMax = Math.max(...uValues) + 1;
  const vMin = Math.min(...vValues) - 1;
  const vMax = Math.max(...vValues) + 1;

  const centersX: number[] = [];
  const centersY: number[] = [];
  const tileIndexByKey = new Map<string, number>();
  const tileU: number[] = [];
  const tileV: number[] = [];

  for (let u = uMin; u <= uMax; u++) {
    for (let v = vMin; v <= vMax; v++) {
      const cx = (u + v) * s;
      const cy = (u - v) * s;

      if (
        cx < -margin ||
        cx > width + margin ||
        cy < -margin ||
        cy > height + margin
      ) {
        continue;
      }

      tileIndexByKey.set(`${u},${v}`, centersX.length);
      centersX.push(cx);
      centersY.push(cy);
      tileU.push(u);
      tileV.push(v);
    }
  }

  const tileCount = centersX.length;
  const distances = new Float64Array(tileCount).fill(Infinity);
  const settled = new Uint8Array(tileCount);

  let seedIndex = tileIndexByKey.get(
    `${toU(seedX, seedY)},${toV(seedX, seedY)}`,
  );

  if (seedIndex === undefined) {
    let bestDistance = Infinity;

    seedIndex = 0;
    for (let index = 0; index < tileCount; index++) {
      const distance = Math.hypot(
        centersX[index] - seedX,
        centersY[index] - seedY,
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        seedIndex = index;
      }
    }
  }

  const heap = createMinHeap();

  distances[seedIndex] = 0;
  heap.push(0, seedIndex);

  for (;;) {
    const current = heap.pop();

    if (current === null) {
      break;
    }

    if (settled[current]) {
      continue;
    }

    settled[current] = 1;

    const u = tileU[current];
    const v = tileV[current];
    const neighborKeys = [
      `${u + 1},${v}`,
      `${u - 1},${v}`,
      `${u},${v + 1}`,
      `${u},${v - 1}`,
    ];

    for (const key of neighborKeys) {
      const neighbor = tileIndexByKey.get(key);

      if (neighbor === undefined || settled[neighbor]) {
        continue;
      }

      const weight = 1 + DIAMOND_TRANSITION.edgeWeightJitter * Math.random();
      const candidate = distances[current] + weight;

      if (candidate < distances[neighbor]) {
        distances[neighbor] = candidate;
        heap.push(candidate, neighbor);
      }
    }
  }

  let maxDistance = 0;

  for (let index = 0; index < tileCount; index++) {
    if (Number.isFinite(distances[index]) && distances[index] > maxDistance) {
      maxDistance = distances[index];
    }
  }

  const tiles: DiamondTile[] = new Array(tileCount);

  for (let index = 0; index < tileCount; index++) {
    tiles[index] = {
      cx: centersX[index],
      cy: centersY[index],
      startMs: Number.isFinite(distances[index])
        ? (distances[index] / Math.max(maxDistance, 1e-6)) *
          DIAMOND_TRANSITION.growMs
        : 0,
    };
  }

  return tiles;
}
