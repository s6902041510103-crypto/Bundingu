/**
 * Knowledge Snake — Core domain types
 * -----------------------------------
 * Shared between Client UI, Transport layer, and Server Game Engine.
 */

export type GameStatus =
  | "lobby"
  | "question"
  | "answering"
  | "reveal"
  | "dice"
  | "moving"
  | "special_event"
  | "finished";

export type PlayerAnswerState = "idle" | "selected" | "correct" | "wrong";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type AvatarId =
  | "fox"
  | "panda"
  | "tiger"
  | "frog"
  | "cat"
  | "bear"
  | "rabbit"
  | "penguin"
  | "lion"
  | "koala"
  | "monkey"
  | "dog";

export interface Avatar {
  id: AvatarId;
  emoji: string;
  label: string;
  labelTh: string;
  primary: string;
  secondary: string;
  accent: string;
  /** ring color used for the player token */
  ring: string;
}

export interface Player {
  id: string;
  name: string;
  avatarId: AvatarId;
  position: number;
  score: number;
  isReady: boolean;
  isHost: boolean;
  isBot: boolean;
  answerState: PlayerAnswerState;
  selectedOptionId: string | null;
  answeredAt?: number | null;
  lastRoll: number | null;
  finishRank: number | null;
  /** Real gameplay telemetry for accurate reports */
  correctCount?: number;
  answeredCount?: number;
  laddersClimbed?: number;
  snakesBitten?: number;
  specialEventsTriggered?: number;
  connected?: boolean;
  bonusNextTurn?: boolean;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  prompt: string;
  hint?: string;
  options: QuestionOption[];
  /** Present on server and after reveal; omitted in public state before reveal */
  correctOptionId: string;
  explanation: string;
  subject: string;
  difficulty?: QuestionDifficulty;
  createdAt?: number;
}

export interface ActiveQuestion extends Question {
  number: number;
  total: number;
  timeLimit: number;
  timeLeft: number;
  revealed: boolean;
  startedAt?: number;
}

export interface SnakeLink {
  from: number;
  to: number;
}

export interface LadderLink {
  from: number;
  to: number;
}

export type SpecialCellKind = "start" | "finish" | "star" | "gift" | "boost";

export interface SpecialCell {
  at: number;
  kind: SpecialCellKind;
  label: string;
  emoji: string;
  description: string;
}

export interface BoardCell {
  number: number;
  row: number;
  col: number;
  /** percentage position of the cell centre inside the board */
  x: number;
  y: number;
  tone: "light" | "dark" | "start" | "finish" | "special";
  special: SpecialCell | null;
  snake: SnakeLink | null;
  ladder: LadderLink | null;
}

export interface BoardConfig {
  size: number;
  total: number;
  finishAt: number;
}

export interface DiceState {
  value: number | null;
  rolling: boolean;
  rolledBy: string | null;
  lastReason: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  avatarId: AvatarId;
  position: number;
  score: number;
  isFinished: boolean;
  laddersClimbed?: number;
  snakesBitten?: number;
  correctCount?: number;
  answeredCount?: number;
  accuracyPercent?: number | null;
}

export interface GameSettings {
  maxPlayers: number;
  questionTimeLimit: number;
  diceMin: number;
  diceMax: number;
  finishBonuses: number[];
  scoreRule: string;
}

export interface GameInfo {
  id: string;
  pin: string;
  title: string;
  subject: string;
  grade: string;
  hostName: string;
  school: string;
  createdAt?: number;
}

export interface SpecialEventState {
  id: string;
  playerId: string;
  playerName: string;
  avatarId: AvatarId;
  kind: "snake" | "ladder" | "star" | "gift" | "boost";
  from: number;
  to: number;
  title: string;
  description: string;
  resolved: boolean;
  bonusRollGranted?: boolean;
}

export interface MovementState {
  playerId: string;
  kind: "walk" | "snake" | "ladder" | "finish" | "special";
  from: number;
  to: number;
  step: number;
  path: number[];
}

/**
 * The single source of truth of the game room.
 * In public state (sent to clients), secret server fields (teacherId, rngSeed, unrevealed correctOptionId) are stripped.
 */
