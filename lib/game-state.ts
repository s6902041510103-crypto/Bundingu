import { FINISH_AT, walkPath } from "./board";
import {
  BOARD_CONFIG,
  GAME_SETTINGS,
  LADDERS,
  MOCK_GAME,
  MOCK_PLAYERS,
  QUESTIONS,
  SNAKES,
  SPECIAL_CELLS,
  VIEWER_PLAYER_ID,
} from "./game-data";
import type {
  ActiveQuestion,
  GameState,
  LeaderboardEntry,
  Player,
  Question,
  SnakeLink,
  LadderLink,
  SpecialCell,
} from "./types";

/* ------------------------------------------------------------------ *
 * Leaderboard
 * ------------------------------------------------------------------ */

export function computeLeaderboard(players: Player[]): LeaderboardEntry[] {
  const sorted = [...players].sort((a, b) => {
    if (a.finishRank && b.finishRank) return a.finishRank - b.finishRank;
    if (a.finishRank) return -1;
    if (b.finishRank) return 1;
    return b.position - a.position;
  });

  return sorted.map((player, index) => ({
    rank: index + 1,
    playerId: player.id,
    name: player.name,
    avatarId: player.avatarId,
    position: player.position,
    score: player.score,
    isFinished: Boolean(player.finishRank),
  }));
}

/* ------------------------------------------------------------------ *
 * Question helpers
 * ------------------------------------------------------------------ */

function toActiveQuestion(question: Question, number: number, total: number): ActiveQuestion {
  return {
    ...question,
    number,
    total,
    timeLimit: GAME_SETTINGS.questionTimeLimit,
    timeLeft: GAME_SETTINGS.questionTimeLimit,
    revealed: false,
  };
}

export function resetQuestionStates(players: Player[]): Player[] {
  return players.map((player) => ({
    ...player,
    answerState: "idle",
    selectedOptionId: null,
  }));
}

/* ------------------------------------------------------------------ *
 * Board effects resolution
 * ------------------------------------------------------------------ */

function resolveBoardEffect(
  position: number,
  snakes: SnakeLink[],
  ladders: LadderLink[],
  specialCells: SpecialCell[],
  enabledSpecials: Set<string>,
): { kind: "snake" | "ladder" | "special"; from: number; to: number; label: string } | null {
  const snake = snakes.find((s) => s.from === position);
  if (snake) return { kind: "snake", from: snake.from, to: snake.to, label: `🐍 ${snake.from} → ${snake.to}` };

  const ladder = ladders.find((l) => l.from === position);
  if (ladder) return { kind: "ladder", from: ladder.from, to: ladder.to, label: `🪜 ${ladder.from} → ${ladder.to}` };

  const special = specialCells.find((s) => s.at === position && enabledSpecials.has(s.kind));
  if (special) return { kind: "special", from: position, to: position, label: `${special.emoji} ${special.label}` };

  return null;
}

/* ------------------------------------------------------------------ *
 * Initial state factory
 * ------------------------------------------------------------------ */

export function createInitialGameState(overrides: Partial<GameState> = {}): GameState {
  const players = MOCK_PLAYERS.map((p) => ({ ...p }));
  const enabledSpecials = new Set<string>();
  return {
    game: MOCK_GAME,
    gameStatus: "lobby",
    round: 0,
    totalRounds: QUESTIONS.length,
    question: null,
    players,
    currentPlayerId: null,
    dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
    board: BOARD_CONFIG,
    specialCells: SPECIAL_CELLS,
    enabledSpecials,
    settings: GAME_SETTINGS,
    leaderboard: computeLeaderboard(players),
    viewerPlayerId: VIEWER_PLAYER_ID,
    movingPlayerId: null,
    movement: null,
    rollQueue: [],
    pacingMode: "auto",
    lastEvent: "SYSTEM · สร้างห้องเกมแล้ว",
    updatedAt: Date.now(),
    ...overrides,
  };
}

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

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
  | { type: "BOARD_EFFECT_TRIGGERED"; effect: ReturnType<typeof resolveBoardEffect> }
  | { type: "NEXT_TURN" }
  | { type: "GAME_FINISHED" }
  | { type: "EVENT_LOGGED"; message: string }
  | { type: "STATE_REPLACED"; state: GameState }
  | { type: "TOGGLE_SPECIAL"; kind: string; enabled: boolean }
  | { type: "SET_TOTAL_ROUNDS"; total: number }
  | { type: "SET_PACING_MODE"; mode: "auto" | "manual" }
  | { type: "SET_ROLL_QUEUE"; queue: string[] };

