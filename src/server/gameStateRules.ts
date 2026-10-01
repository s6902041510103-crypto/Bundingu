/**
 * Pure Game State Rules Functions
 * Server-side game state mutation rules - pure functions only
 * No side effects, no mutation, no random, no date, no I/O
 */

/**
 * Valid phase transitions map
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  lobby: ['waiting_for_question', 'countdown', 'question'],
  waiting_for_question: ['countdown', 'finished'],
  countdown: ['question'],
  question: ['rolling', 'special_event', 'waiting_for_question', 'round_complete'],
  rolling: ['moving', 'special_event', 'waiting_for_question', 'round_complete'],
  moving: ['special_event', 'rolling', 'waiting_for_question', 'round_complete'],
  special_event: ['rolling', 'waiting_for_question', 'round_complete'],
  round_complete: ['waiting_for_question', 'countdown', 'question', 'finished'],
  finished: [],
};

/**
 * Validate phase transition
 */
function validatePhaseTransition(
  currentPhase: string,
  nextPhase: string
): { valid: boolean; error?: string } {
  const validNext = VALID_TRANSITIONS[currentPhase];
  if (!validNext || !validNext.includes(nextPhase)) {
    return {
      valid: false,
      error: `Invalid phase transition: ${currentPhase} -> ${nextPhase}`,
    };
  }
  return { valid: true };
}

// ============================================================================
// Result Types
// ============================================================================

export interface StateUpdateResult<T = any> {
  success: boolean;
  state?: any;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Core State Mutation Helpers (Immutable)
// ============================================================================

export function updateState(state: any, updates: Partial<any>): any {
  return {
    ...state,
    ...updates,
    updatedAt: new Date().toISOString(),
    version: state.version + 1,
  };
}

// ============================================================================
// 1. updateGamePhase
// ============================================================================

/**
 * Update game phase with validation
 */
export function updateGamePhase(
  state: any,
  nextPhase: string,
  timestamp: string
): any {
  const validNext = (VALID_TRANSITIONS as any)[state.gameStatus];
  if (!validNext || !validNext.includes(nextPhase)) {
    return {
      success: false,
      error: { code: 'INVALID_PHASE_TRANSITION', message: `Invalid phase transition: ${state.gameStatus} -> ${nextPhase}` },
    };
  }

  const newState = {
    ...state,
    gameStatus: nextPhase,
    phaseStartedAt: timestamp,
    phaseEndsAt: undefined,
    updatedAt: new Date().toISOString(),
    version: state.version + 1,
  };

  return { success: true, state: newState };
}

// ============================================================================
// 2. addPlayer
// ============================================================================

/**
 * Add player to game state
 */
export function addPlayer(
  state: any,
  player: any
): any {
  // Check for duplicate playerId
  if (state.players.some((p: any) => p.playerId === player.playerId)) {
    return {
      success: false,
      error: { code: 'DUPLICATE_PLAYER', message: `Player ${player.playerId} already exists` },
    };
  }

  const newState = {
    ...state,
    players: [...state.players, player],
    updatedAt: new Date().toISOString(),
    version: state.version + 1,
  };

  return { success: true, state: newState };
}

// ============================================================================
// 3. removePlayer
// ============================================================================

/**
 * Remove player from game state
 */
export function removePlayer(
  state: any,
  playerId: string
): any {
  const playerIndex = state.players.findIndex((p: any) => p.playerId === playerId);
  if (playerIndex === -1) {
    return {
      success: false,
      error: { code: 'PLAYER_NOT_FOUND', message: `Player ${playerId} not found` },
    };
  }

  const newState = {
    ...state,
    players: state.players.filter((p: any) => p.playerId !== playerId),
    updatedAt: new Date().toISOString(),
    version: state.version + 1,
  };

  return { success: true, state: newState };
}

// ============================================================================
// 4. updatePlayer
// ============================================================================

/**
 * Update specific player fields
 */
export function updatePlayer(
  state: any,
  playerId: string,
  updates: any
): any {
  const playerIndex = state.players.findIndex((p: any) => p.playerId === playerId);
  if (playerIndex === -1) {
    return {
      success: false,
      error: { code: 'PLAYER_NOT_FOUND', message: `Player ${playerId} not found` },
    };
  }

  // Prevent mutation of immutable fields
  const { playerId: _, joinedAt, sessionId, ...allowedUpdates } = updates;

  const newState = {
    ...state,
    players: state.players.map((p: any, i: number) =>
      i === playerIndex ? { ...p, ...updates } : p
    ),
    updatedAt: new Date().toISOString(),
    version: state.version + 1,
  };

  return { success: true, state: newState };
}

// ============================================================================
// 5. setCurrentPlayer
// ============================================================================

/**
 * Set current player (whose turn to roll)
 */
export function setCurrentPlayer(
  state: any,
  playerId: string
): any {
  const playerExists = state.players.some((p: any) => p.playerId === playerId);
  if (!playerExists) {
    return {
      success: false,
      error: { code: 'PLAYER_NOT_FOUND', message: `Player ${playerId} not found in game` },
    };
  }

  const newState = {
    ...state,
    currentPlayerId: playerId,
    updatedAt: new Date().toISOString(),
    version: state.version + 1,
  };

  return { success: true, state: newState };
}

// ============================================================================
// 6. setRollQueue
// ============================================================================

/**
 * Update roll queue (immutable)
 */
export function setRollQueue(
  state: any,
  queue: string[]
): any {
  // Validate no duplicates
  const uniqueQueue = queue.filter((playerId, index) => queue.indexOf(playerId) === index);
  if (uniqueQueue.length !== queue.length) {
    return {
      success: false,
      error: { code: 'DUPLICATE_IN_QUEUE', message: 'Roll queue contains duplicate player IDs' },
    };
  }

  // Validate all players exist
  for (const playerId of queue) {
    if (!state.players.some((p: any) => p.playerId === playerId)) {
      return {
        success: false,
        error: { code: 'PLAYER_NOT_IN_GAME', message: `Player ${playerId} not in game` },
      };
    }
  }

  const newState = {
    ...state,
    rollQueue: queue,
    updatedAt: new Date().toISOString(),
    version: state.version + 1,
  };

  return { success: true, state: newState };
}

// ============================================================================
// 7. advanceRound
// ============================================================================

/**
 * Advance to next round
 */
export function advanceRound(
  state: any
): any {
  if (state.currentRound >= state.totalRounds) {
    return {
      success: false,
      error: { code: 'MAX_ROUNDS_REACHED', message: 'Cannot advance beyond total rounds' },
    };
  }

  const newState = {
    ...state,
    currentRound: state.currentRound + 1,
    updatedAt: new Date().toISOString(),
    version: state.version + 1,
  };

  return { success: true, state: newState };
}

// ============================================================================
// 8. incrementVersion
// ============================================================================

/**
 * Increment version for optimistic locking
 */
export function incrementVersion(
  state: any
): any {
  const newState = {
    ...state,
    version: state.version + 1,
    updatedAt: new Date().toISOString(),
  };

  return { success: true, state: newState };
}

// ============================================================================
// 9. touchState
// ============================================================================

/**
 * Update updatedAt timestamp without changing other state
 * Uses provided timestamp - no Date.now()
 */
export function touchState(
  state: any,
  timestamp: string
): any {
  const newState = {
    ...state,
    updatedAt: timestamp,
    version: state.version + 1,
  };

  return { success: true, state: newState };
}

// ============================================================================
// Result Types
// ============================================================================

export interface StateUpdateResult<T = any> {
  success: boolean;
  state?: any;
  error?: {
    code: string;
    message: string;
  };
}