export interface GameState {
  game: GameInfo;
  gameStatus: GameStatus;
  round: number;
  totalRounds: number;
  question: ActiveQuestion | null;
  players: Player[];
  currentPlayerId: string | null;
  dice: DiceState;
  board: BoardConfig;
  specialCells: SpecialCell[];
  enabledSpecials: Set<string> | string[];
  settings: GameSettings;
  leaderboard: LeaderboardEntry[];
  viewerPlayerId: string | null;
  /** player currently animating on the board */
  movingPlayerId: string | null;
  movement: MovementState | null;
  activeSpecialEvent?: SpecialEventState | null;
  rollQueue: string[];
  pacingMode: "auto" | "manual";
  lastEvent: string | null;
  updatedAt: number;
}

/**
 * GameAction represents all possible actions that can be dispatched to the game store.
 */
export type GameAction =
  | { type: "PLAYER_JOINED"; player: Player }
  | { type: "PLAYER_READY"; playerId: string; ready: boolean }
  | { type: "GAME_STARTED" }
  | { type: "QUESTION_STARTED"; questionIndex: number }
  | { type: "TIMER_TICK" }
  | { type: "ANSWER_SELECTED"; playerId: string; optionId: string }
  | { type: "ANSWERS_REVEALED" }
  | { type: "DICE_ROLL_STARTED"; playerId: string }
  | { type: "DICE_ROLLED"; playerId: string; value: number }
  | { type: "MOVEMENT_STARTED"; playerId: string; steps: number }
  | { type: "MOVEMENT_STEP" }
  | { type: "MOVEMENT_FINISHED" }
  | {
      type: "BOARD_EFFECT_TRIGGERED";
      effect: {
        kind: "snake" | "ladder" | "special";
        from: number;
        to: number;
        label: string;
      } | null;
    }
  | { type: "RESOLVE_SPECIAL_EVENT" }
  | { type: "NEXT_TURN" }
  | { type: "GAME_FINISHED" }
  | { type: "EVENT_LOGGED"; message: string }
  | { type: "STATE_REPLACED"; state: GameState }
  | { type: "TOGGLE_SPECIAL"; kind: string; enabled: boolean }
  | { type: "SET_TOTAL_ROUNDS"; total: number }
  | { type: "SET_PACING_MODE"; mode: "auto" | "manual" }
  | { type: "SET_ROLL_QUEUE"; queue: string[] };

/**
 * Server commands sent from Client UI to Server Game Engine
 */
export type ServerGameCommand =
  | { type: "JOIN_GAME"; nickname: string; avatarId: AvatarId; playerId?: string }
  | { type: "PLAYER_READY"; playerId: string; ready: boolean }
  | { type: "START_GAME" }
  | { type: "START_QUESTION"; questionIndex?: number }
  | { type: "TIMER_TICK" }
  | { type: "SUBMIT_ANSWER"; playerId: string; optionId: string }
  | { type: "REVEAL_ANSWERS" }
  | { type: "ROLL_DICE"; playerId: string }
  | { type: "RESOLVE_SPECIAL_EVENT"; playerId?: string }
  | { type: "ADVANCE_TURN" }
  | { type: "END_GAME" }
  | { type: "SET_PACING_MODE"; mode: "auto" | "manual" };

export interface PlayerReportRow {
  rank: number;
  playerId: string;
  name: string;
  avatarId: AvatarId;
  score: number;
  position: number;
  isFinished: boolean;
  finishRank: number | null;
  finishBonus: number;
  laddersClimbed: number;
  snakesBitten: number;
  correctCount: number;
  answeredCount: number;
  /** Null when answeredCount === 0 so fake statistics are never fabricated */
  accuracyPercent: number | null;
}

export interface GameHistoryRecord {
  id: string;
  pin: string;
  title: string;
  subject: string;
  grade: string;
  hostName: string;
  createdAt: number;
  finishedAt: number | null;
  status: "lobby" | "playing" | "completed";
  totalRounds: number;
  roundsPlayed: number;
  questionTimeLimit: number;
  playersCount: number;
  maxPlayers: number;
  winnerName: string | null;
  winnerAvatarId: AvatarId | null;
  winnerScore: number | null;
  playerResults: PlayerReportRow[];
}
