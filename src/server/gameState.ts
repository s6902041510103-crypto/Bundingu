/**
 * Server Game State Types
 * Authoritative game state for server-side game logic
 * Reused from domain types where possible
 */

import type {
  GameId,
  GamePin,
  TeacherId,
  PlayerId,
  QuestionId,
  AvatarId,
  GameStatus,
  PlayerStatus,
  ChoiceIndex,
  SessionId,
  PublicQuestion,
  ServerQuestion,
  Player,
  PlayerSnapshot,
  DiceResult,
  GameBoardConfig,
} from '@/domain/types';

// Re-export domain types for server module consumers
export type {
  GameId,
  GamePin,
  TeacherId,
  PlayerId,
  QuestionId,
  AvatarId,
  GameStatus,
  PlayerStatus,
  ChoiceIndex,
  SessionId,
  PublicQuestion,
  ServerQuestion,
  PlayerSnapshot,
} from '@/domain/types';
import { GAME_CONFIG, calculateFinalPosition, applyBoardEffects, isFinishCell } from '@/lib/game-data';

// ============================================================================
// Server Game State (Authoritative)
// ============================================================================

export interface ServerGameState {
  // Identity
  gameId: GameId;
  gamePin: GamePin;
  teacherId: TeacherId;

  // Configuration
  totalRounds: number;
  board: GameBoardConfig;

  // Runtime State
  gameStatus: GameStatus;
  currentRound: number; // 1-based
  currentQuestion?: ServerQuestion; // ServerQuestion (has correctAnswer)
  questionStartTime?: string; // ISO 8601

  // Players
  players: ServerPlayer[];
  currentPlayerId?: PlayerId; // player whose turn to roll (during ROLLING)
  rollQueue: PlayerId[]; // ordered by answer speed

  // Dice
  dice?: ServerDiceResult;

  // Phase Timing
  phaseStartedAt: string; // ISO 8601
  phaseEndsAt?: string; // ISO 8601 (for countdown)

  // Leaderboard (computed)
  leaderboard: PlayerSnapshot[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  version: number; // incremented on each state change (optimistic locking)
}

// ============================================================================
// Public Game State (Safe for Client)
// ============================================================================

export interface PublicGameState {
  // Identity (safe for client)
  gameId: GameId;
  gamePin: GamePin;
  // teacherId: EXCLUDED - not needed by client

  // Configuration
  totalRounds: number;
  board: GameBoardConfig;

  // Runtime State
  gameStatus: GameStatus;
  currentRound: number; // 1-based
  currentQuestion?: PublicQuestion; // PublicQuestion - NO correctAnswer!
  questionStartTime?: string; // ISO 8601

  // Players
  players: PublicPlayer[];
  currentPlayerId?: PlayerId; // player whose turn to roll (during ROLLING)
  rollQueue: PlayerId[]; // ordered by answer speed

  // Dice
  dice?: PublicDiceResult; // no rngSeed

  // Phase Timing
  phaseStartedAt: string; // ISO 8601
  phaseEndsAt?: string; // ISO 8601 (for countdown)

  // Leaderboard (computed)
  leaderboard: PlayerSnapshot[];

