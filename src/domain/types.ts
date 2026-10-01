/**
 * Domain Types — Core vocabulary for Knowledge Snake
 * Shared between Client, Server Game Logic, and Transport layer
 * Source of truth for all type definitions
 */

// ============================================================================
// Primitive Branded Types (Type Safety)
// ============================================================================

type Brand<T, B> = T & { __brand: B };

export type GamePin = Brand<string, 'GamePin'>;
export type PlayerId = Brand<string, 'PlayerId'>;
export type QuestionId = Brand<string, 'QuestionId'>;
export type GameId = Brand<string, 'GameId'>;
export type TeacherId = Brand<string, 'TeacherId'>;
export type AvatarId = Brand<string, 'AvatarId'>;
export type SessionId = Brand<string, 'SessionId'>;

export function createGamePin(pin: string): GamePin {
  if (!/^[A-Z0-9]{6}$/i.test(pin)) {
    throw new Error(`Invalid Game PIN format: ${pin}`);
  }
  return pin.toUpperCase() as GamePin;
}

export function createPlayerId(id: string): PlayerId {
  return id as PlayerId;
}

export function createQuestionId(id: string): QuestionId {
  return id as QuestionId;
}

export function createGameId(id: string): GameId {
  return id as GameId;
}

export function createTeacherId(id: string): TeacherId {
  return id as TeacherId;
}

export function createAvatarId(id: string): AvatarId {
  return id as AvatarId;
}

export function createSessionId(id: string): SessionId {
  return id as SessionId;
}

// ============================================================================
// Core Domain Enums
// ============================================================================

export const GameStatus = {
  LOBBY: 'lobby',
  QUESTION: 'question',
  ROLLING: 'rolling',
  MOVING: 'moving',
  ROUND_COMPLETE: 'round_complete',
  FINISHED: 'finished',
} as const;

export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

export const PlayerStatus = {
  WAITING: 'waiting',
  ANSWERING: 'answering',
  ANSWERED: 'answered',
  ROLLING: 'rolling',
  MOVING: 'moving',
  FINISHED: 'finished',
  DISCONNECTED: 'disconnected',
} as const;

export type PlayerStatus = (typeof PlayerStatus)[keyof typeof PlayerStatus];

export const ChoiceIndex = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
} as const;

export type ChoiceIndex = (typeof ChoiceIndex)[keyof typeof ChoiceIndex];

// ============================================================================
// Question Types (Security: PublicQuestion vs ServerQuestion)
// ============================================================================

export interface PublicQuestion {
  questionId: QuestionId;
  question: string;
  choices: readonly [string, string, string, string];
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  // NO correctAnswer - never sent to clients during question phase
}

export interface ServerQuestion extends PublicQuestion {
  correctAnswer: ChoiceIndex;
  explanation?: string;
}

export interface QuestionSet {
  setId: string;
  title: string;
  description?: string;
  questions: ServerQuestion[];
  createdAt: string; // ISO 8601
  updatedAt: string;
  teacherId: TeacherId;
}

// ============================================================================
// Player Types
// ============================================================================

export interface Player {
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
}

export interface PlayerSnapshot {
  playerId: PlayerId;
  displayName: string;
  avatarId: AvatarId;
  position: number;
  score: number;
  status: PlayerStatus;
  finishOrder?: number;
  finishBonus?: number;
}

// ============================================================================
// Dice Types
// ============================================================================

export interface DiceResult {
  value: 1 | 2 | 3 | 4 | 5 | 6;
  animationSeed: string; // deterministic seed for client animation
  rolledAt: string; // ISO 8601
  rolledBy: PlayerId;
}

// ============================================================================
// Game State (Authoritative - Single Source of Truth)
// ============================================================================

export interface GameBoardConfig {
  snakes: ReadonlyArray<{ from: number; to: number }>;
  ladders: ReadonlyArray<{ from: number; to: number }>;
  specialCells: ReadonlyArray<{ cell: number; type: string; label: string }>;
  totalCells: number;
}

export interface GameState {
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
  currentQuestion?: PublicQuestion; // only during QUESTION phase
  questionStartTime?: string; // ISO 8601, when question phase started

  // Players
  players: ReadonlyArray<Player>;
  currentPlayerId?: PlayerId; // player whose turn to roll (during ROLLING)
  rollQueue: ReadonlyArray<PlayerId>; // ordered by answer speed

  // Dice
  dice?: DiceResult; // current/last dice result

  // Phase Timing
  phaseStartedAt: string; // ISO 8601
  phaseEndsAt?: string; // ISO 8601 (for countdown)

  // Leaderboard (computed)
  leaderboard: ReadonlyArray<PlayerSnapshot>;

  // Metadata
  createdAt: string;
  updatedAt: string;
  version: number; // incremented on each state change (optimistic locking)
}

// ============================================================================
// Game Commands (Client -> Server Game Logic)
// ============================================================================

export type GameCommand =
  | JoinGameCommand
  | RejoinGameCommand
  | AnswerCommand
  | RollDiceCommand
  | ChangeAvatarCommand
  | TeacherStartGameCommand
  | TeacherNextRoundCommand
  | TeacherEndGameCommand
  | TeacherKickPlayerCommand;

