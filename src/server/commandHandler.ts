/**
 * Server Command Handler
 * Handles ServerGameCommand -> new state + events
 * Pure state transition functions - no game engine orchestration
 */

import type {
  ServerGameState,
  ServerGameCommand,
  ServerGameEvent,
  ServerPlayer,
  ServerDiceResult,
  PublicGameState,
  ServerQuestion,
  PublicQuestion,
  PlayerSnapshot,
  GameStatus,
  PlayerStatus,
  ChoiceIndex,
  GameId,
  GamePin,
  TeacherId,
  PlayerId,
  QuestionId,
  AvatarId,
  SessionId,
  CommandResult,
  JoinGameResult,
  RejoinGameResult,
  JoinGameCommand,
  RejoinGameCommand,
  SubmitAnswerCommand,
  RollDiceCommand,
  RandomizeAvatarCommand,
  ChangeAvatarCommand,
  StartGameCommand,
  NextQuestionCommand,
  SkipQuestionCommand,
  LeaveGameCommand,
  GameStateUpdatedEvent,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  QuestionStartedEvent,
  AnswerEvaluatedEvent,
  RollQueueUpdatedEvent,
  DiceRolledEvent,
  PlayerMovingEvent,
  PlayerMovedEvent,
  PhaseChangedEvent,
  GameFinishedEvent,
  PlayerAvatarChangedEvent,
  ErrorEvent,
} from './gameState';

import {
  validateCommand,
  validatePlayerSession,
  validateGamePhase,
  validatePlayerPermission,
} from './validation';
import { getJoinBonusMultiplier } from '@/lib/game-data';

// ============================================================================
// Command Result Types (Extended for Handler)
// ============================================================================

export interface ApplyCommandResult {
  newState: ServerGameState;
  events: ServerGameEvent[];
  commandResult: CommandResult<any>;
}

// ============================================================================
// Utility Functions
// ============================================================================

function cloneState(state: ServerGameState): ServerGameState {
  return JSON.parse(JSON.stringify(state));
}

function createEvent<T extends ServerGameEvent['type']>(
  type: T,
  payload: T extends 'ERROR' ? { code: string; message: string } : Record<string, unknown>
): ServerGameEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    ...payload,
  } as ServerGameEvent;
}

function createErrorResult(code: string, message: string): CommandResult {
  return {
    success: false,
    error: { code, message },
  };
}

function createSuccessResult<T>(data: T): CommandResult<T> {
  return {
    success: true,
    data,
  };
}

// ============================================================================
// State Mutation Helpers (Immutable)
// ============================================================================

function updateState<T extends ServerGameState>(state: ServerGameState, updates: Partial<ServerGameState>): ServerGameState {
  return {
    ...state,
    ...updates,
    updatedAt: new Date().toISOString(),
    version: state.version + 1,
  };
}

function updatePlayer(state: ServerGameState, playerId: string, updates: Partial<ServerPlayer>): ServerGameState {
  const playerIndex = state.players.findIndex(p => p.playerId === playerId);
  if (playerIndex === -1) return state;

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = { ...newPlayers[playerIndex], ...updates };

  return updateState(state, { players: newPlayers });
}

function addEvent(events: ServerGameEvent[], event: ServerGameEvent): void {
  events.push(event);
}

// ============================================================================
// Command Handlers (Individual)
// ============================================================================

// TODO: Implement proper question selection from game's question set
// For now, use mock question from gameState
function getNextQuestion(state: ServerGameState): ServerQuestion | undefined {
  // TODO: Implement proper question selection from game_questions table
  // For now, return undefined (no more questions)
  return undefined;
}

