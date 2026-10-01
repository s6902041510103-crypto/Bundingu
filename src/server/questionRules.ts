/**
 * Pure Question Rules Functions
 * Server-side question handling rules - pure functions only
 * No side effects, no mutation, no random, no date, no I/O
 */

import type {
  ServerQuestion,
  PublicQuestion,
  ChoiceIndex,
  QuestionId,
  PlayerId,
  PlayerStatus,
  ServerPlayer,
  ServerGameState,
} from './gameState';

import { GAME_CONFIG } from '@/lib/game-data';

// ============================================================================
// Choice Index Validation
// ============================================================================

/**
 * Validate choice index is in valid range 0-3
 * A=0, B=1, C=2, D=3
 */
export function isValidChoiceIndex(choiceIndex: number): choiceIndex is ChoiceIndex {
  return Number.isInteger(choiceIndex) && choiceIndex >= 0 && choiceIndex <= 3;
}

/**
 * Convert letter choice to index
 * A/a -> 0, B/b -> 1, C/c -> 2, D/d -> 3
 */
export function letterToChoiceIndex(letter: string): ChoiceIndex | null {
  const upper = letter.toUpperCase();
  switch (upper) {
    case 'A': return 0;
    case 'B': return 1;
    case 'C': return 2;
    case 'D': return 3;
    default: return null;
  }
}

/**
 * Convert choice index to letter
 */
export function choiceIndexToLetter(index: ChoiceIndex): 'A' | 'B' | 'C' | 'D' {
  return ['A', 'B', 'C', 'D'][index] as 'A' | 'B' | 'C' | 'D';
}

// ============================================================================
// Question Validation
// ============================================================================

/**
 * Check if question ID matches current question in game state
 */
export function isCurrentQuestion(
  gameState: { currentQuestion?: { questionId: string } },
  questionId: string
): boolean {
  return gameState.currentQuestion?.questionId === questionId;
}

/**
 * Validate question ID is provided
 */
export function isValidQuestionId(questionId: string): boolean {
  return typeof questionId === 'string' && questionId.length > 0;
}

// ============================================================================
// Player Status Validation
// ============================================================================

/**
 * Check if player is valid to answer (in game, not already answered)
 */
export function canPlayerAnswer(
  state: { players: Array<{ playerId: string; answeredAt?: string; status: string }> },
  playerId: string
): { canAnswer: boolean; reason?: string } {
  const player = state.players.find(p => p.playerId === playerId);
  
  if (!player) {
    return { canAnswer: false, reason: 'PLAYER_NOT_IN_GAME' };
  }
  
  // Check if already answered
  if (player.answeredAt) {
    return { canAnswer: false, reason: 'ALREADY_ANSWERED' };
  }
  
  // Check if player is in a state that allows answering
  const answeringStatuses = ['waiting', 'answering'];
  if (!answeringStatuses.includes(player.status)) {
    return { canAnswer: false, reason: 'INVALID_PLAYER_STATUS' };
  }
  
  return { canAnswer: true };
}

// ============================================================================
// Answer Evaluation
// ============================================================================

/**
 * Evaluate if answer is correct
 * Uses ServerQuestion.correctAnswer - NEVER hardcode answer
 */
export function evaluateAnswer(
  question: { correctAnswer: number },
  choiceIndex: number
): boolean {
  return choiceIndex === question.correctAnswer;
}

/**
 * Calculate answer time from timestamps
 * Uses provided timestamps ONLY - no Date.now()
 */
export function calculateAnswerTimeMs(
  questionStartTime: string, // ISO 8601 string
  answerTimestamp: string    // ISO 8601 string
): number {
  const start = new Date(questionStartTime).getTime();
  const answer = new Date(answerTimestamp).getTime();
  return Math.max(0, answer - start);
}

// ============================================================================
// Answer Result (for Server internal use)
// ============================================================================

export interface AnswerEvaluationResult {
  choiceIndex: ChoiceIndex;
  correct: boolean;
  answerTimeMs: number;
}

/**
 * Complete answer evaluation with all validations
 */
export function evaluateAnswerComplete(
  question: { correctAnswer: ChoiceIndex; questionId: string },
  choiceIndex: number,
  questionStartTime: string,
  answerTimestamp: string
): {
  choiceIndex: ChoiceIndex;
  correct: boolean;
  answerTimeMs: number;
} {
  // Evaluate correctness using ServerQuestion.correctAnswer
  const isCorrect = choiceIndex === question.correctAnswer;
  
  // Calculate answer time using provided timestamps
  const answerTimeMs = calculateAnswerTimeMs(questionStartTime, answerTimestamp);
  
  return {
    choiceIndex: choiceIndex as ChoiceIndex,
    correct: isCorrect,
    answerTimeMs,
  };
}

// ============================================================================
// Question Validation Helpers
// ============================================================================

/**
 * Validate if question matches current game state
 */
export function validateQuestionForGame(
  gameState: { currentQuestion?: { questionId: string }; gameStatus: string },
  questionId: string
): { valid: boolean; error?: string } {
  // Check if game is in question phase
  if (gameState.gameStatus !== 'question') {
    return { valid: false, error: 'NOT_IN_QUESTION_PHASE' };
  }
  
  // Check if question matches current
  if (!gameState.currentQuestion) {
    return { valid: false, error: 'NO_CURRENT_QUESTION' };
  }
  
  if (gameState.currentQuestion.questionId !== questionId) {
    return { valid: false, error: 'QUESTION_MISMATCH' };
  }
  
  return { valid: true };
}

// ============================================================================
// Player Answer Status
// ============================================================================

export interface PlayerAnswerStatus {
  playerId: string;
  hasAnswered: boolean;
  answerTimeMs?: number;
  choiceIndex?: ChoiceIndex;
}

export function getPlayerAnswerStatus(
  state: { players: Array<{ playerId: string; answeredAt?: string; answerTimeMs?: number; status: string }> },
  playerId: string
): { playerId: string; hasAnswered: boolean; answerTimeMs?: number; choiceIndex?: ChoiceIndex } | null {
  const player = state.players.find(p => p.playerId === playerId);
  if (!player) return null;
  
  return {
    playerId: player.playerId,
    hasAnswered: !!player.answeredAt,
    answerTimeMs: player.answerTimeMs,
    choiceIndex: undefined, // Would need to be tracked separately
  };
}

// ============================================================================
// Export all
// ============================================================================

export type {
  ChoiceIndex,
} from '@/domain/types';