export interface JoinGameCommand {
  type: 'JOIN_GAME';
  gamePin: GamePin;
  displayName: string;
  preferredAvatarId?: AvatarId;
}

export interface RejoinGameCommand {
  type: 'REJOIN_GAME';
  gamePin: GamePin;
  playerId: PlayerId;
}

export interface AnswerCommand {
  type: 'ANSWER';
  questionId: QuestionId;
  choiceIndex: ChoiceIndex;
  clientTimestamp: number; // client's Date.now() for timing reference
}

export interface RollDiceCommand {
  type: 'ROLL_DICE';
  playerId: PlayerId;
}

export interface ChangeAvatarCommand {
  type: 'CHANGE_AVATAR';
  playerId: PlayerId;
  newAvatarId: AvatarId;
  mode: 'random' | 'pick';
}

export interface TeacherStartGameCommand {
  type: 'TEACHER_START_GAME';
  gamePin: GamePin;
  teacherId: TeacherId;
}

export interface TeacherNextRoundCommand {
  type: 'TEACHER_NEXT_ROUND';
  gamePin: GamePin;
  teacherId: TeacherId;
}

export interface TeacherEndGameCommand {
  type: 'TEACHER_END_GAME';
  gamePin: GamePin;
  teacherId: TeacherId;
}

export interface TeacherKickPlayerCommand {
  type: 'TEACHER_KICK_PLAYER';
  gamePin: GamePin;
  teacherId: TeacherId;
  targetPlayerId: PlayerId;
}

// ============================================================================
// Game Events (Server Game Logic -> Clients via Supabase Realtime)
// ============================================================================

export type GameEvent =
  | GameStateUpdatedEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | QuestionStartedEvent
  | AnswerResultEvent
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
  gameState: GameState;
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
  playerId: PlayerId;
  playerCount: number;
  timestamp: string;
}

export interface QuestionStartedEvent {
  type: 'QUESTION_STARTED';
  question: PublicQuestion;
  round: number;
  countdownSeconds: number;
  questionStartTime: string;
  timestamp: string;
}

export interface AnswerResultEvent {
  type: 'ANSWER_RESULT';
  playerId: PlayerId;
  correct: boolean;
  answerTimeMs: number;
  earnedRoll: boolean;
  queuePosition?: number;
  timestamp: string;
}

export interface RollQueueUpdatedEvent {
  type: 'ROLL_QUEUE_UPDATED';
  rollQueue: ReadonlyArray<PlayerId>;
  currentPlayerId?: PlayerId;
  timestamp: string;
}

export interface DiceRolledEvent {
  type: 'DICE_ROLLED';
  dice: DiceResult;
  playerId: PlayerId;
  timestamp: string;
}

export interface PlayerMovingEvent {
  type: 'PLAYER_MOVING';
  playerId: PlayerId;
  fromPosition: number;
  toPosition: number;
  path: ReadonlyArray<number>;
  diceValue: number;
  bounced: boolean;
  timestamp: string;
}

export interface PlayerMovedEvent {
  type: 'PLAYER_MOVED';
  playerId: PlayerId;
  finalPosition: number;
  score: number;
  finished: boolean;
  finishOrder?: number;
  finishBonus?: number;
  timestamp: string;
}

export interface PhaseChangedEvent {
  type: 'PHASE_CHANGED';
  fromStatus: GameStatus;
  toStatus: GameStatus;
  timestamp: string;
}

export interface GameFinishedEvent {
  type: 'GAME_FINISHED';
  leaderboard: ReadonlyArray<PlayerSnapshot>;
  timestamp: string;
}

export interface PlayerAvatarChangedEvent {
  type: 'PLAYER_AVATAR_CHANGED';
  playerId: PlayerId;
  newAvatarId: AvatarId;
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
// Command Results (Server Game Logic -> Command Sender)
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
  playerId: PlayerId;
  gameState: GameState;
}

export interface RejoinGameResult {
  playerId: PlayerId;
  gameState: GameState;
}

export interface AnswerResult {
  correct: boolean;
  answerTimeMs: number;
  earnedRoll: boolean;
  queuePosition?: number;
}

// ============================================================================
// Transport Types (Abstraction for GameStateTransport)
// ============================================================================

export interface TransportState {
  connected: boolean;
  gamePin?: GamePin;
  playerId?: PlayerId;
}

export interface GameStateTransport {
  // Connection
  connect(gamePin: GamePin, playerId?: PlayerId): Promise<void>;
  disconnect(): Promise<void>;

  // State Subscription
  subscribe(onStateUpdate: (state: GameState) => void): () => void;
  subscribeToEvents(onEvent: (event: GameEvent) => void): () => void;

  // Commands
  sendCommand(command: GameCommand): Promise<CommandResult>;

  // Current State
  getState(): TransportState;
  getCurrentGameState(): GameState | null;
}

export type TransportType = 'mock' | 'dev-server' | 'production';

export interface TransportConfig {
  type: TransportType;
  // Mock config
  mockGameState?: GameState;
  // Dev server config
  devServerUrl?: string;
  // Production config
  productionApiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}