function applyJoinGame(state: ServerGameState, command: any): ApplyCommandResult {
  const events: ServerGameEvent[] = [];

  // Check if player with same display name already exists
  const isDuplicate = state.players.some(
    p => p.displayName && p.displayName.trim().toLowerCase() === String(command.displayName).trim().toLowerCase()
  );
  if (isDuplicate) {
    return {
      newState: state,
      events: [],
      commandResult: {
        success: false,
        error: {
          code: 'DUPLICATE_DISPLAY_NAME',
          message: 'ชื่อนี้มีผู้ใช้ในห้องแล้ว กรุณาเลือกชื่ออื่น',
        },
      },
    };
  }

  // Create new player with server-calculated join order and bonus multiplier
  const joinOrder = state.players.length + 1;
  const bonusMultiplier = getJoinBonusMultiplier(joinOrder);
  const baseScore = 1;
  const finalScore = baseScore * bonusMultiplier;

  const newPlayer: ServerPlayer = {
    playerId: command.sessionId as any, // sessionId used as playerId
    displayName: command.displayName,
    avatarId: (command.preferredAvatarId as any) || 'avatar-01',
    position: 1,
    score: finalScore,
    baseScore,
    finalScore,
    joinOrder,
    bonusMultiplier,
    status: 'waiting' as const,
    joinedAt: new Date().toISOString(),
    isConnected: true,
    sessionId: command.sessionId,
    correctAnswersCount: 0,
    wrongAnswersCount: 0,
    snakesHitCount: 0,
    laddersUsedCount: 0,
    specialEventsCount: 0,
    diceRollsCount: 0,
  };

  const updatedPlayers = [...state.players, newPlayer];
  const updatedLeaderboard = updatedPlayers
    .map(p => ({
      playerId: p.playerId,
      displayName: p.displayName,
      avatarId: p.avatarId,
      position: p.position,
      score: p.finalScore ?? p.score,
      baseScore: p.baseScore ?? p.score,
      finalScore: p.finalScore ?? p.score,
      joinOrder: p.joinOrder,
      bonusMultiplier: p.bonusMultiplier,
      status: p.status,
      finishOrder: p.finishOrder,
      finishBonus: p.finishBonus,
      correctAnswersCount: p.correctAnswersCount ?? 0,
      wrongAnswersCount: p.wrongAnswersCount ?? 0,
      snakesHitCount: p.snakesHitCount ?? 0,
      laddersUsedCount: p.laddersUsedCount ?? 0,
      specialEventsCount: p.specialEventsCount ?? 0,
      diceRollsCount: p.diceRollsCount ?? 0,
    }))
    .sort((a, b) => b.score - a.score || b.position - a.position);

  const newState = updateState(state, {
    players: updatedPlayers,
    leaderboard: updatedLeaderboard,
    gameStatus: 'lobby' as const,
  });

  addEvent(events, createEvent('PLAYER_JOINED', {
    player: {
      playerId: newPlayer.playerId,
      displayName: newPlayer.displayName,
      avatarId: newPlayer.avatarId,
      position: newPlayer.position,
      score: newPlayer.score,
      baseScore: newPlayer.baseScore,
      finalScore: newPlayer.finalScore,
      joinOrder: newPlayer.joinOrder,
      bonusMultiplier: newPlayer.bonusMultiplier,
      status: newPlayer.status,
    },
    playerCount: newState.players.length,
  }));

  return {
    newState,
    events,
    commandResult: {
      success: true,
      data: {
        playerId: newPlayer.playerId,
        gameState: newState,
      },
    },
  };
}

