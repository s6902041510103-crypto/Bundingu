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
  GameAction,
  GameState,
  LadderLink,
  LeaderboardEntry,
  Player,
  Question,
  SnakeLink,
  SpecialCell,
  SpecialEventState,
} from "./types";

export type { GameAction };

/* ------------------------------------------------------------------ *
 * Helpers for Set / Array enabledSpecials
 * ------------------------------------------------------------------ */

export function isSpecialEnabled(
  enabledSpecials: Set<string> | string[] | undefined,
  kind: string,
): boolean {
  if (!enabledSpecials) return false;
  if (enabledSpecials instanceof Set) return enabledSpecials.has(kind);
  if (Array.isArray(enabledSpecials)) return enabledSpecials.includes(kind);
  return false;
}

export function normalizeSpecialsArray(enabledSpecials: Set<string> | string[] | undefined): string[] {
  if (!enabledSpecials) return ["star", "gift", "boost"];
  if (enabledSpecials instanceof Set) return Array.from(enabledSpecials);
  if (Array.isArray(enabledSpecials)) return enabledSpecials;
  return ["star", "gift", "boost"];
}

/* ------------------------------------------------------------------ *
 * Leaderboard
 * ------------------------------------------------------------------ */

export function computeLeaderboard(players: Player[]): LeaderboardEntry[] {
  const sorted = [...players].sort((a, b) => {
    if (a.finishRank && b.finishRank) return a.finishRank - b.finishRank;
    if (a.finishRank) return -1;
    if (b.finishRank) return 1;
    if (b.score !== a.score) return b.score - a.score;
    return b.position - a.position;
  });

  return sorted.map((player, index) => {
    const answered = player.answeredCount ?? 0;
    const correct = player.correctCount ?? 0;
    const accuracyPercent = answered > 0 ? Math.round((correct / answered) * 100) : null;

    return {
      rank: index + 1,
      playerId: player.id,
      name: player.name,
      avatarId: player.avatarId,
      position: player.position,
      score: player.score,
      isFinished: Boolean(player.finishRank),
      laddersClimbed: player.laddersClimbed ?? 0,
      snakesBitten: player.snakesBitten ?? 0,
      correctCount: correct,
      answeredCount: answered,
      accuracyPercent,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Question helpers
 * ------------------------------------------------------------------ */

export function toActiveQuestion(
  question: Question,
  number: number,
  total: number,
  timeLimit: number = GAME_SETTINGS.questionTimeLimit,
): ActiveQuestion {
  return {
    ...question,
    number,
    total,
    timeLimit,
    timeLeft: timeLimit,
    revealed: false,
    startedAt: Date.now(),
  };
}

export function resetQuestionStates(players: Player[]): Player[] {
  return players.map((player) => ({
    ...player,
    answerState: "idle",
    selectedOptionId: null,
    answeredAt: null,
  }));
}

/* ------------------------------------------------------------------ *
 * Board effects resolution
 * ------------------------------------------------------------------ */

export function resolveBoardEffect(
  position: number,
  snakes: SnakeLink[] = SNAKES,
  ladders: LadderLink[] = LADDERS,
  specialCells: SpecialCell[] = SPECIAL_CELLS,
  enabledSpecials: Set<string> | string[] = ["star", "gift", "boost"],
): {
  kind: "snake" | "ladder" | "special";
  specialKind?: "star" | "gift" | "boost";
  from: number;
  to: number;
  label: string;
  description: string;
} | null {
  const snake = snakes.find((s) => s.from === position);
  if (snake) {
    return {
      kind: "snake",
      from: snake.from,
      to: snake.to,
      label: `🐍 ตกหัวเจ้างู! ไหลลง ${snake.from} → ${snake.to}`,
      description: `โดนงูที่ช่อง ${snake.from} ไหลลงไปช่อง ${snake.to}`,
    };
  }

  const ladder = ladders.find((l) => l.from === position);
  if (ladder) {
    return {
      kind: "ladder",
      from: ladder.from,
      to: ladder.to,
      label: `🪜 พบบันไดวิเศษ! ปีนขึ้น ${ladder.from} → ${ladder.to}`,
      description: `ขึ้นบันไดจากช่อง ${ladder.from} ไปยังช่อง ${ladder.to}`,
    };
  }

  const special = specialCells.find(
    (s) =>
      s.at === position &&
      (s.kind === "star" || s.kind === "gift" || s.kind === "boost") &&
      isSpecialEnabled(enabledSpecials, s.kind),
  );
  if (special && (special.kind === "star" || special.kind === "gift" || special.kind === "boost")) {
    const to = special.kind === "gift" ? Math.min(FINISH_AT, position + 3) : position;
    return {
      kind: "special",
      specialKind: special.kind,
      from: position,
      to,
      label: `${special.emoji} ${special.label} (ช่อง ${position})`,
      description: special.description,
    };
  }

  return null;
}

/* ------------------------------------------------------------------ *
 * Initial state factory
 * ------------------------------------------------------------------ */

export function createInitialGameState(overrides: Partial<GameState> = {}): GameState {
  const players = (overrides.players ?? MOCK_PLAYERS).map((p) => ({ ...p }));
  const enabledSpecials = overrides.enabledSpecials ?? new Set<string>(["star", "gift", "boost"]);
  return {
    game: MOCK_GAME,
    gameStatus: "lobby",
    round: 0,
    totalRounds: 5,
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
    activeSpecialEvent: null,
    rollQueue: [],
    pacingMode: "auto",
    lastEvent: "SYSTEM · สร้างห้องเกมสำเร็จ พร้อมรอผู้เล่น",
    updatedAt: Date.now(),
    ...overrides,
  };
}

const withLeaderboard = (state: GameState, players: Player[]): GameState => ({
  ...state,
  players,
  leaderboard: computeLeaderboard(players),
});

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "PLAYER_JOINED": {
      const existingIdx = state.players.findIndex(
        (p) => p.id === action.player.id || p.name.toLowerCase() === action.player.name.toLowerCase(),
      );
      const players =
        existingIdx >= 0
          ? state.players.map((p, idx) => (idx === existingIdx ? { ...p, ...action.player, connected: true } : p))
          : [...state.players, action.player];
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
        question: toActiveQuestion(firstQuestion, 1, state.totalRounds, state.settings.questionTimeLimit),
        players: resetQuestionStates(state.players),
        currentPlayerId: state.players.find((p) => !p.isBot)?.id ?? state.players[0]?.id ?? null,
        dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
        activeSpecialEvent: null,
        rollQueue: [],
        pacingMode: "auto",
        lastEvent: "HOST · เริ่มเกมรอบที่ 1",
        updatedAt: Date.now(),
      };
    }

    case "QUESTION_STARTED": {
      // Do not allow starting a new question while a Special Event is still unresolved
      if (state.activeSpecialEvent && !state.activeSpecialEvent.resolved) {
        return state;
      }
      const question = QUESTIONS[action.questionIndex % QUESTIONS.length];
      const nextRound = Math.min(state.totalRounds, state.round + 1);
      return {
        ...state,
        gameStatus: "question",
        round: nextRound,
        question: toActiveQuestion(question, nextRound, state.totalRounds, state.settings.questionTimeLimit),
        players: resetQuestionStates(state.players),
        dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
        rollQueue: [],
        movingPlayerId: null,
        movement: null,
        activeSpecialEvent: null,
        lastEvent: `SYSTEM · รอบที่ ${nextRound} — ${question.prompt.slice(0, 36)}`,
        updatedAt: Date.now(),
      };
    }

    case "TIMER_TICK": {
      if (!state.question || state.question.revealed) return state;
      const timeLeft = Math.max(0, state.question.timeLeft - 1);
      if (timeLeft === 0) {
        const correctPlayers = state.players
          .filter((p) => p.answerState === "correct" || p.bonusNextTurn)
          .sort((a, b) => (a.answeredAt ?? Infinity) - (b.answeredAt ?? Infinity));
        const queue = correctPlayers.map((p) => p.id);
        return {
          ...state,
          gameStatus: queue.length > 0 ? "dice" : "reveal",
          currentPlayerId: queue[0] ?? null,
          question: { ...state.question, timeLeft: 0, revealed: true },
          rollQueue: queue,
          lastEvent: `SYSTEM · หมดเวลา — เฉลยคำตอบ (${correctPlayers.length} คนได้ทอยลูกเต๋า)`,
          updatedAt: Date.now(),
        };
      }
      return { ...state, question: { ...state.question, timeLeft }, updatedAt: Date.now() };
    }

    case "ANSWER_SELECTED": {
      if (!state.question || state.question.revealed) return state;
      const isCorrect = action.optionId === state.question.correctOptionId;
      const players = state.players.map((p) => {
        if (p.id !== action.playerId) return p;
        // Prevent double-answering
        if (p.selectedOptionId !== null) return p;
        return {
          ...p,
          selectedOptionId: action.optionId,
          answeredAt: Date.now(),
          answerState: isCorrect ? ("correct" as const) : ("wrong" as const),
          answeredCount: (p.answeredCount ?? 0) + 1,
          correctCount: (p.correctCount ?? 0) + (isCorrect ? 1 : 0),
        };
      });
      return withLeaderboard({ ...state, gameStatus: "answering", updatedAt: Date.now() }, players);
    }

    case "ANSWERS_REVEALED": {
      if (!state.question) return state;
      const correctPlayers = state.players
        .filter((p) => p.answerState === "correct" || p.bonusNextTurn)
        .sort((a, b) => (a.answeredAt ?? Infinity) - (b.answeredAt ?? Infinity));
      const queue = correctPlayers.map((p) => p.id);
      return {
        ...state,
        gameStatus: queue.length > 0 ? "dice" : "reveal",
        currentPlayerId: queue[0] ?? null,
        question: { ...state.question, revealed: true, timeLeft: 0 },
        players: state.players.map((p) => ({ ...p, bonusNextTurn: false })),
        rollQueue: queue,
        lastEvent: `SYSTEM · เฉลยแล้ว — ${correctPlayers.length} คนได้รับสิทธิ์ทอยลูกเต๋า`,
        updatedAt: Date.now(),
      };
    }

    case "DICE_ROLL_STARTED":
      return {
        ...state,
        gameStatus: "dice",
        dice: { ...state.dice, rolling: true, rolledBy: action.playerId },
        currentPlayerId: action.playerId,
        lastEvent: `${state.players.find((p) => p.id === action.playerId)?.name ?? "ผู้เล่น"} · กำลังทอยลูกเต๋า`,
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
      const actualPath = walkPath(player.position, action.steps, FINISH_AT);
      const targetPos = actualPath.length ? actualPath[actualPath.length - 1] : player.position;
      return {
        ...state,
        gameStatus: "moving",
        movingPlayerId: action.playerId,
        movement: {
          playerId: action.playerId,
          kind: "walk",
          from: player.position,
          to: targetPos,
          step: 0,
          path: actualPath,
        },
        lastEvent: `${player.name} · เดิน ${action.steps} ช่อง (${player.position} → ${targetPos})`,
        updatedAt: Date.now(),
      };
    }

    case "MOVEMENT_STEP": {
      if (!state.movement) return state;
      const { path, step, playerId } = state.movement;
      if (step >= path.length) return state;
      const position = path[step];
      const nextStep = step + 1;
      return withLeaderboard(
        {
          ...state,
          movement: { ...state.movement, step: nextStep },
          updatedAt: Date.now(),
        },
        state.players.map((p) =>
          p.id === playerId ? { ...p, position, score: position + (p.finishRank ? (GAME_SETTINGS.finishBonuses[p.finishRank - 1] ?? 0) : 0) } : p,
        ),
      );
    }

    case "MOVEMENT_FINISHED": {
      if (!state.movement) return state;
      const player = state.players.find((p) => p.id === state.movement!.playerId);
      if (!player) return { ...state, movement: null, movingPlayerId: null, updatedAt: Date.now() };

      const landedPos = state.movement.to;
      const effect = resolveBoardEffect(
        landedPos,
        SNAKES,
        LADDERS,
        SPECIAL_CELLS,
        state.enabledSpecials,
      );

      if (effect) {
        const finalPos = effect.to;
        const updatedPlayers = state.players.map((p) => {
          if (p.id !== player.id) return p;
          return {
            ...p,
            position: finalPos,
            score: finalPos + (p.finishRank ? (GAME_SETTINGS.finishBonuses[p.finishRank - 1] ?? 0) : 0),
            snakesBitten: (p.snakesBitten ?? 0) + (effect.kind === "snake" ? 1 : 0),
            laddersClimbed: (p.laddersClimbed ?? 0) + (effect.kind === "ladder" ? 1 : 0),
            specialEventsTriggered: (p.specialEventsTriggered ?? 0) + (effect.kind === "special" ? 1 : 0),
            bonusNextTurn: effect.specialKind === "boost" ? true : p.bonusNextTurn,
          };
        });

        const specialEvent: SpecialEventState = {
          id: `evt-${Date.now()}`,
          playerId: player.id,
          playerName: player.name,
          avatarId: player.avatarId,
          kind: effect.kind === "special" ? (effect.specialKind ?? "star") : effect.kind,
          from: effect.from,
          to: effect.to,
          title: effect.label,
          description: effect.description,
          resolved: false,
          bonusRollGranted: effect.specialKind === "star",
        };

        // Keep player in queue if STAR bonus roll granted, otherwise remove after event resolves
        const nextQueue =
          effect.specialKind === "star"
            ? state.rollQueue
            : state.rollQueue.filter((id) => id !== player.id);

        return withLeaderboard(
          {
            ...state,
            gameStatus: "special_event",
            movement: null,
            movingPlayerId: null,
            activeSpecialEvent: specialEvent,
            rollQueue: nextQueue,
            currentPlayerId: nextQueue[0] ?? null,
            lastEvent: `${player.name} · ${effect.label}`,
            updatedAt: Date.now(),
          },
          updatedPlayers,
        );
      }

      // Check finish (exact landing on 100)
      if (landedPos === FINISH_AT) {
        const alreadyFinished = Boolean(player.finishRank);
        const finishedCount = alreadyFinished
          ? player.finishRank!
          : state.players.filter((p) => p.finishRank).length + 1;
        const bonus = GAME_SETTINGS.finishBonuses[finishedCount - 1] ?? 0;
        const nextQueue = state.rollQueue.filter((id) => id !== player.id);
        const updatedPlayers = state.players.map((p) =>
          p.id === player.id
            ? { ...p, position: FINISH_AT, finishRank: finishedCount, score: FINISH_AT + bonus }
            : p,
        );
        return withLeaderboard(
          {
            ...state,
            movement: null,
            movingPlayerId: null,
            rollQueue: nextQueue,
            currentPlayerId: nextQueue[0] ?? null,
            gameStatus: nextQueue.length > 0 ? "dice" : "reveal",
            lastEvent: `${player.name} · 🏁 เข้าเส้นชัยอันดับที่ ${finishedCount}! (+${bonus} โบนัส)`,
            updatedAt: Date.now(),
          },
          updatedPlayers,
        );
      }

      // Normal end of movement
      const nextQueue = state.rollQueue.filter((id) => id !== player.id);
      const updatedPlayers = state.players.map((p) =>
        p.id === player.id
          ? {
              ...p,
              position: landedPos,
              score: landedPos + (p.finishRank ? (GAME_SETTINGS.finishBonuses[p.finishRank - 1] ?? 0) : 0),
            }
          : p,
      );
      return withLeaderboard(
        {
          ...state,
          movement: null,
          movingPlayerId: null,
          rollQueue: nextQueue,
          currentPlayerId: nextQueue[0] ?? null,
          gameStatus: nextQueue.length > 0 ? "dice" : "reveal",
          updatedAt: Date.now(),
        },
        updatedPlayers,
      );
    }

    case "RESOLVE_SPECIAL_EVENT": {
      if (!state.activeSpecialEvent) return state;
      const nextQueue = state.rollQueue;
      return {
        ...state,
        activeSpecialEvent: { ...state.activeSpecialEvent, resolved: true },
        gameStatus: nextQueue.length > 0 ? "dice" : "reveal",
        currentPlayerId: nextQueue[0] ?? null,
        lastEvent: `SYSTEM · จบเหตุการณ์พิเศษของ ${state.activeSpecialEvent.playerName}`,
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

      return {
        ...state,
        lastEvent: `${player.name} · ${label}`,
        updatedAt: Date.now(),
      };
    }

    case "NEXT_TURN": {
      if (state.activeSpecialEvent && !state.activeSpecialEvent.resolved) {
        return state;
      }
      const nextPlayerId = state.rollQueue[0] ?? null;
      if (!nextPlayerId) {
        if (state.round >= state.totalRounds) {
          return {
            ...state,
            gameStatus: "finished",
            activeSpecialEvent: null,
            lastEvent: "SYSTEM · จบการแข่งขัน — สรุปผลคะแนนและอันดับ",
            updatedAt: Date.now(),
          };
        }
        const nextRound = state.round + 1;
        return {
          ...state,
          gameStatus: "question",
          round: nextRound,
          question: toActiveQuestion(
            QUESTIONS[(nextRound - 1) % QUESTIONS.length],
            nextRound,
            state.totalRounds,
            state.settings.questionTimeLimit,
          ),
          players: resetQuestionStates(state.players),
          dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
          rollQueue: [],
          activeSpecialEvent: null,
          currentPlayerId: state.players.find((p) => !p.isBot)?.id ?? state.players[0]?.id ?? null,
          updatedAt: Date.now(),
        };
      }
      return {
        ...state,
        currentPlayerId: nextPlayerId,
        dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
        gameStatus: "dice",
        activeSpecialEvent: null,
        updatedAt: Date.now(),
      };
    }

    case "GAME_FINISHED":
      return {
        ...state,
        gameStatus: "finished",
        activeSpecialEvent: null,
        movement: null,
        movingPlayerId: null,
        lastEvent: "SYSTEM · จบเกม — แสดงผลคะแนนสุดท้าย",
        updatedAt: Date.now(),
      };

    case "EVENT_LOGGED":
      return { ...state, lastEvent: action.message, updatedAt: Date.now() };

    case "STATE_REPLACED":
      return { ...action.state, updatedAt: action.state.updatedAt || Date.now() };

    case "TOGGLE_SPECIAL": {
      const currentArr = normalizeSpecialsArray(state.enabledSpecials);
      const newSet = new Set(currentArr);
      if (action.enabled) newSet.add(action.kind);
      else newSet.delete(action.kind);
      return { ...state, enabledSpecials: newSet, updatedAt: Date.now() };
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