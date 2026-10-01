/**
 * Pure Game Phase Rules Functions
 * Server-side game phase transition rules - pure functions only
 * No side effects, no mutation, no random, no date, no I/O
 */

import type { GameStatus } from '@/domain/types';

// ============================================================================
// Valid Phase Transitions
// ============================================================================

/**
 * Valid phase transitions map
 * Key = from phase, Value = array of valid next phases
 */
const VALID_TRANSITIONS: Readonly<Record<GameStatus, readonly GameStatus[]>> = {
  lobby: ['waiting_for_question', 'countdown', 'question'] as const,
  waiting_for_question: ['countdown', 'finished'] as const,
  countdown: ['question'] as const,
  question: ['rolling', 'special_event', 'waiting_for_question', 'round_complete'] as const,
  rolling: ['moving', 'special_event', 'waiting_for_question', 'round_complete'] as const,
  moving: ['special_event', 'rolling', 'waiting_for_question', 'round_complete'] as const,
  special_event: ['rolling', 'waiting_for_question', 'round_complete'] as const,
  round_complete: ['waiting_for_question', 'countdown', 'question', 'finished'] as const,
  finished: [] as const,
} as const;

// ============================================================================
// Pure Phase Transition Functions
// ============================================================================

/**
 * Check if a phase transition is valid
 */
export function isValidPhaseTransition(
  from: GameStatus,
  to: GameStatus
): boolean {
  const validNext = VALID_TRANSITIONS[from];
  return validNext.includes(to);
}

/**
 * Get all valid next phases from current phase
 */
export function getValidNextPhases(currentPhase: GameStatus): readonly GameStatus[] {
  return VALID_TRANSITIONS[currentPhase];
}

/**
 * Check if game can start (only from lobby)
 */
export function canStartGame(currentPhase: GameStatus): boolean {
  return currentPhase === 'lobby';
}

/**
 * Check if answer can be submitted (only in question phase)
 */
export function canSubmitAnswer(currentPhase: GameStatus): boolean {
  return currentPhase === 'question';
}

/**
 * Check if dice can be rolled (only in rolling phase)
 */
export function canRollDice(currentPhase: GameStatus): boolean {
  return currentPhase === 'rolling';
}

/**
 * Check if player can move (only in moving phase)
 */
export function canMovePlayer(currentPhase: GameStatus): boolean {
  return currentPhase === 'moving';
}

/**
 * Check if round can be completed (only in round_complete phase)
 */
export function canCompleteRound(currentPhase: GameStatus): boolean {
  return currentPhase === 'round_complete';
}

// ============================================================================
// Phase Transition Helpers
// ============================================================================

/**
 * Get all possible phase transitions as array of [from, to] pairs
 */
export function getAllValidTransitions(): readonly [GameStatus, GameStatus][] {
  const transitions: [GameStatus, GameStatus][] = [];
  
  for (const [from, toList] of Object.entries(VALID_TRANSITIONS)) {
    for (const to of toList) {
      transitions.push([from as GameStatus, to]);
    }
  }
  
  return transitions;
}

/**
 * Check if phase is a terminal state (no outgoing transitions)
 */
export function isTerminalPhase(phase: GameStatus): boolean {
  return VALID_TRANSITIONS[phase].length === 0;
}

/**
 * Check if phase is an initial state (no incoming transitions from other phases)
 * Note: lobby is the only initial phase
 */
export function isInitialPhase(phase: GameStatus): boolean {
  return phase === 'lobby';
}

/**
 * Get all phases that can transition TO the given phase
 */
export function getPhasesThatCanTransitionTo(targetPhase: GameStatus): GameStatus[] {
  const sources: GameStatus[] = [];
  
  for (const [from, toList] of Object.entries(VALID_TRANSITIONS)) {
    if ((toList as readonly GameStatus[]).includes(targetPhase)) {
      sources.push(from as GameStatus);
    }
  }
  
  return sources;
}

// ============================================================================
// Type exports
// ============================================================================

export type { GameStatus } from '@/domain/types';