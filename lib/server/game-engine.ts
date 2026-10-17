import crypto from "crypto";
import { FINISH_AT, walkPath } from "../board";
import {
  AVATARS,
  BOARD_CONFIG,
  GAME_SETTINGS,
  LADDERS,
  MOCK_GAME,
  MOCK_PLAYERS,
  SNAKES,
  SPECIAL_CELLS,
} from "../game-data";
import {
  computeLeaderboard,
  normalizeSpecialsArray,
  resetQuestionStates,
  resolveBoardEffect,
  toActiveQuestion,
} from "../game-state";
import type {
  AvatarId,
  GameHistoryRecord,
  GameState,
  Player,
  PlayerReportRow,
  Question,
  ServerGameCommand,
  SpecialEventState,
} from "../types";
import { listQuestions, upsertGameHistory } from "./repository";

/**
 * Internal authoritative room state stored only on the server.
 * Secret fields (teacherId, rngSeed, questionsPool) are NEVER exposed in Public State.
 */
export interface ServerRoom {
  pin: string;
  teacherId: string;
  rngSeed: number;
  questionsPool: Question[];
  state: GameState;
}

const globalForRooms = globalThis as unknown as {
  __ksServerRooms?: Map<string, ServerRoom>;
};

function getRoomMap(): Map<string, ServerRoom> {
  if (!globalForRooms.__ksServerRooms) {
    const map = new Map<string, ServerRoom>();
    // Seed default active room 123456 so Teacher Dashboard & Student Join work out of the box
    const questions = listQuestions();
    const initialPlayers = MOCK_PLAYERS.map((p) => ({ ...p }));
    const initialState: GameState = {
      game: {
        ...MOCK_GAME,
        pin: "123456",
        title: "Math Challenge",
        subject: "คณิตศาสตร์",
        grade: "มัธยมศึกษาปีที่ 1",
      },
      gameStatus: "lobby",
      round: 0,
      totalRounds: 5,
      question: null,
      players: initialPlayers,
      currentPlayerId: null,
      dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
      board: BOARD_CONFIG,
      specialCells: SPECIAL_CELLS,
      enabledSpecials: ["star", "gift", "boost"],
      settings: { ...GAME_SETTINGS, questionTimeLimit: 25 },
      leaderboard: computeLeaderboard(initialPlayers),
      viewerPlayerId: null,
      movingPlayerId: null,
      movement: null,
      activeSpecialEvent: null,
      rollQueue: [],
      pacingMode: "auto",
      lastEvent: "SYSTEM · ห้อง 123456 พร้อมให้เข้าร่วม",
      updatedAt: Date.now(),
    };
    map.set("123456", {
      pin: "123456",
      teacherId: "teacher-default",
      rngSeed: 987654321,
      questionsPool: questions.length > 0 ? questions : [],
      state: initialState,
    });
    globalForRooms.__ksServerRooms = map;
  }
  return globalForRooms.__ksServerRooms;
}

