/**
 * Pure Board Rules Functions
 * Re-exports from game-data.ts and adds missing functions
 * Pure functions - no mutation, no side effects, no random, no date, no I/O
 */

import {
  GAME_CONFIG,
  SNAKES,
  LADDERS,
  calculateNextPosition,
  applyBoardEffects,
  calculateFinalPosition,
  isFinishCell,
} from '@/lib/game-data';
import type { ChoiceIndex } from '@/domain/types';

// ============================================================================
// Re-export existing functions from game-data.ts
// ============================================================================

export {
  GAME_CONFIG,
  SNAKES,
  LADDERS,
  calculateNextPosition,
  applyBoardEffects,
  calculateFinalPosition,
  isFinishCell,
};

// ============================================================================
// Missing Functions - Pure Functions
// ============================================================================

/**
 * Calculate finish bonus based on finish order
 * 1st place: +3
 * 2nd place: +2
 * 3rd place: +1
 * 4th+: 0
 */
export function calculateFinishBonus(finishOrder: number): number {
  switch (finishOrder) {
    case 1:
      return GAME_CONFIG.scoring.finishBonus.first;
    case 2:
      return GAME_CONFIG.scoring.finishBonus.second;
    case 3:
      return GAME_CONFIG.scoring.finishBonus.third;
    default:
      return 0;
  }
}

/**
 * Calculate final score = position + finishBonus
 */
export function calculateFinalScore(position: number, finishBonus: number): number {
  return position + finishBonus;
}

// ============================================================================
// Dice Validation (Pure)
// ============================================================================

/**
 * Validate dice value is in valid range 1-6
 */
export function isValidDiceValue(diceValue: number): diceValue is 1 | 2 | 3 | 4 | 5 | 6 {
  return Number.isInteger(diceValue) && diceValue >= GAME_CONFIG.dice.min && diceValue <= GAME_CONFIG.dice.max;
}

// ============================================================================
// Type Guards / Type Narrowing
// ============================================================================

/**
 * Check if position is a valid board cell (1-100)
 */
export function isValidPosition(position: number): boolean {
  return Number.isInteger(position) && position >= 1 && position <= GAME_CONFIG.board.totalCells;
}

/**
 * Narrow dice value to valid type
 */
export function toValidDiceValue(value: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (!isValidDiceValue(value)) {
    throw new Error(`Invalid dice value: ${value}. Must be 1-6.`);
  }
  return value;
}

// ============================================================================
// Re-export types that consumers might need
// ============================================================================

export type { ChoiceIndex } from '@/domain/types';