  // Metadata (limited)
  createdAt: string;
  updatedAt: string;
  version: number; // incremented on each state change (optimistic locking)
}

// Player type safe for client
export interface PublicPlayer {
  playerId: PlayerId;
  displayName: string;
  avatarId: AvatarId;
  position: number;
  score: number;
  status: PlayerStatus;
  finishOrder?: number;
  finishBonus?: number;
  isConnected: boolean;
}

// Dice result safe for client (no rngSeed)
export interface PublicDiceResult {
  value: 1 | 2 | 3 | 4 | 5 | 6;
  animationSeed: string;
  rolledAt: string;
  rolledBy: PlayerId;
}

// Strip correctAnswer from ServerQuestion to create PublicQuestion
export function stripCorrectAnswer(question: ServerQuestion): PublicQuestion {
  const { correctAnswer, ...publicQuestion } = question;
  return publicQuestion;
}

// Strip sensitive fields from ServerDiceResult
export function stripDiceSeed(dice: ServerDiceResult): PublicDiceResult {
  const { rngSeed, ...publicDice } = dice;
  return publicDice;
}

// Convert ServerPlayer to PublicPlayer (strip sensitive fields)
export function stripPlayerSession(player: ServerPlayer): PublicPlayer {
  const { sessionId, answeredAt, answerTimeMs, lastRoll, joinedAt, isConnected, ...rest } = player;
  // Include only safe fields for client
  return {
    playerId: player.playerId,
    displayName: player.displayName,
    avatarId: player.avatarId,
    position: player.position,
    score: player.score,
    status: player.status,
    finishOrder: player.finishOrder,
    finishBonus: player.finishBonus,
    isConnected: player.isConnected,
  };
}

// Convert ServerGameState to PublicGameState (strip all sensitive data)
export function toPublicGameState(state: ServerGameState): PublicGameState {
  return {
    gameId: state.gameId,
    gamePin: state.gamePin,
    totalRounds: state.totalRounds,
    board: state.board,
    gameStatus: state.gameStatus,
    currentRound: state.currentRound,
    currentQuestion: state.currentQuestion ? stripCorrectAnswer(state.currentQuestion) : undefined,
    questionStartTime: state.questionStartTime,
    players: state.players.map(stripPlayerSession),
    currentPlayerId: state.currentPlayerId,
    rollQueue: state.rollQueue,
    dice: state.dice ? stripDiceSeed(state.dice) : undefined,
    phaseStartedAt: state.phaseStartedAt,
    phaseEndsAt: state.phaseEndsAt,
    leaderboard: state.leaderboard,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    version: state.version,
  };
}

// Extended player type for server with additional fields
export interface ServerPlayer {
  playerId: PlayerId;
  displayName: string;
  avatarId: AvatarId;
  position: number; // 1-100, 0 = not on board yet (lobby)
  score: number;
  status: PlayerStatus;
  joinedAt: string; // ISO 8601
  answeredAt?: string; // ISO 8601, when answered current question
  answerTimeMs?: number; // ms from question start
  lastRoll?: number; // last dice value
  finishOrder?: number; // 1, 2, 3... when finished
  finishBonus?: number; // bonus points for finish order
  sessionId?: string; // for session tracking
  isConnected: boolean;
}

// Server-side dice result (includes secure RNG seed)
export interface ServerDiceResult {
  value: 1 | 2 | 3 | 4 | 5 | 6;
  animationSeed: string; // deterministic seed for client animation
  rolledAt: string; // ISO 8601
  rolledBy: PlayerId;
  rngSeed: string; // server-side only, for verification
}

// ============================================================================
// Command Model (Client -> Server)
// ============================================================================

export type ServerGameCommand =
  | JoinGameCommand
  | RejoinGameCommand
  | SubmitAnswerCommand
  | RollDiceCommand
  | RandomizeAvatarCommand
  | ChangeAvatarCommand
  | StartGameCommand
  | NextQuestionCommand
  | SkipQuestionCommand
  | LeaveGameCommand;

export interface JoinGameCommand {
  type: 'JOIN_GAME';
  gamePin: string; // raw pin, will be validated
  displayName: string;
  preferredAvatarId?: string;
  sessionId: string; // client-generated session ID
}

export interface RejoinGameCommand {
  type: 'REJOIN_GAME';
  gamePin: string;
  playerId: string;
  sessionId: string;
}

export interface SubmitAnswerCommand {
  type: 'SUBMIT_ANSWER';
  questionId: string;
  choiceIndex: number; // 0-3
  clientTimestamp: number; // client's Date.now()
  playerId: string;
  sessionId: string;
}

export interface RollDiceCommand {
  type: 'ROLL_DICE';
  playerId: string;
  sessionId: string;
}

export interface RandomizeAvatarCommand {
  type: 'RANDOMIZE_AVATAR';
  playerId: string;
  sessionId: string;
}

export interface ChangeAvatarCommand {
  type: 'CHANGE_AVATAR';
  playerId: string;
  newAvatarId: string;
  mode: 'random' | 'pick';
  sessionId: string;
}

export interface StartGameCommand {
  type: 'START_GAME';
  gamePin: string;
  teacherId: string;
  sessionId: string;
}

export interface NextQuestionCommand {
  type: 'NEXT_QUESTION';
  gamePin: string;
  teacherId: string;
  sessionId: string;
}

export interface SkipQuestionCommand {
  type: 'SKIP_QUESTION';
  gamePin: string;
  teacherId: string;
  sessionId: string;
}

export interface LeaveGameCommand {
  type: 'LEAVE_GAME';
  playerId: string;
  sessionId: string;
}

// ============================================================================
// Server Events (Server -> Clients)
// ============================================================================

export type ServerGameEvent =
  | GameStateUpdatedEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | QuestionStartedEvent
  | AnswerEvaluatedEvent
  | RollQueueUpdatedEvent
  | DiceRolledEvent
  | PlayerMovingEvent
  | PlayerMovedEvent
  | PhaseChangedEvent
  | GameFinishedEvent
  | PlayerAvatarChangedEvent
  | ErrorEvent;

export interface GameStateUpdatedEvent {
  type: 'GAME_STATE_UPDATED';
  gameState: PublicGameState; // PublicGameState - NO correctAnswer, no rngSeed, no teacherId
  timestamp: string;
}

export interface PlayerJoinedEvent {
  type: 'PLAYER_JOINED';
  player: PlayerSnapshot;
  playerCount: number;
  timestamp: string;
}

export interface PlayerLeftEvent {
  type: 'PLAYER_LEFT';
  playerId: string;
  playerCount: number;
  timestamp: string;
}

export interface QuestionStartedEvent {
  type: 'QUESTION_STARTED';
  question: PublicQuestion; // PublicQuestion - NO correctAnswer!
  round: number;
  countdownSeconds: number;
  questionStartTime: string;
  timestamp: string;
}

export interface AnswerEvaluatedEvent {
  type: 'ANSWER_EVALUATED';
  playerId: string;
  correct: boolean;
  answerTimeMs: number;
  earnedRoll: boolean;
  queuePosition?: number;
  timestamp: string;
}

export interface RollQueueUpdatedEvent {
  type: 'ROLL_QUEUE_UPDATED';
  rollQueue: string[];
  currentPlayerId?: string;
  timestamp: string;
}

export interface DiceRolledEvent {
  type: 'DICE_ROLLED';
  dice: {
    value: number;
    animationSeed: string;
  };
  playerId: string;
  timestamp: string;
}

export interface PlayerMovingEvent {
  type: 'PLAYER_MOVING';
  playerId: string;
  fromPosition: number;
  toPosition: number;
  path: number[];
  diceValue: number;
  bounced: boolean;
  timestamp: string;
}

export interface PlayerMovedEvent {
  type: 'PLAYER_MOVED';
  playerId: string;
  finalPosition: number;
  score: number;
  finished: boolean;
  finishOrder?: number;
  finishBonus?: number;
  timestamp: string;
}

export interface PhaseChangedEvent {
  type: 'PHASE_CHANGED';
  fromStatus: string;
  toStatus: string;
  timestamp: string;
}

export interface GameFinishedEvent {
  type: 'GAME_FINISHED';
  leaderboard: PlayerSnapshot[];
  timestamp: string;
}

export interface PlayerAvatarChangedEvent {
  type: 'PLAYER_AVATAR_CHANGED';
  playerId: string;
  newAvatarId: string;
  timestamp: string;
}

export interface ErrorEvent {
  type: 'ERROR';
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

// ============================================================================
// Command Results
// ============================================================================

export interface CommandResult<T = void> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface JoinGameResult {
  playerId: string;
  gameState: PublicGameState; // PublicGameState - NO correctAnswer, no rngSeed, no teacherId
}

export interface RejoinGameResult {
  playerId: string;
  gameState: PublicGameState; // PublicGameState - NO correctAnswer, no rngSeed, no teacherId
}