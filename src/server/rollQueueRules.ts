/**
 * Pure Roll Queue Rules Functions
 * Server-side roll queue management - pure functions only
 * No side effects, no mutation, no random, no date, no I/O
 */

import type {
  PlayerId,
  PlayerStatus,
  ServerPlayer,
  ServerGameState,
} from './gameState';

// ============================================================================
// Roll Queue Types
// ============================================================================

export interface RollQueueEntry {
  playerId: PlayerId;
  answerTimeMs: number;
}

export type RollQueue = RollQueueEntry[];

// ============================================================================
// Statuses that are NOT allowed in roll queue
// ============================================================================

const EXCLUDED_STATUSES: ReadonlySet<PlayerStatus> = new Set<PlayerStatus>([
  'disconnected',
  'finished',
] as const);

function isEligibleForRollQueue(player: ServerPlayer): boolean {
  return player.answerTimeMs !== undefined &&
         !EXCLUDED_STATUSES.has(player.status);
}

// ============================================================================
// Pure Roll Queue Functions
// ============================================================================

/**
 * Build roll queue from game state players
 * Filters eligible players who answered correctly and sorts by answerTimeMs
 * Tie-breaker: playerId (deterministic)
 */
export function buildRollQueue(players: ServerPlayer[]): RollQueue {
  return players
    .filter(isEligibleForRollQueue)
    .map(player => ({
      playerId: player.playerId,
      answerTimeMs: player.answerTimeMs!,
    }))
    .sort((a, b) => {
      // Primary sort: answerTimeMs ascending (faster = first)
      if (a.answerTimeMs !== b.answerTimeMs) {
        return a.answerTimeMs - b.answerTimeMs;
      }
      // Tie-breaker: playerId (deterministic)
      return a.playerId.localeCompare(b.playerId);
    });
}

/**
 * Add player to roll queue maintaining order
 * No duplicate playerId allowed
 */
export function addToRollQueue(
  queue: RollQueue,
  entry: { playerId: PlayerId; answerTimeMs: number }
): RollQueue {
  // Check for duplicate
  if (queue.some(e => e.playerId === entry.playerId)) {
    return queue; // No duplicate allowed
  }

  const newQueue = [...queue, entry];
  
  // Sort by answerTimeMs, then playerId for tie-breaker
  return newQueue.sort((a, b) => {
    if (a.answerTimeMs !== b.answerTimeMs) {
      return a.answerTimeMs - b.answerTimeMs;
    }
    return a.playerId.localeCompare(b.playerId);
  });
}

/**
 * Remove player from roll queue
 * Returns new array without mutating original
 */
export function removeFromRollQueue(
  queue: RollQueue,
  playerId: PlayerId
): RollQueue {
  return queue.filter(entry => entry.playerId !== playerId);
}

/**
 * Get current player who should roll
 * Returns first player in queue or null if empty
 */
export function getCurrentRollPlayer(queue: RollQueue): PlayerId | null {
  return queue.length > 0 ? queue[0].playerId : null;
}

/**
 * Check if player can roll (must be first in queue)
 */
export function canPlayerRoll(queue: RollQueue, playerId: PlayerId): boolean {
  return queue.length > 0 && queue[0].playerId === playerId;
}

/**
 * Check if player is in roll queue
 */
export function hasPlayerInRollQueue(queue: RollQueue, playerId: PlayerId): boolean {
  return queue.some(entry => entry.playerId === playerId);
}

/**
 * Clear roll queue
 * Returns empty array
 */
export function clearRollQueue(): RollQueue {
  return [];
}

// ============================================================================
// Export types
// ============================================================================

export type { PlayerId, PlayerStatus, ServerPlayer } from './gameState';