/** Deterministic Mulberry32 PRNG stepped on the server so client can never spoof dice */
function nextServerRandomInt(room: ServerRoom, min: number, max: number): number {
  let t = (room.rngSeed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const float = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return Math.floor(float * (max - min + 1)) + min;
}

/**
 * Strip secret fields (correctOptionId before reveal, rngSeed, teacherId)
 * before sending state to any client or projector.
 */
export function toPublicGameState(room: ServerRoom, viewerPlayerId?: string | null): GameState {
  const { state } = room;
  const isRevealed = Boolean(state.question?.revealed);

  const sanitizedQuestion = state.question
    ? {
        ...state.question,
        correctOptionId: isRevealed ? state.question.correctOptionId : "",
        explanation: isRevealed ? state.question.explanation : "",
      }
    : null;

  const sanitizedPlayers: Player[] = state.players.map((p) => {
    if (isRevealed) return { ...p };
    // Before reveal, never expose whether an answer is "correct" or "wrong"
    const maskedAnswerState = p.answerState === "idle" ? "idle" : "selected";
    return {
      ...p,
      answerState: maskedAnswerState,
      selectedOptionId: viewerPlayerId && p.id === viewerPlayerId ? p.selectedOptionId : (p.selectedOptionId ? "selected" : null),
    };
  });

  return {
    ...state,
    question: sanitizedQuestion,
    players: sanitizedPlayers,
    enabledSpecials: normalizeSpecialsArray(state.enabledSpecials),
    leaderboard: computeLeaderboard(sanitizedPlayers),
    viewerPlayerId: viewerPlayerId ?? state.viewerPlayerId ?? null,
  };
}

function syncRoomToHistory(room: ServerRoom): void {
  const { state } = room;
  const lb = computeLeaderboard(state.players);
  const winner = lb[0] ?? null;
  const playerResults: PlayerReportRow[] = lb.map((entry) => {
    const p = state.players.find((pl) => pl.id === entry.playerId);
    const finishRank = p?.finishRank ?? null;
    const finishBonus = finishRank ? (state.settings.finishBonuses[finishRank - 1] ?? 0) : 0;
    const answered = p?.answeredCount ?? 0;
    const correct = p?.correctCount ?? 0;
    return {
      rank: entry.rank,
      playerId: entry.playerId,
      name: entry.name,
      avatarId: entry.avatarId,
      score: entry.score,
      position: entry.position,
      isFinished: entry.isFinished,
      finishRank,
      finishBonus,
      laddersClimbed: p?.laddersClimbed ?? 0,
      snakesBitten: p?.snakesBitten ?? 0,
      correctCount: correct,
      answeredCount: answered,
      accuracyPercent: answered > 0 ? Math.round((correct / answered) * 100) : null,
    };
  });

  const record: GameHistoryRecord = {
    id: state.game.id,
    pin: room.pin,
    title: state.game.title,
    subject: state.game.subject,
    grade: state.game.grade,
    hostName: state.game.hostName,
    createdAt: state.game.createdAt ?? Date.now(),
    finishedAt: state.gameStatus === "finished" ? Date.now() : null,
    status:
      state.gameStatus === "finished"
        ? "completed"
        : state.gameStatus === "lobby"
        ? "lobby"
        : "playing",
    totalRounds: state.totalRounds,
    roundsPlayed: state.round,
    questionTimeLimit: state.settings.questionTimeLimit,
    playersCount: state.players.length,
    maxPlayers: state.settings.maxPlayers,
    winnerName: winner?.name ?? null,
    winnerAvatarId: winner?.avatarId ?? null,
    winnerScore: winner?.score ?? null,
    playerResults,
  };

  upsertGameHistory(record);
}

export function getServerRoom(pin: string): ServerRoom | null {
  const map = getRoomMap();
  return map.get(pin) ?? null;
}

export function listActiveServerRooms(): ServerRoom[] {
  return Array.from(getRoomMap().values());
}

export interface CreateGameInput {
  title: string;
  subject: string;
  grade?: string;
  totalRounds: number;
  questionTimeLimit: number;
  maxPlayers?: number;
  questionIds?: string[];
  enabledSpecials?: string[];
  teacherId: string;
  hostName: string;
  seedDemoPlayers?: boolean;
}

export function createRoomOnServer(input: CreateGameInput): {
  room?: ServerRoom;
  error?: string;
} {
  if (!input.title || input.title.trim().length < 2) {
    return { error: "กรุณาตั้งชื่อเกมอย่างน้อย 2 ตัวอักษร" };
  }
  if (!input.subject || !input.subject.trim()) {
    return { error: "กรุณาเลือกรายวิชา" };
  }
  if (input.totalRounds < 1 || input.totalRounds > 30) {
    return { error: "จำนวนรอบต้องอยู่ระหว่าง 1 ถึง 30 รอบ" };
  }
  if (input.questionTimeLimit < 5 || input.questionTimeLimit > 120) {
    return { error: "เวลาตอบต้องอยู่ระหว่าง 5 ถึง 120 วินาที" };
  }

  const map = getRoomMap();
  // Generate unique 6-digit PIN
  let pin = "";
  for (let i = 0; i < 20; i++) {
    const candidate = String(crypto.randomInt(100000, 999999));
    if (!map.has(candidate)) {
      pin = candidate;
      break;
    }
  }
  if (!pin) pin = String(Date.now()).slice(-6);

  const allQuestions = listQuestions();
  let selectedQuestions = allQuestions;
  if (input.questionIds && input.questionIds.length > 0) {
    const idSet = new Set(input.questionIds);
    const filtered = allQuestions.filter((q) => idSet.has(q.id));
    if (filtered.length > 0) selectedQuestions = filtered;
  } else if (input.subject && input.subject !== "ทั้งหมด") {
    const bySubject = allQuestions.filter((q) => q.subject === input.subject);
    if (bySubject.length > 0) selectedQuestions = bySubject;
  }

  const initialPlayers: Player[] = input.seedDemoPlayers
    ? MOCK_PLAYERS.slice(0, 6).map((p) => ({
        ...p,
        position: 1,
        score: 1,
        laddersClimbed: 0,
        snakesBitten: 0,
        correctCount: 0,
        answeredCount: 0,
        finishRank: null,
        lastRoll: null,
      }))
    : [];

  const createdAt = Date.now();
  const state: GameState = {
    game: {
      id: `game-${pin}`,
      pin,
      title: input.title.trim(),
      subject: input.subject.trim(),
      grade: input.grade?.trim() || "มัธยมศึกษา",
      hostName: input.hostName || "ครูผู้สอน",
      school: "โรงเรียนสาธิตพิชิตความรู้",
      createdAt,
    },
    gameStatus: "lobby",
    round: 0,
    totalRounds: input.totalRounds,
    question: null,
    players: initialPlayers,
    currentPlayerId: null,
    dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
    board: BOARD_CONFIG,
    specialCells: SPECIAL_CELLS,
    enabledSpecials: input.enabledSpecials ?? ["star", "gift", "boost"],
    settings: {
      ...GAME_SETTINGS,
      maxPlayers: input.maxPlayers ?? 40,
      questionTimeLimit: input.questionTimeLimit,
    },
    leaderboard: computeLeaderboard(initialPlayers),
    viewerPlayerId: null,
    movingPlayerId: null,
    movement: null,
    activeSpecialEvent: null,
    rollQueue: [],
    pacingMode: "auto",
    lastEvent: `SYSTEM · สร้างห้องเกม "${input.title.trim()}" (PIN: ${pin}) สำเร็จ`,
    updatedAt: createdAt,
  };

  const room: ServerRoom = {
    pin,
    teacherId: input.teacherId,
    rngSeed: crypto.randomInt(100000, 999999999),
    questionsPool: selectedQuestions.length > 0 ? selectedQuestions : allQuestions,
    state,
  };

  map.set(pin, room);
  syncRoomToHistory(room);
  return { room };
}

/**
 * Helper to Check if Teacher can click "Advance" based on Server Phase Rules
 */
export function canTeacherAdvance(state: GameState): {
  allowed: boolean;
  label: string;
  reason?: string;
} {
  if (state.activeSpecialEvent && !state.activeSpecialEvent.resolved) {
    return {
      allowed: true,
      label: "ยืนยันเหตุการณ์พิเศษ",
      reason: "กดเพื่อปิดหน้าต่างเหตุการณ์พิเศษและดำเนินการต่อ",
    };
  }
  switch (state.gameStatus) {
    case "lobby":
      return {
        allowed: state.players.length > 0,
        label: "เริ่มเกม",
        reason: state.players.length === 0 ? "ต้องมีผู้เล่นอย่างน้อย 1 คนในห้อง" : undefined,
      };
    case "question":
    case "answering":
      return {
        allowed: true,
        label: "เฉลยคำตอบ",
      };
    case "reveal":
      if (state.rollQueue.length > 0) {
        return { allowed: true, label: "เริ่มคิวทอยลูกเต๋า" };
      }
      if (state.round >= state.totalRounds) {
        return { allowed: true, label: "สรุปผลจบเกม" };
      }
      return { allowed: false, label: "ไปต่อ", reason: "กรุณากดปุ่ม 'เริ่มคำถาม' เพื่อเริ่มข้อถัดไป" };
    case "dice":
      return {
        allowed: state.rollQueue.length > 0,
        label: "ทอยให้ผู้เล่นถัดไป",
      };
    case "moving":
      return {
        allowed: false,
        label: "กำลังเดิน...",
        reason: "รอให้ตัวละครเดินเสร็จสิ้น",
      };
    case "special_event":
      return {
        allowed: true,
        label: "ดำเนินการต่อหลังเหตุการณ์พิเศษ",
      };
    case "finished":
      return {
        allowed: false,
        label: "จบเกมแล้ว",
        reason: "การแข่งขันสิ้นสุดแล้ว",
      };
    default:
      return { allowed: false, label: "ไปต่อ" };
  }
}

/**
 * Execute an authoritative game command on the server.
 */
export function executeServerGameCommand(
  pin: string,
  command: ServerGameCommand,
  options: { isTeacherAuthenticated?: boolean } = {},
): { room?: ServerRoom; publicState?: GameState; joinedPlayer?: Player; error?: string } {
  const room = getServerRoom(pin);
  if (!room) {
    return { error: `ไม่พบห้องเกมหมายเลข PIN ${pin}` };
  }

  const { state } = room;

  // Teacher-only commands require teacher authentication on the server
  const teacherOnlyCommands: ServerGameCommand["type"][] = [
    "START_GAME",
    "START_QUESTION",
    "REVEAL_ANSWERS",
    "ADVANCE_TURN",
    "END_GAME",
    "SET_PACING_MODE",
  ];

  if (teacherOnlyCommands.includes(command.type) && !options.isTeacherAuthenticated) {
    return { error: "ไม่มีสิทธิ์ควบคุมเกม: กรุณาเข้าสู่ระบบครูผู้สอนก่อนดำเนินการ" };
  }

  switch (command.type) {
    case "JOIN_GAME": {
      const cleanName = command.nickname?.trim();
      if (!cleanName || cleanName.length < 1 || cleanName.length > 20) {
        return { error: "กรุณาระบุชื่อเล่น (1–20 ตัวอักษร)" };
      }
      if (state.gameStatus === "finished") {
        return { error: "เกมนี้สิ้นสุดลงแล้ว ไม่สามารถเข้าร่วมได้" };
      }
      const validAvatar = AVATARS.some((a) => a.id === command.avatarId)
        ? command.avatarId
        : ("fox" as AvatarId);

      // Reconnect if same playerId or same nickname already in room
      const existing = state.players.find(
        (p) =>
          (command.playerId && p.id === command.playerId) ||
          p.name.toLowerCase() === cleanName.toLowerCase(),
      );

      if (existing) {
        const updatedPlayer: Player = {
          ...existing,
          name: cleanName,
          avatarId: validAvatar,
          connected: true,
          isReady: true,
        };
        const updatedPlayers = state.players.map((p) =>
          p.id === existing.id ? updatedPlayer : p,
        );
        room.state = {
          ...state,
          players: updatedPlayers,
          leaderboard: computeLeaderboard(updatedPlayers),
          lastEvent: `SYSTEM · ${cleanName} เชื่อมต่อกลับเข้าห้องสำเร็จ`,
          updatedAt: Date.now(),
        };
        syncRoomToHistory(room);
        return {
          room,
          publicState: toPublicGameState(room, updatedPlayer.id),
          joinedPlayer: updatedPlayer,
        };
      }

      if (state.players.length >= state.settings.maxPlayers) {
        return { error: `ห้องเต็มแล้ว (สูงสุด ${state.settings.maxPlayers} คน)` };
      }

      const newPlayer: Player = {
        id: command.playerId || `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        name: cleanName,
        avatarId: validAvatar,
        position: 1,
        score: 1,
        isReady: true,
        isHost: false,
        isBot: false,
        answerState: "idle",
        selectedOptionId: null,
        answeredAt: null,
        lastRoll: null,
        finishRank: null,
        correctCount: 0,
        answeredCount: 0,
        laddersClimbed: 0,
        snakesBitten: 0,
        specialEventsTriggered: 0,
        connected: true,
      };

      // If default room was in lobby with mock positions > 1, normalize positions to 1 when first real student joins in lobby
      const normalizedExisting =
        state.gameStatus === "lobby"
          ? state.players.map((p) => ({ ...p, position: 1, score: 1 }))
          : state.players;

      const updatedPlayers = [newPlayer, ...normalizedExisting];
      room.state = {
        ...state,
        players: updatedPlayers,
        leaderboard: computeLeaderboard(updatedPlayers),
        lastEvent: `SYSTEM · ${newPlayer.name} เข้าร่วมห้องเกมแล้ว`,
        updatedAt: Date.now(),
      };
      syncRoomToHistory(room);
      return {
        room,
        publicState: toPublicGameState(room, newPlayer.id),
        joinedPlayer: newPlayer,
      };
    }

    case "PLAYER_READY": {
      const updatedPlayers = state.players.map((p) =>
        p.id === command.playerId ? { ...p, isReady: command.ready } : p,
      );
      room.state = {
        ...state,
        players: updatedPlayers,
        leaderboard: computeLeaderboard(updatedPlayers),
        updatedAt: Date.now(),
      };
      return { room, publicState: toPublicGameState(room, command.playerId) };
    }

    case "START_GAME": {
      if (state.activeSpecialEvent && !state.activeSpecialEvent.resolved) {
        return { error: "ไม่สามารถเริ่มคำถามใหม่ได้ขณะที่ Special Event ยังไม่เสร็จสิ้น" };
      }
      if (state.players.length === 0) {
        return { error: "ต้องมีผู้เล่นในห้องอย่างน้อย 1 คนก่อนเริ่มเกม" };
      }
      const pool = room.questionsPool.length > 0 ? room.questionsPool : listQuestions();
      const firstQuestion = pool[0];
      // Reset all players to Start square 1 when starting from lobby
      const playersAtStart = state.players.map((p) => ({
        ...p,
        position: state.round === 0 ? 1 : p.position,
        score: state.round === 0 ? 1 : p.score,
        answerState: "idle" as const,
        selectedOptionId: null,
        answeredAt: null,
        lastRoll: null,
        finishRank: state.round === 0 ? null : p.finishRank,
      }));

      room.state = {
        ...state,
        gameStatus: "question",
        round: 1,
        question: toActiveQuestion(firstQuestion, 1, state.totalRounds, state.settings.questionTimeLimit),
        players: playersAtStart,
        leaderboard: computeLeaderboard(playersAtStart),
        currentPlayerId: null,
        dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
        activeSpecialEvent: null,
        movement: null,
        movingPlayerId: null,
        rollQueue: [],
        lastEvent: `HOST · เริ่มเกม! คำถามข้อที่ 1/${state.totalRounds}`,
        updatedAt: Date.now(),
      };
      syncRoomToHistory(room);
      return { room, publicState: toPublicGameState(room) };
    }

    case "START_QUESTION": {
      // Guard: Teacher MUST NOT start a new question while a Special Event is unresolved or movement is ongoing
      if (state.activeSpecialEvent && !state.activeSpecialEvent.resolved) {
        return { error: "ห้ามเริ่มคำถามใหม่ขณะที่เหตุการณ์พิเศษ (Special Event) ยังไม่เสร็จสิ้น" };
      }
      if (state.gameStatus === "moving") {
        return { error: "กรุณารอให้ผู้เล่นเดินบนกระดานเสร็จสิ้นก่อนเริ่มคำถามใหม่" };
      }
      if (state.gameStatus === "dice" && state.rollQueue.length > 0) {
        return { error: `ยังมีผู้เล่นรอทอยลูกเต๋าอีก ${state.rollQueue.length} คน กรุณาทอยให้ครบก่อนเริ่มข้อถัดไป` };
      }
      if (state.gameStatus === "lobby") {
        return executeServerGameCommand(pin, { type: "START_GAME" }, options);
      }
      if (state.round >= state.totalRounds && (state.gameStatus === "reveal" || state.gameStatus === "finished")) {
        room.state = {
          ...state,
          gameStatus: "finished",
          lastEvent: "SYSTEM · จบการแข่งขันครบทุกรอบแล้ว!",
          updatedAt: Date.now(),
        };
        syncRoomToHistory(room);
        return { room, publicState: toPublicGameState(room) };
      }

      const nextRound = Math.min(state.totalRounds, state.round + 1);
      const pool = room.questionsPool.length > 0 ? room.questionsPool : listQuestions();
      const qIndex = command.questionIndex ?? (nextRound - 1) % pool.length;
      const nextQuestion = pool[qIndex % pool.length];
      const resetPlayers = resetQuestionStates(state.players);

      room.state = {
        ...state,
        gameStatus: "question",
        round: nextRound,
        question: toActiveQuestion(nextQuestion, nextRound, state.totalRounds, state.settings.questionTimeLimit),
        players: resetPlayers,
        leaderboard: computeLeaderboard(resetPlayers),
        currentPlayerId: null,
        dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
        activeSpecialEvent: null,
        movement: null,
        movingPlayerId: null,
        rollQueue: [],
        lastEvent: `HOST · เริ่มคำถามข้อที่ ${nextRound}/${state.totalRounds}`,
        updatedAt: Date.now(),
      };
      syncRoomToHistory(room);
      return { room, publicState: toPublicGameState(room) };
    }

    case "SUBMIT_ANSWER": {
      if (
        (state.gameStatus !== "question" && state.gameStatus !== "answering") ||
        !state.question ||
        state.question.revealed
      ) {
        return { error: "ไม่อยู่ในช่วงเวลาตอบคำถาม" };
      }

      const player = state.players.find((p) => p.id === command.playerId);
      if (!player) {
        return { error: "ไม่พบข้อมูลผู้เล่นในห้องนี้" };
      }
      if (player.selectedOptionId !== null) {
        return { error: "คุณได้ส่งคำตอบสำหรับข้อนี้ไปแล้ว" };
      }

      const validOption = state.question.options.some((o) => o.id === command.optionId);
      if (!validOption) {
        return { error: "ตัวเลือกคำตอบไม่ถูกต้อง" };
      }

      const isCorrect = command.optionId === state.question.correctOptionId;
      const updatedPlayers = state.players.map((p) => {
        if (p.id !== command.playerId) return p;
        return {
          ...p,
          selectedOptionId: command.optionId,
          answeredAt: Date.now(),
          answerState: isCorrect ? ("correct" as const) : ("wrong" as const),
          answeredCount: (p.answeredCount ?? 0) + 1,
          correctCount: (p.correctCount ?? 0) + (isCorrect ? 1 : 0),
        };
      });

      const answeredTotal = updatedPlayers.filter((p) => p.selectedOptionId !== null).length;
      room.state = {
        ...state,
        gameStatus: "answering",
        players: updatedPlayers,
        leaderboard: computeLeaderboard(updatedPlayers),
        lastEvent: `PLAYER · ส่งคำตอบแล้ว (${answeredTotal}/${updatedPlayers.length} คน)`,
        updatedAt: Date.now(),
      };
      syncRoomToHistory(room);
      return { room, publicState: toPublicGameState(room, command.playerId) };
    }

    case "TIMER_TICK": {
      if (!state.question || state.question.revealed) {
        return { room, publicState: toPublicGameState(room) };
      }
      const timeLeft = Math.max(0, state.question.timeLeft - 1);
      if (timeLeft === 0) {
        return revealAnswersOnServer(room);
      }
      room.state = {
        ...state,
        question: { ...state.question, timeLeft },
        updatedAt: Date.now(),
      };
      return { room, publicState: toPublicGameState(room) };
    }

    case "REVEAL_ANSWERS": {
      if (!state.question) {
        return { error: "ยังไม่มีคำถามที่กำลังเปิดอยู่" };
      }
      return revealAnswersOnServer(room);
    }

    case "ROLL_DICE": {
      if (state.activeSpecialEvent && !state.activeSpecialEvent.resolved) {
        return { error: "กรุณาปิดเหตุการณ์พิเศษก่อนทอยลูกเต๋า" };
      }
      if (state.gameStatus !== "dice" && state.gameStatus !== "reveal") {
        return { error: "ไม่อยู่ในช่วงทอยลูกเต๋า" };
      }
      if (state.rollQueue.length === 0) {
        return { error: "ไม่มีคิวทอยลูกเต๋าในรอบนี้" };
      }

      const activeRollerId = state.rollQueue[0];
      if (command.playerId !== activeRollerId && !options.isTeacherAuthenticated) {
        const activeRoller = state.players.find((p) => p.id === activeRollerId);
        return {
          error: `ยังไม่ถึงคิวของคุณ (ขณะนี้เป็นคิวของ ${activeRoller?.name ?? "ผู้เล่นก่อนหน้า"})`,
        };
      }

      return performServerDiceRollAndMove(room, activeRollerId);
    }

    case "RESOLVE_SPECIAL_EVENT": {
      if (!state.activeSpecialEvent) {
        return { room, publicState: toPublicGameState(room) };
      }
      const resolvedEvent: SpecialEventState = {
        ...state.activeSpecialEvent,
        resolved: true,
      };
      const nextQueue = state.rollQueue;
      room.state = {
        ...state,
        activeSpecialEvent: resolvedEvent,
        gameStatus: nextQueue.length > 0 ? "dice" : "reveal",
        currentPlayerId: nextQueue[0] ?? null,
        lastEvent: `SYSTEM · ดำเนินการต่อหลังเหตุการณ์พิเศษ (${resolvedEvent.title})`,
        updatedAt: Date.now(),
      };
      syncRoomToHistory(room);
      return { room, publicState: toPublicGameState(room) };
    }

    case "ADVANCE_TURN": {
      const check = canTeacherAdvance(state);
      if (!check.allowed) {
        return { error: check.reason || "ไม่สามารถกดไปต่อในสถานะนี้ได้" };
      }

      if (state.activeSpecialEvent && !state.activeSpecialEvent.resolved) {
        return executeServerGameCommand(pin, { type: "RESOLVE_SPECIAL_EVENT" }, options);
      }

      if (state.gameStatus === "lobby") {
        return executeServerGameCommand(pin, { type: "START_GAME" }, options);
      }

      if (state.gameStatus === "question" || state.gameStatus === "answering") {
        return revealAnswersOnServer(room);
      }

      if (state.gameStatus === "reveal") {
        if (state.rollQueue.length > 0) {
          room.state = {
            ...state,
            gameStatus: "dice",
            currentPlayerId: state.rollQueue[0],
            updatedAt: Date.now(),
          };
          return { room, publicState: toPublicGameState(room) };
        }
        if (state.round >= state.totalRounds) {
          room.state = {
            ...state,
            gameStatus: "finished",
            lastEvent: "HOST · จบการแข่งขัน! แสดงผลคะแนนสุดท้าย",
            updatedAt: Date.now(),
          };
          syncRoomToHistory(room);
          return { room, publicState: toPublicGameState(room) };
        }
        return executeServerGameCommand(pin, { type: "START_QUESTION" }, options);
      }

      if (state.gameStatus === "dice" && state.rollQueue.length > 0) {
        return performServerDiceRollAndMove(room, state.rollQueue[0]);
      }

      return { room, publicState: toPublicGameState(room) };
    }

    case "END_GAME": {
      room.state = {
        ...state,
        gameStatus: "finished",
        activeSpecialEvent: null,
        movement: null,
        movingPlayerId: null,
        rollQueue: [],
        lastEvent: "HOST · ครูผู้สอนสิ้นสุดการแข่งขัน",
        updatedAt: Date.now(),
      };
      syncRoomToHistory(room);
      return { room, publicState: toPublicGameState(room) };
    }

    case "SET_PACING_MODE": {
      room.state = {
        ...state,
        pacingMode: command.mode,
        updatedAt: Date.now(),
      };
      return { room, publicState: toPublicGameState(room) };
    }

    default:
      return { room, publicState: toPublicGameState(room) };
  }
}

function revealAnswersOnServer(room: ServerRoom): {
  room: ServerRoom;
  publicState: GameState;
} {
  const { state } = room;
  if (!state.question) {
    return { room, publicState: toPublicGameState(room) };
  }

  const correctPlayers = state.players
    .filter((p) => p.answerState === "correct" || p.bonusNextTurn)
    .sort((a, b) => (a.answeredAt ?? Infinity) - (b.answeredAt ?? Infinity));

  const queue = correctPlayers.map((p) => p.id);
  const updatedPlayers = state.players.map((p) => ({
    ...p,
    bonusNextTurn: false,
  }));

  room.state = {
    ...state,
    gameStatus: queue.length > 0 ? "dice" : "reveal",
    currentPlayerId: queue[0] ?? null,
    question: { ...state.question, revealed: true, timeLeft: 0 },
    players: updatedPlayers,
    leaderboard: computeLeaderboard(updatedPlayers),
    rollQueue: queue,
    lastEvent:
      queue.length > 0
        ? `SYSTEM · เฉลยคำตอบ! มีผู้เล่นตอบถูก ${queue.length} คน ได้สิทธิ์ทอยลูกเต๋า`
        : "SYSTEM · เฉลยคำตอบ! ไม่มีผู้เล่นตอบถูกในรอบนี้",
    updatedAt: Date.now(),
  };

  syncRoomToHistory(room);
  return { room, publicState: toPublicGameState(room) };
}

function performServerDiceRollAndMove(
  room: ServerRoom,
  playerId: string,
): { room: ServerRoom; publicState: GameState; error?: string } {
  const { state } = room;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    return { room, publicState: toPublicGameState(room), error: "ไม่พบผู้เล่นในคิวทอยลูกเต๋า" };
  }

  const diceValue = nextServerRandomInt(room, state.settings.diceMin, state.settings.diceMax);
  const path = walkPath(player.position, diceValue, FINISH_AT);
  const landedPos = path.length > 0 ? path[path.length - 1] : player.position;

  const effect = resolveBoardEffect(
    landedPos,
    SNAKES,
    LADDERS,
    SPECIAL_CELLS,
    state.enabledSpecials,
  );

  let finalPos = landedPos;
  let specialEvent: SpecialEventState | null = null;
  let grantBonusRoll = false;
  let grantNextRoundBoost = false;

  if (effect) {
    finalPos = effect.to;
    grantBonusRoll = effect.specialKind === "star";
    grantNextRoundBoost = effect.specialKind === "boost";
    specialEvent = {
      id: `evt-${Date.now()}-${player.id}`,
      playerId: player.id,
      playerName: player.name,
      avatarId: player.avatarId,
      kind: effect.kind === "special" ? (effect.specialKind ?? "star") : effect.kind,
      from: effect.from,
      to: effect.to,
      title: effect.label,
      description: effect.description,
      resolved: false,
      bonusRollGranted: grantBonusRoll,
    };
  }

  // Check if player reached Finish (100)
  let newFinishRank = player.finishRank;
  let finishBonus = newFinishRank ? (state.settings.finishBonuses[newFinishRank - 1] ?? 0) : 0;
  if (finalPos === FINISH_AT && !newFinishRank) {
    newFinishRank = state.players.filter((p) => p.finishRank !== null).length + 1;
    finishBonus = state.settings.finishBonuses[newFinishRank - 1] ?? 0;
  }

  const updatedPlayers = state.players.map((p) => {
    if (p.id !== player.id) return p;
    return {
      ...p,
      position: finalPos,
      score: finalPos + finishBonus,
      lastRoll: diceValue,
      finishRank: newFinishRank,
      snakesBitten: (p.snakesBitten ?? 0) + (effect?.kind === "snake" ? 1 : 0),
      laddersClimbed: (p.laddersClimbed ?? 0) + (effect?.kind === "ladder" ? 1 : 0),
      specialEventsTriggered:
        (p.specialEventsTriggered ?? 0) + (effect?.kind === "special" ? 1 : 0),
      bonusNextTurn: grantNextRoundBoost ? true : p.bonusNextTurn,
    };
  });

  // Update Roll Queue: if STAR bonus roll was granted, player stays at front of rollQueue!
  const nextQueue = grantBonusRoll
    ? state.rollQueue
    : state.rollQueue.filter((id) => id !== player.id);

  const fullPath =
    effect && effect.to !== landedPos ? [...path, effect.to] : path;

  const nextStatus = specialEvent
    ? "special_event"
    : nextQueue.length > 0
    ? "dice"
    : "reveal";

  const eventSummary = specialEvent
    ? `${player.name} ทอยได้ ${diceValue} → ช่อง ${landedPos} (${specialEvent.title})`
    : finalPos === FINISH_AT
    ? `${player.name} ทอยได้ ${diceValue} → 🏁 เข้าเส้นชัยช่อง 100 อันดับที่ ${newFinishRank}!`
    : `${player.name} ทอยได้ ${diceValue} → เดินไปช่อง ${finalPos}`;

  room.state = {
    ...state,
    gameStatus: nextStatus,
    dice: {
      value: diceValue,
      rolling: false,
      rolledBy: player.id,
      lastReason: eventSummary,
    },
    players: updatedPlayers,
    leaderboard: computeLeaderboard(updatedPlayers),
    movingPlayerId: player.id,
    movement: {
      playerId: player.id,
      kind: effect ? (effect.kind === "special" ? "special" : effect.kind) : "walk",
      from: player.position,
      to: finalPos,
      step: fullPath.length - 1,
      path: fullPath,
    },
    activeSpecialEvent: specialEvent,
    rollQueue: nextQueue,
    currentPlayerId: nextQueue[0] ?? null,
    lastEvent: `DICE · ${eventSummary}`,
    updatedAt: Date.now(),
  };

  syncRoomToHistory(room);
  return { room, publicState: toPublicGameState(room, player.id) };
}