const withLeaderboard = (state: GameState, players: Player[]): GameState => ({
  ...state,
  players,
  leaderboard: computeLeaderboard(players),
});

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "PLAYER_JOINED": {
      const players = [...state.players, action.player];
      return withLeaderboard(
        { ...state, lastEvent: `SYSTEM · ${action.player.name} เข้าร่วมห้อง`, updatedAt: Date.now() },
        players,
      );
    }

    case "PLAYER_READY": {
      return withLeaderboard(
        { ...state, updatedAt: Date.now() },
        state.players.map((p) => (p.id === action.playerId ? { ...p, isReady: action.ready } : p)),
      );
    }

    case "GAME_STARTED": {
      const firstQuestion = QUESTIONS[0];
      return {
        ...state,
        gameStatus: "question",
        round: 1,
        totalRounds: state.totalRounds,
        question: toActiveQuestion(firstQuestion, 1, state.totalRounds),
        players: resetQuestionStates(state.players),
        currentPlayerId: state.players.find((p) => !p.isBot)?.id ?? state.players[0]?.id ?? null,
        dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
        rollQueue: [],
        pacingMode: "auto",
        lastEvent: "HOST · เริ่มเกมแล้ว",
        updatedAt: Date.now(),
      };
    }

    case "QUESTION_STARTED": {
      const question = QUESTIONS[action.questionIndex % QUESTIONS.length];
      const nextRound = state.round + 1;
      return {
        ...state,
        gameStatus: "question",
        round: nextRound > state.totalRounds ? state.totalRounds : nextRound,
        question: toActiveQuestion(question, nextRound, state.totalRounds),
        players: resetQuestionStates(state.players),
        dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
        rollQueue: [],
        movingPlayerId: null,
        movement: null,
        lastEvent: `SYSTEM · รอบ ${nextRound} — ${question.prompt.slice(0, 30)}…`,
        updatedAt: Date.now(),
      };
    }

    case "TIMER_TICK": {
      if (!state.question || state.question.revealed) return state;
      const timeLeft = Math.max(0, state.question.timeLeft - 1);
      if (timeLeft === 0) {
        // Auto-reveal when timer hits 0
        return {
          ...state,
          gameStatus: "reveal",
          question: { ...state.question, timeLeft: 0, revealed: true },
          lastEvent: "SYSTEM · หมดเวลา — เฉลยคำตอบ",
          updatedAt: Date.now(),
        };
      }
      return { ...state, question: { ...state.question, timeLeft }, updatedAt: Date.now() };
    }

    case "ANSWER_SELECTED": {
      if (!state.question) return state;
      const players = state.players.map((p) =>
        p.id === action.playerId
          ? {
              ...p,
              selectedOptionId: action.optionId,
              answerState: action.optionId === state.question!.correctOptionId
                ? ("correct" as const)
                : ("wrong" as const),
            }
          : p,
      );
      return withLeaderboard({ ...state, gameStatus: "answering", updatedAt: Date.now() }, players);
    }

    case "ANSWERS_REVEALED": {
      if (!state.question) return state;
      const correctPlayers = state.players
        .filter((p) => p.answerState === "correct")
        .sort((a, b) => (a.selectedOptionId === state.question!.correctOptionId ? -1 : 1));
      return {
        ...state,
        gameStatus: "reveal",
        question: { ...state.question, revealed: true },
        rollQueue: correctPlayers.map((p) => p.id),
        lastEvent: `SYSTEM · เฉลยแล้ว — ${correctPlayers.length} คนตอบถูก รอทอยลูกเต๋า`,
        updatedAt: Date.now(),
      };
    }

    case "DICE_ROLL_STARTED":
      return {
        ...state,
        gameStatus: "dice",
        dice: { ...state.dice, rolling: true, rolledBy: action.playerId },
        currentPlayerId: action.playerId,
        lastEvent: `${state.players.find((p) => p.id === action.playerId)?.name} · กำลังทอยลูกเต๋า`,
        updatedAt: Date.now(),
      };

    case "DICE_ROLLED": {
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player) return state;
      return {
        ...state,
        dice: { value: action.value, rolling: false, rolledBy: action.playerId, lastReason: "คะแนนจากลูกเต๋า" },
        players: state.players.map((p) => (p.id === action.playerId ? { ...p, lastRoll: action.value } : p)),
        updatedAt: Date.now(),
      };
    }

    case "MOVEMENT_STARTED": {
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player) return state;
      const path = walkPath(player.position, action.steps, FINISH_AT);
      const finalPos = path.length ? path[path.length - 1] : player.position;
      const bounced = finalPos > FINISH_AT ? FINISH_AT - (finalPos - FINISH_AT) : finalPos;
      const actualPath = bounced !== finalPos ? [...path.slice(0, -1), bounced] : path;
      return {
        ...state,
        gameStatus: "moving",
        movingPlayerId: action.playerId,
        movement: {
          playerId: action.playerId,
          kind: "walk",
          from: player.position,
          to: actualPath.length ? actualPath[actualPath.length - 1] : player.position,
          step: 0,
          path: actualPath,
        },
        lastEvent: `${player.name} · เดิน ${actualPath.length} ช่อง`,
        updatedAt: Date.now(),
      };
    }

    case "MOVEMENT_STEP": {
      if (!state.movement) return state;
      const { path, step, playerId } = state.movement;
      if (step + 1 >= path.length) return state;
      const nextStep = step + 1;
      const position = path[nextStep];
      return {
        ...state,
        movement: { ...state.movement, step: nextStep },
        players: state.players.map((p) => (p.id === playerId ? { ...p, position } : p)),
        updatedAt: Date.now(),
      };
    }

    case "MOVEMENT_FINISHED": {
      if (!state.movement) return state;
      const player = state.players.find((p) => p.id === state.movement!.playerId);
      if (!player) return { ...state, movement: null, movingPlayerId: null, updatedAt: Date.now() };

      const effect = resolveBoardEffect(
        player.position,
        SNAKES,
        LADDERS,
        SPECIAL_CELLS,
        state.enabledSpecials,
      );

      if (effect) {
        // Trigger board effect (snake/ladder/special)
        return {
          ...state,
          movement: { ...state.movement, kind: effect.kind },
          lastEvent: `${player.name} · ${effect.label}`,
          updatedAt: Date.now(),
        };
      }

      // Check finish
      if (player.position >= FINISH_AT) {
        const finishedCount = state.players.filter((p) => p.finishRank).length + 1;
        const bonus = GAME_SETTINGS.finishBonuses[finishedCount - 1] ?? 0;
        return {
          ...state,
          movement: null,
          movingPlayerId: null,
          players: state.players.map((p) =>
            p.id === player.id
              ? { ...p, position: FINISH_AT, finishRank: finishedCount, score: p.position + bonus }
              : p,
          ),
          rollQueue: state.rollQueue.filter((id) => id !== player.id),
          gameStatus: state.rollQueue.length > 1 ? "dice" : "reveal",
          lastEvent: `${player.name} · 🏁 เข้าชัยอันดับ ${finishedCount}!`,
          updatedAt: Date.now(),
        };
      }

      // Normal end of movement
      return {
        ...state,
        movement: null,
        movingPlayerId: null,
        rollQueue: state.rollQueue.filter((id) => id !== player.id),
        gameStatus: state.rollQueue.length > 1 ? "dice" : "reveal",
        updatedAt: Date.now(),
      };
    }

    case "BOARD_EFFECT_TRIGGERED": {
      if (!state.movement || !action.effect) return state;
      const { kind, from, to, label } = action.effect;
      const player = state.players.find((p) => p.id === state.movement!.playerId);
      if (!player) return { ...state, movement: null, movingPlayerId: null, updatedAt: Date.now() };

      if (kind === "snake" || kind === "ladder") {
        const path = walkPath(from, to - from, FINISH_AT);
        return {
          ...state,
          movement: {
            playerId: player.id,
            kind,
            from,
            to,
            step: 0,
            path,
          },
          lastEvent: `${player.name} · ${label}`,
          updatedAt: Date.now(),
        };
      }

      if (kind === "special") {
        // Special effects are applied after the turn ends
        return {
          ...state,
          lastEvent: `${player.name} · ${label}`,
          updatedAt: Date.now(),
        };
      }

      return state;
    }

    case "NEXT_TURN": {
      const nextPlayerId = state.rollQueue[0] ?? null;
      if (!nextPlayerId) {
        // Round complete
        if (state.round >= state.totalRounds) {
          return { ...state, gameStatus: "finished", lastEvent: "SYSTEM · จบเกม — ขอแสดงผลคะแนน", updatedAt: Date.now() };
        }
        return {
          ...state,
          gameStatus: "question",
          round: state.round + 1,
          question: toActiveQuestion(QUESTIONS[state.round % QUESTIONS.length], state.round + 1, state.totalRounds),
          players: resetQuestionStates(state.players),
          dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
          rollQueue: [],
          currentPlayerId: state.players.find((p) => !p.isBot)?.id ?? state.players[0]?.id ?? null,
          updatedAt: Date.now(),
        };
      }
      return {
        ...state,
        currentPlayerId: nextPlayerId,
        dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
        gameStatus: "dice",
        updatedAt: Date.now(),
      };
    }

    case "GAME_FINISHED":
      return {
        ...state,
        gameStatus: "finished",
        lastEvent: "SYSTEM · จบเกม ขอแสดงผลคะแนน",
        updatedAt: Date.now(),
      };

    case "EVENT_LOGGED":
      return { ...state, lastEvent: action.message, updatedAt: Date.now() };

    case "STATE_REPLACED":
      return { ...action.state, updatedAt: Date.now() };

    case "TOGGLE_SPECIAL": {
      const newEnabled = new Set(state.enabledSpecials);
      if (action.enabled) newEnabled.add(action.kind);
      else newEnabled.delete(action.kind);
      return { ...state, enabledSpecials: newEnabled, updatedAt: Date.now() };
    }

    case "SET_TOTAL_ROUNDS":
      return { ...state, totalRounds: action.total, updatedAt: Date.now() };

    case "SET_PACING_MODE":
      return { ...state, pacingMode: action.mode, updatedAt: Date.now() };

    case "SET_ROLL_QUEUE":
      return { ...state, rollQueue: action.queue, updatedAt: Date.now() };

    default:
      return state;
  }
}