/* A screen-filling grid of cells, each with the moment a moving front reaches
   it. The transition overlay uses it to dim or erase a picture cell by cell:
   cells are stored in arrival order, so each frame only has to walk the few
   that the front has newly passed. */

export interface CellFront {
  cellWidth: number;
  cellHeight: number;
  count: number;
  // The four arrays below share one order: earliest arrival first.
  // When the front reaches the cell, from 0 to 1.
  arrival: Float32Array;
  // Top-left corner in CSS pixels.
  x: Float32Array;
  y: Float32Array;
  // A fixed pseudo-random value from 0 to 1, for per-cell variation.
  variation: Float32Array;
}

/* Repeatable per-cell pseudo-random value from 0 to 1. */
function hashCell(column: number, row: number, salt: number) {
  let hash =
    Math.imul(column, 374761393) ^
    Math.imul(row, 668265263) ^
    Math.imul(salt, 1442695041);

  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);

  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

export function createCellFront(
  width: number,
  height: number,
  cellWidth: number,
  cellHeight: number,
  /* Returns when the front reaches the cell centred on (centerX, centerY).
     `jitter` is a second pseudo-random value from 0 to 1 for roughening the
     front's edge. */
  getArrival: (
    centerX: number,
    centerY: number,
    jitter: number,
    column: number,
    row: number,
  ) => number,
): CellFront {
  const columns = Math.max(1, Math.ceil(width / cellWidth));
  const rows = Math.max(1, Math.ceil(height / cellHeight));
  const count = columns * rows;
  const unsortedArrival = new Float32Array(count);
  const order = new Uint32Array(count);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;

      order[index] = index;
      unsortedArrival[index] = Math.min(
        1,
        Math.max(
          0,
          getArrival(
            (column + 0.5) * cellWidth,
            (row + 0.5) * cellHeight,
            hashCell(column, row, 1),
            column,
            row,
          ),
        ),
      );
    }
  }

  order.sort((left, right) => unsortedArrival[left] - unsortedArrival[right]);

  const arrival = new Float32Array(count);
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const variation = new Float32Array(count);

  for (let position = 0; position < count; position += 1) {
    const index = order[position];
    const column = index % columns;
    const row = (index - column) / columns;

    arrival[position] = unsortedArrival[index];
    x[position] = column * cellWidth;
    y[position] = row * cellHeight;
    variation[position] = hashCell(column, row, 2);
  }

  return { arrival, cellHeight, cellWidth, count, variation, x, y };
}

/* Moves `cursor` past every cell the front has reached at `progress` and
   returns the new cursor. Cells in [old cursor, new cursor) are the ones
   reached since the last call. */
export function advanceCellCursor(
  front: CellFront,
  cursor: number,
  progress: number,
) {
  let next = cursor;

  while (next < front.count && front.arrival[next] <= progress) {
    next += 1;
  }

  return next;
}
