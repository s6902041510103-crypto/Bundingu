/**
 * Game Configuration & Static Data
 * Separated from UI components for clean architecture
 * Used by both Client (preview) and Server Game Logic (authoritative)
 */

export const GAME_CONFIG = {
  board: {
    width: 10,
    height: 10,
    totalCells: 100,
  },
  dice: {
    min: 1,
    max: 6,
  },
  question: {
    countdownSeconds: 15,
    choicesCount: 4,
  },
  players: {
    maxPerRoom: 40,
  },
  rounds: {
    options: [5, 10, 15, 20],
    default: 10,
  },
  scoring: {
    finishBonus: {
      first: 3,
      second: 2,
      third: 1,
    },
  },
  avatars: {
    total: 12,
    prefix: 'avatar',
  },
} as const;

// Snake: head -> tail (higher to lower)
export const SNAKES: ReadonlyArray<{ from: number; to: number }> = [
  { from: 98, to: 62 },
  { from: 84, to: 43 },
  { from: 65, to: 31 },
  { from: 47, to: 19 },
] as const;

// Ladder: foot -> top (lower to higher)
export const LADDERS: ReadonlyArray<{ from: number; to: number }> = [
  { from: 7, to: 28 },
  { from: 21, to: 56 },
  { from: 43, to: 78 },
  { from: 61, to: 89 },
] as const;

// Special cells (disabled in MVP)
export const SPECIAL_CELLS: ReadonlyArray<{
  cell: number;
  type: 'BONUS' | 'GIFT' | 'BOOST';
  label: string;
}> = [
  { cell: 25, type: 'BONUS', label: 'Roll Again' },
  { cell: 50, type: 'GIFT', label: 'Move Up 3' },
  { cell: 75, type: 'BOOST', label: 'Free Roll Next Turn' },
] as const;

// Avatar definitions (stable IDs for consistent rendering)
export const AVATARS: ReadonlyArray<{
  id: string;
  animal: string;
  emoji: string;
  gradient: string;
}> = [
  { id: 'avatar-01', animal: 'ช้าง', emoji: '🐘', gradient: 'from-blue-400 to-blue-600' },
  { id: 'avatar-02', animal: 'เสือ', emoji: '🐯', gradient: 'from-orange-400 to-orange-600' },
  { id: 'avatar-03', animal: 'กระรอก', emoji: '🐿️', gradient: 'from-amber-400 to-amber-600' },
  { id: 'avatar-04', animal: 'นกแก้ว', emoji: '🦜', gradient: 'from-green-400 to-teal-600' },
  { id: 'avatar-05', animal: 'กระต่าย', emoji: '🐰', gradient: 'from-pink-400 to-rose-600' },
  { id: 'avatar-06', animal: 'หมา', emoji: '🐶', gradient: 'from-brown-400 to-amber-600' },
  { id: 'avatar-07', animal: 'แมว', emoji: '🐱', gradient: 'from-purple-400 to-violet-600' },
  { id: 'avatar-08', animal: 'เพนกวิน', emoji: '🐧', gradient: 'from-indigo-400 to-blue-600' },
  { id: 'avatar-09', animal: 'ปิงปอง', emoji: '🐼', gradient: 'from-gray-400 to-gray-600' },
  { id: 'avatar-10', animal: 'ค้างคาว', emoji: '🦥', gradient: 'from-lime-400 to-green-600' },
  { id: 'avatar-11', animal: 'สุนัขจิ้งจอก', emoji: '🦊', gradient: 'from-red-400 to-orange-600' },
  { id: 'avatar-12', animal: 'กวาง', emoji: '🦌', gradient: 'from-amber-500 to-orange-700' },
] as const;

// Helper functions
export function getCellPosition(cell: number): { row: number; col: number } {
  if (cell < 1 || cell > GAME_CONFIG.board.totalCells) {
    throw new Error(`Invalid cell: ${cell}. Must be 1-${GAME_CONFIG.board.totalCells}`);
  }
  const row = Math.floor((cell - 1) / GAME_CONFIG.board.width);
  const col = (cell - 1) % GAME_CONFIG.board.width;
  const displayRow = GAME_CONFIG.board.height - 1 - row;
  const isEvenRow = row % 2 === 0;
  const displayCol = isEvenRow ? col : GAME_CONFIG.board.width - 1 - col;
  return { row: displayRow, col: displayCol };
}

export function getSnakeAt(cell: number): { from: number; to: number } | undefined {
  return SNAKES.find(s => s.from === cell);
}

export function getLadderAt(cell: number): { from: number; to: number } | undefined {
  return LADDERS.find(l => l.from === cell);
}

export function getSpecialCellAt(cell: number): typeof SPECIAL_CELLS[0] | undefined {
  return SPECIAL_CELLS.find(c => c.cell === cell);
}

export function getAvatarById(id: string): typeof AVATARS[0] | undefined {
  return AVATARS.find(a => a.id === id);
}

export function getRandomAvatarId(exclude: string[] = []): string {
  const available = AVATARS.filter(a => !exclude.includes(a.id));
  const pool = available.length > 0 ? available : AVATARS;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function calculateNextPosition(
  currentPosition: number,
  diceValue: number
): { position: number; bounced: boolean; bouncedFrom?: number } {
  const targetPosition = currentPosition + diceValue;
  const maxCell = GAME_CONFIG.board.totalCells;

  if (targetPosition > maxCell) {
    // Bounce back: overshoot amount bounces back from 100
    const overshoot = targetPosition - maxCell;
    return {
      position: maxCell - overshoot,
      bounced: true,
      bouncedFrom: targetPosition,
    };
  }

  return { position: targetPosition, bounced: false };
}

export function applyBoardEffects(position: number): number {
  // Check snake first (higher priority - slides down)
  const snake = getSnakeAt(position);
  if (snake) return snake.to;

  // Check ladder
  const ladder = getLadderAt(position);
  if (ladder) return ladder.to;

  // Special cells disabled in MVP
  // const special = getSpecialCellAt(position);
  // if (special && special.enabled) { ... }

  return position;
}

export function calculateFinalPosition(
  currentPosition: number,
  diceValue: number
): { position: number; path: number[]; bounced: boolean } {
  const { position: afterDice, bounced } = calculateNextPosition(currentPosition, diceValue);
  const path = [currentPosition];

  if (bounced) {
    path.push(afterDice);
  } else {
    path.push(afterDice);
  }

  const finalPosition = applyBoardEffects(afterDice);
  if (finalPosition !== afterDice) {
    path.push(finalPosition);
  }

  return { position: finalPosition, path, bounced };
}

export function isFinishCell(position: number): boolean {
  return position === GAME_CONFIG.board.totalCells;
}