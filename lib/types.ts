/**
 * Knowledge Snake — Core domain types
 * -----------------------------------
 * Phase 1 (mock)  : types are pure data, UI-only.
 * Phase 2 (realtime): the exact same shapes become the payload of the
 * realtime channel, so components never need to be rewritten.
 */

export type GameStatus =
  | "lobby"
  | "question"
  | "answering"
  | "reveal"
  | "dice"
  | "moving"
  | "finished";

export type PlayerAnswerState = "idle" | "selected" | "correct" | "wrong";

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
  /** tailwind ring color used for the player token */
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
  lastRoll: number | null;
  finishRank: number | null;
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
  correctOptionId: string;
  explanation: string;
  subject: string;
}

export interface ActiveQuestion extends Question {
  number: number;
  total: number;
  timeLimit: number;
  timeLeft: number;
  revealed: boolean;
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
}

/**
 * The single source of truth of the game room.
 * Every component reads from this object — never from scattered mock data.
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
  enabledSpecials: Set<string>;
  settings: GameSettings;
  leaderboard: LeaderboardEntry[];
  viewerPlayerId: string | null;
  /** player currently animating on the board */
  movingPlayerId: string | null;
  movement: MovementState | null;
  rollQueue: string[];
  pacingMode: "auto" | "manual";
  lastEvent: string | null;
  updatedAt: number;
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
 * GameAction represents all possible actions that can be dispatched to the game store.
 * In Phase 2, these become the message types sent over the realtime channel.
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
  | { type: "BOARD_EFFECT_TRIGGERED"; effect: { kind: "snake" | "ladder" | "special"; from: number; to: number; label: string } | null }
  | { type: "NEXT_TURN" }
  | { type: "GAME_FINISHED" }
  | { type: "EVENT_LOGGED"; message: string }
  | { type: "STATE_REPLACED"; state: GameState }
  | { type: "TOGGLE_SPECIAL"; kind: string; enabled: boolean }
  | { type: "SET_TOTAL_ROUNDS"; total: number }
  | { type: "SET_PACING_MODE"; mode: "auto" | "manual" }
  | { type: "SET_ROLL_QUEUE"; queue: string[] };
