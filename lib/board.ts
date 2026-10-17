import type { BoardCell, SpecialCell } from "./types";

export const BOARD_SIZE = 10;
export const BOARD_TOTAL = BOARD_SIZE * BOARD_SIZE;
export const FINISH_AT = BOARD_TOTAL;

/**
 * Standard Snake & Ladder numbering (boustrophedon).
 *
 *        100  99 ... 91   (row 9, top)
 *         20  21 ... 30
 *          1   2 ... 10   (row 0, bottom)
 */
export function numberToPosition(number: number) {
  const clamped = Math.max(1, Math.min(BOARD_TOTAL, number));
  const rowFromBottom = Math.floor((clamped - 1) / BOARD_SIZE);
  const offset = (clamped - 1) % BOARD_SIZE;
  const col = rowFromBottom % 2 === 0 ? offset : BOARD_SIZE - 1 - offset;
  return { row: rowFromBottom, col };
}

export function positionToNumber(rowFromBottom: number, col: number) {
  const row = ((rowFromBottom % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  const offset = row % 2 === 0 ? col : BOARD_SIZE - 1 - col;
  return row * BOARD_SIZE + offset + 1;
}

/** centre of a cell expressed in percent of the board box (0-100) */
export function numberToPercent(number: number) {
  const { row, col } = numberToPosition(number);
  return {
    x: (col + 0.5) * (100 / BOARD_SIZE),
    y: (9 - row + 0.5) * (100 / BOARD_SIZE),
  };
}

export interface BoardSource {
  snakes: { from: number; to: number }[];
  ladders: { from: number; to: number }[];
  specialCells: SpecialCell[];
}

export function buildBoardCells(source: BoardSource): BoardCell[] {
  const snakeMap = new Map(source.snakes.map((s) => [s.from, s]));
  const ladderMap = new Map(source.ladders.map((s) => [s.from, s]));
  const specialMap = new Map(source.specialCells.map((s) => [s.at, s]));

  const cells: BoardCell[] = [];

  // visual rows: top row first so the DOM grid order reads like the board (row 9 down to row 0)
  for (let visualRow = BOARD_SIZE - 1; visualRow >= 0; visualRow -= 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const number = positionToNumber(visualRow, col);
      const { x, y } = numberToPercent(number);
      const special = specialMap.get(number) ?? null;
      const snake = snakeMap.get(number) ?? null;
      const ladder = ladderMap.get(number) ?? null;

      let tone: BoardCell["tone"] = number % 2 === 0 ? "dark" : "light";
      if (special?.kind === "start") tone = "start";
      if (special?.kind === "finish") tone = "finish";
      if (special && tone !== "finish" && tone !== "start") tone = "special";

      cells.push({ number, row: visualRow, col, x, y, tone, special, snake, ladder });
    }
  }

  return cells;
}

/** where a player token sits, in percent, with a small group offset */
export function playerTokenPosition(
  number: number,
  indexInCell: number,
  countInCell: number,
) {
  const { x, y } = numberToPercent(number);
  if (countInCell <= 1) return { x, y, scale: 1 };

  // arrange a group in a small ring so tokens never fully overlap
  const spread = 2.35;
  const angle = (indexInCell / countInCell) * Math.PI * 2 - Math.PI / 2;
  const radius = countInCell <= 4 ? 2.5 : 3.1;
  return {
    x: x + Math.cos(angle) * radius * (spread / 2.5),
    y: y + Math.sin(angle) * radius * (spread / 2.5),
    scale: countInCell <= 3 ? 0.92 : countInCell <= 6 ? 0.78 : 0.66,
  };
}

/**
 * Build the ordered list of squares travelled when moving `steps` squares.
 * Implements exact landing bounce-back at `max` (100):
 * e.g., from 98 with roll 5 -> [99, 100, 99, 98, 97].
 */
export function walkPath(from: number, steps: number, max: number = FINISH_AT): number[] {
  const path: number[] = [];
  if (steps === 0) return path;

  if (steps < 0) {
    let cursor = from;
    const count = Math.abs(steps);
    for (let i = 0; i < count; i += 1) {
      cursor = Math.max(1, cursor - 1);
      path.push(cursor);
    }
    return path;
  }

  let cursor = Math.max(1, from);
  let direction = 1;
  for (let i = 0; i < steps; i += 1) {
    cursor += direction;
    if (cursor > max) {
      cursor = max - 1;
      direction = -1;
    }
    if (cursor < 1) {
      cursor = 1;
      direction = 1;
    }
    path.push(cursor);
  }
  return path;
}