function applyRejoinGame(state: ServerGameState, command: any): ApplyCommandResult {
  const events: ServerGameEvent[] = [];

  // TODO: Validate session and find player
  // TODO: Restore player connection

  // Mock: find existing player
  const playerIndex = state.players.findIndex(p => p.playerId === command.playerId);
  if (playerIndex === -1) {
    return {
      newState: state,
      events: [],
      commandResult: { success: false, error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found in game' } },
    };
  }

  const newState = updatePlayer(state, command.playerId, { isConnected: true });

  addEvent(events, createEvent('PLAYER_JOINED', {
    player: {
      playerId: command.playerId,
      displayName: state.players[playerIndex].displayName,
      avatarId: state.players[playerIndex].avatarId,
      position: state.players[playerIndex].position,
      score: state.players[playerIndex].score,
      status: state.players[playerIndex].status,
    },
    playerCount: newState.players.length,
  }));

  return {
    newState,
    events,
    commandResult: { success: true, data: { playerId: command.playerId, gameState: newState } },
  };
}

function applySubmitAnswer(state: ServerGameState, command: any): ApplyCommandResult {
  const events: ServerGameEvent[] = [];

  // TODO: Validate question phase
  // TODO: Validate player can answer
  // TODO: Evaluate answer (mock for now)

  const isCorrect = command.choiceIndex === 0; // Mock: first choice is correct
  const earnedRoll = isCorrect;
  const answerTimeMs = Date.now() - command.clientTimestamp;

  let newState = state;
  let player = state.players.find(p => p.playerId === command.playerId);

  if (player) {
    newState = updatePlayer(state, command.playerId, {
      status: 'answered' as const,
      answeredAt: new Date().toISOString(),
      answerTimeMs,
    });
  }

  // Build roll queue
  const rollQueue = [...state.rollQueue];
  if (isCorrect && !rollQueue.includes(command.playerId)) {
    rollQueue.push(command.playerId);
    newState = updateState(newState, { rollQueue });
  }

  addEvent(events, createEvent('ANSWER_EVALUATED', {
    playerId: command.playerId,
    correct: isCorrect,
    answerTimeMs,
    earnedRoll,
    queuePosition: earnedRoll ? rollQueue.indexOf(command.playerId) + 1 : undefined,
  }));

  if (earnedRoll && rollQueue.length > 0) {
    // Transition to rolling phase
    newState = updateState(newState, {
      gameStatus: 'rolling',
      currentPlayerId: rollQueue[0],
      phaseStartedAt: new Date().toISOString(),
    });

    addEvent(events, createEvent('PHASE_CHANGED', {
      fromStatus: 'question',
      toStatus: 'rolling',
    }));

    addEvent(events, createEvent('ROLL_QUEUE_UPDATED', {
      rollQueue,
      currentPlayerId: rollQueue[0],
    }));
  }

  addEvent(events, createEvent('ANSWER_EVALUATED', {
    playerId: command.playerId,
    correct: isCorrect,
    answerTimeMs,
    earnedRoll,
    queuePosition: earnedRoll ? rollQueue.indexOf(command.playerId) + 1 : undefined,
  }));

  return {
    newState,
    events,
    commandResult: {
      success: true,
      data: { correct: isCorrect, answerTimeMs, earnedRoll, queuePosition: earnedRoll ? rollQueue.indexOf(command.playerId) + 1 : undefined },
    },
  };
}

function applyRollDice(state: ServerGameState, command: any): ApplyCommandResult {
  const events: ServerGameEvent[] = [];

  // TODO: Validate it's player's turn
  // TODO: Generate secure dice roll

  const diceValue = Math.floor(Math.random() * 6) + 1 as 1 | 2 | 3 | 4 | 5 | 6;
  const animationSeed = `seed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const diceResult = {
    value: diceValue,
    animationSeed,
    rolledAt: new Date().toISOString(),
    rolledBy: command.playerId as any,
    rngSeed: `rng-${Date.now()}-${Math.random()}`,
  };

  // Update state with dice result
  let newState = updateState(state, { dice: diceResult });

  // Calculate movement
  const player = state.players.find(p => p.playerId === command.playerId);
  if (player) {
    // TODO: Use calculateFinalPosition from game-data
    const newPosition = Math.min(100, player.position + diceValue);
    newState = updatePlayer(state, command.playerId, {
      position: newPosition,
      score: newPosition,
      lastRoll: diceValue,
      status: 'moving' as const,
    });

    // Add movement event
    addEvent(events, createEvent('DICE_ROLLED', {
      dice: { value: diceValue, animationSeed },
      playerId: command.playerId,
    }));

    addEvent(events, createEvent('PLAYER_MOVING', {
      playerId: command.playerId,
      fromPosition: player.position,
      toPosition: newPosition,
      path: [player.position, newPosition],
      diceValue,
      bounced: false,
    }));

    // TODO: Apply board effects (snakes/ladders)
    // TODO: Check finish condition
  }

  // Transition to round_complete phase
  newState = updateState(newState, {
    gameStatus: 'round_complete',
  });

  addEvent(events, createEvent('PHASE_CHANGED', {
    fromStatus: 'rolling',
    toStatus: 'round_complete',
  }));

  return {
    newState,
    events,
    commandResult: {
      success: true,
      data: { dice: diceResult },
    },
  };
}

function applyRandomizeAvatar(state: ServerGameState, command: any): ApplyCommandResult {
  const events: ServerGameEvent[] = [];

  // TODO: Get available avatars, exclude used ones
  const newAvatarId = `avatar-${Math.floor(Math.random() * 12).toString().padStart(2, '0')}` as any;

  const newState = updatePlayer(state, command.playerId, { avatarId: newAvatarId });

  addEvent(events, createEvent('PLAYER_AVATAR_CHANGED', {
    playerId: command.playerId,
    newAvatarId,
  }));

  return {
    newState,
    events,
    commandResult: { success: true, data: { newAvatarId } },
  };
}

function applyChangeAvatar(state: ServerGameState, command: any): ApplyCommandResult {
  const events: ServerGameEvent[] = [];

  // TODO: Validate avatar availability for 'pick' mode
  const newState = updatePlayer(state, command.playerId, { avatarId: command.newAvatarId });

  addEvent(events, createEvent('PLAYER_AVATAR_CHANGED', {
    playerId: command.playerId,
    newAvatarId: command.newAvatarId,
  }));

  return {
    newState,
    events,
    commandResult: { success: true, data: { newAvatarId: command.newAvatarId } },
  };
}

function applyStartGame(state: ServerGameState, command: any): ApplyCommandResult {
  const events: ServerGameEvent[] = [];

  // TODO: Validate teacher owns game
  // TODO: Validate game in lobby
  // TODO: Validate minimum players
  // TODO: Select first question

  const newState = updateState(state, {
    gameStatus: 'question',
    currentRound: 1,
    phaseStartedAt: new Date().toISOString(),
    phaseEndsAt: new Date(Date.now() + 15000).toISOString(),
  });

  addEvent(events, createEvent('PHASE_CHANGED', {
    fromStatus: 'lobby',
    toStatus: 'question',
  }));

  addEvent(events, createEvent('QUESTION_STARTED', {
    question: getNextQuestion(state) || {
      questionId: 'q1' as any,
      question: 'เมืองหลวงของประเทศไทยคือกรุงไหน?',
      choices: ['กรุงเทพมหานคร', 'เชียงใหม่', 'ภูเก็ต', 'ขอนแก่น'],
      category: 'สังคมศึกษา',
      difficulty: 'easy',
    },
    round: 1,
    countdownSeconds: 15,
    questionStartTime: new Date().toISOString(),
  }));

  return {
    newState,
    events,
    commandResult: { success: true },
  };
}

function applyNextQuestion(state: ServerGameState, command: any): ApplyCommandResult {
  const events: ServerGameEvent[] = [];

  // TODO: Validate teacher
  // TODO: Check if more questions available
  // TODO: Select next question

  const newState = updateState(state, {
    gameStatus: 'question',
    currentRound: state.currentRound + 1,
    currentQuestion: getNextQuestion(state),
    questionStartTime: new Date().toISOString(),
    phaseStartedAt: new Date().toISOString(),
    phaseEndsAt: new Date(Date.now() + 15000).toISOString(),
  });

  addEvent(events, createEvent('PHASE_CHANGED', {
    fromStatus: 'round_complete',
    toStatus: 'question',
  }));

  return {
    newState,
    events,
    commandResult: { success: true },
  };
}

function applySkipQuestion(state: ServerGameState, command: any): ApplyCommandResult {
  const events: ServerGameEvent[] = [];

  // TODO: Same as next question but marks as skipped
  return applyNextQuestion(state, command);
}

function applyLeaveGame(state: ServerGameState, command: any): ApplyCommandResult {
  const events: ServerGameEvent[] = [];

  const newState = updatePlayer(state, command.playerId, { isConnected: false });

  addEvent(events, createEvent('PLAYER_LEFT', {
    playerId: command.playerId,
    playerCount: newState.players.length,
  }));

  return {
    newState,
    events,
    commandResult: { success: true },
  };
}

// ============================================================================
// Main Command Router
// ============================================================================

export function applyCommand(
  state: ServerGameState,
  command: any
): ApplyCommandResult {
  const events: ServerGameEvent[] = [];

  // Validate command structure
  const validation = validateCommand(command);
  if (!validation.valid) {
    return {
      newState: state,
      events: [],
      commandResult: { success: false, error: { code: 'VALIDATION_ERROR', message: validation.errors.map(e => e.message).join(', ') } },
    };
  }

  // Route to specific handler
  switch (command.type) {
    case 'JOIN_GAME':
      return applyJoinGame(state, command);
    case 'REJOIN_GAME':
      return applyRejoinGame(state, command);
    case 'SUBMIT_ANSWER':
      return applySubmitAnswer(state, command);
    case 'ROLL_DICE':
      return applyRollDice(state, command);
    case 'RANDOMIZE_AVATAR':
      return applyRandomizeAvatar(state, command);
    case 'CHANGE_AVATAR':
      return applyChangeAvatar(state, command);
    case 'START_GAME':
      return applyStartGame(state, command);
    case 'NEXT_QUESTION':
      return applyNextQuestion(state, command);
    case 'SKIP_QUESTION':
      return applySkipQuestion(state, command);
    case 'LEAVE_GAME':
      return applyLeaveGame(state, command);
    default:
      return {
        newState: state,
        events: [],
        commandResult: { success: false, error: { code: 'UNKNOWN_COMMAND', message: 'Unknown command type' } },
      };
  }
}

// Re-export validation for external use
export { validateCommand, validatePlayerSession, validateGamePhase, validatePlayerPermission } from './validation';