import crypto from "crypto";
import fs from "fs";
import path from "path";
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
import {
  deleteGameHistoryRecord,
  getGameHistoryByPinOrId,
  listQuestions,
  upsertGameHistory,
} from "./repository";

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

const ROOMS_DIR = path.join(process.cwd(), ".data", "rooms");

function ensureRoomsDir(): void {
  try {
    if (!fs.existsSync(ROOMS_DIR)) {
      fs.mkdirSync(ROOMS_DIR, { recursive: true });
    }
  } catch {}
}

export function persistRoomToDisk(room: ServerRoom): void {
  try {
    ensureRoomsDir();
    const filePath = path.join(ROOMS_DIR, `${room.pin.toUpperCase()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(room, null, 2), "utf-8");
  } catch {}
}

export function loadRoomFromDisk(pin: string): ServerRoom | null {
  try {
    const normalized = pin.trim().toUpperCase();
    const filePath = path.join(ROOMS_DIR, `${normalized}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as ServerRoom;
      if (parsed && parsed.pin && parsed.state) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export function deleteRoomFromDisk(pin: string): void {
  try {
    const normalized = pin.trim().toUpperCase();
    const filePath = path.join(ROOMS_DIR, `${normalized}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}
}

const globalForRooms = globalThis as unknown as {
  __ksServerRooms?: Map<string, ServerRoom>;
};

function getRoomMap(): Map<string, ServerRoom> {
  if (!globalForRooms.__ksServerRooms) {
    globalForRooms.__ksServerRooms = new Map<string, ServerRoom>();
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
  const viewerPlayer = viewerPlayerId
    ? state.players.find((p) => p.id === viewerPlayerId)
    : null;
  const hasViewerAnswered = Boolean(
    viewerPlayer && viewerPlayer.selectedOptionId !== null,
  );

  const sanitizedQuestion = state.question
    ? {
        ...state.question,
        correctOptionId:
          isRevealed || hasViewerAnswered ? state.question.correctOptionId : "",
        explanation:
          isRevealed || hasViewerAnswered ? state.question.explanation : "",
      }
    : null;

  const sanitizedPlayers: Player[] = state.players.map((p) => {
    if (isRevealed || (viewerPlayerId && p.id === viewerPlayerId && p.selectedOptionId !== null)) {
      return { ...p };
    }
    // Before reveal, never expose to OTHER players whether someone's answer is "correct" or "wrong"
    const maskedAnswerState = p.answerState === "idle" ? "idle" : "selected";
    return {
      ...p,
      answerState: maskedAnswerState,
      selectedOptionId:
        viewerPlayerId && p.id === viewerPlayerId
          ? p.selectedOptionId
          : p.selectedOptionId
          ? "selected"
          : null,
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
  persistRoomToDisk(room);
  const { state } = room;
  const lb = computeLeaderboard(state.players);
  const winner = lb[0] ?? null;
  const playerResults: PlayerReportRow[] = lb.map((entry) => {
    const p = state.players.find((pl) => pl.id === entry.playerId);
    const finishRank = p?.finishRank ?? null;
    const finishBonus = finishRank ? (state.settings.finishBonuses[finishRank - 1] ?? 0) : 0;
    const answered = p?.answeredCount ?? 0;
    const correct = p?.correctCount ?? 0;
    const wrong = p?.wrongCount ?? Math.max(0, answered - correct);
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
      wrongCount: wrong,
      answeredCount: answered,
      accuracyPercent: answered > 0 ? Math.round((correct / answered) * 100) : null,
    };
  });

  const record: GameHistoryRecord = {
    id: state.game.id,
    pin: room.pin,
    teacherId: room.teacherId,
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
    questionIds: room.questionsPool.map((q) => q.id),
    enabledSpecials: normalizeSpecialsArray(state.enabledSpecials),
    winnerName: winner?.name ?? null,
    winnerAvatarId: winner?.avatarId ?? null,
    winnerScore: winner?.score ?? null,
    playerResults,
  };

  upsertGameHistory(record);
}

const KEY_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const KEY_DIGITS = "23456789";

/**
 * Generate a 6-character uppercase alphanumeric Room Key guaranteed to mix letters and numbers
 * (e.g. KS7M4X, A8F3K2)
 */
export function generateRoomKey(): string {
  const chars = [
    KEY_LETTERS[crypto.randomInt(0, KEY_LETTERS.length)],
    KEY_LETTERS[crypto.randomInt(0, KEY_LETTERS.length)],
    KEY_DIGITS[crypto.randomInt(0, KEY_DIGITS.length)],
    KEY_LETTERS[crypto.randomInt(0, KEY_LETTERS.length)],
    KEY_DIGITS[crypto.randomInt(0, KEY_DIGITS.length)],
    KEY_DIGITS[crypto.randomInt(0, KEY_DIGITS.length)],
  ];
  // Fisher-Yates shuffle so letters and numbers are mixed naturally
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }
  return chars.join("");
}

export function getServerRoom(pin: string): ServerRoom | null {
  const map = getRoomMap();
  const normalized = String(pin ?? "").trim().toUpperCase();
  if (map.has(normalized)) {
    return map.get(normalized) ?? null;
  }
  if (normalized === "123456" || normalized === "482915") {
    return map.get("KS4829") ?? null;
  }

  // 1. Try restoring from persistent disk room snapshot (exact live state)
  const diskRoom = loadRoomFromDisk(normalized);
  if (diskRoom) {
    map.set(normalized, diskRoom);
    return diskRoom;
  }

  // 2. Try restoring from saved game record in repository (fallback)
  const savedRecord = getGameHistoryByPinOrId(normalized);
  if (savedRecord) {
    const allQuestions = listQuestions();
    const questionById = new Map(allQuestions.map((q) => [q.id, q]));
    let selectedQuestions: Question[] = [];
    if (savedRecord.questionIds && savedRecord.questionIds.length > 0) {
      selectedQuestions = savedRecord.questionIds
        .map((id) => questionById.get(id))
        .filter((q): q is Question => Boolean(q));
    }
    if (selectedQuestions.length === 0) {
      selectedQuestions = listQuestions({
        teacherId: savedRecord.teacherId,
        subject: savedRecord.subject,
      });
    }
    if (selectedQuestions.length === 0) {
      selectedQuestions = allQuestions;
    }

    const totalRounds = Math.min(
      savedRecord.totalRounds || 5,
      Math.max(1, selectedQuestions.length),
    );
    const enabledSpecials = savedRecord.enabledSpecials ?? ["star", "gift", "boost"];

    const state: GameState = {
      game: {
        id: savedRecord.id || `game-${savedRecord.pin}`,
        pin: savedRecord.pin,
        title: savedRecord.title,
        subject: savedRecord.subject,
        grade: savedRecord.grade || "มัธยมศึกษาปีที่ 1",
        hostName: savedRecord.hostName || "ครูผู้สอน",
        school: MOCK_GAME.school,
        createdAt: savedRecord.createdAt || Date.now(),
      },
      gameStatus: "lobby",
      round: 0,
      totalRounds,
      question: null,
      players: [],
      currentPlayerId: null,
      dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
      board: BOARD_CONFIG,
      specialCells: SPECIAL_CELLS,
      enabledSpecials,
      settings: {
        ...GAME_SETTINGS,
        maxPlayers: savedRecord.maxPlayers || 40,
        questionTimeLimit: savedRecord.questionTimeLimit || 20,
      },
      leaderboard: [],
      viewerPlayerId: null,
      movingPlayerId: null,
      movement: null,
      activeSpecialEvent: null,
      rollQueue: [],
      pacingMode: "manual",
      lastEvent: `SYSTEM · เปิดห้องเกม "${savedRecord.title}" พร้อมรับผู้เล่น (PIN: ${savedRecord.pin})`,
      updatedAt: Date.now(),
    };

    const restoredRoom: ServerRoom = {
      pin: savedRecord.pin,
      teacherId: savedRecord.teacherId || "teacher-01",
      rngSeed: crypto.randomInt(100000, 999999999),
      questionsPool: selectedQuestions,
      state,
    };

    map.set(savedRecord.pin.toUpperCase(), restoredRoom);
    persistRoomToDisk(restoredRoom);
    return restoredRoom;
  }

  return null;
}

export function deleteServerRoom(pin: string, teacherId?: string): boolean {
  const map = getRoomMap();
  const normalized = String(pin ?? "").trim().toUpperCase();
  const room = map.get(normalized);
  if (room && (!teacherId || room.teacherId === teacherId)) {
    map.delete(normalized);
  }
  deleteRoomFromDisk(normalized);
  const deletedFromStore = deleteGameHistoryRecord(normalized, teacherId);
  return Boolean(room || deletedFromStore);
}

export function listActiveServerRooms(teacherId?: string): ServerRoom[] {
  const map = getRoomMap();
  try {
    ensureRoomsDir();
    if (fs.existsSync(ROOMS_DIR)) {
      const files = fs.readdirSync(ROOMS_DIR);
      for (const f of files) {
        if (f.endsWith(".json")) {
          const pin = f.replace(".json", "").toUpperCase();
          if (!map.has(pin)) {
            const r = loadRoomFromDisk(pin);
            if (r) map.set(pin, r);
          }
        }
      }
    }
  } catch {}

  const rooms = Array.from(map.values());
  if (teacherId) {
    return rooms.filter((r) => r.teacherId === teacherId);
  }
  return rooms;
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
  // Generate unique 6-character alphanumeric Room Key (letters + numbers mixed)
  let pin = "";
  for (let i = 0; i < 30; i++) {
    const candidate = generateRoomKey();
    if (!map.has(candidate)) {
      pin = candidate;
      break;
    }
  }
  if (!pin) pin = `KS${String(Date.now()).slice(-4)}`;

  const teacherQuestions = listQuestions({ teacherId: input.teacherId });
  const allStoreQuestions = listQuestions();
  let selectedQuestions: Question[] = [];

  if (input.questionIds && input.questionIds.length > 0) {
    const questionById = new Map(allStoreQuestions.map((q) => [q.id, q]));
    selectedQuestions = input.questionIds
      .map((id) => questionById.get(id))
      .filter((q): q is Question => Boolean(q));
  } else {
    selectedQuestions = teacherQuestions;
    if (input.subject && input.subject !== "ทั้งหมด") {
      const bySubject = teacherQuestions.filter((q) => q.subject === input.subject);
      if (bySubject.length > 0) selectedQuestions = bySubject;
    }
  }

  if (selectedQuestions.length === 0) {
    return {
      error: "กรุณาสร้างหรือเลือกคำถามอย่างน้อย 1 ข้อสำหรับใช้ในห้องเกมนี้",
    };
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
    questionsPool: selectedQuestions,
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
    "RESET_ROOM",
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
        state.gameStatus === "lobby" ||
        state.gameStatus === "finished" ||
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
        const newCorrect = (p.correctCount ?? 0) + (isCorrect ? 1 : 0);
        const newWrong = (p.wrongCount ?? 0) + (isCorrect ? 0 : 1);
        const newAnswered = (p.answeredCount ?? 0) + 1;
        const finishBonus = p.finishRank ? (state.settings.finishBonuses[p.finishRank - 1] ?? 0) : 0;
        const newScore = p.position + (newCorrect * 100) + finishBonus;
        return {
          ...p,
          selectedOptionId: command.optionId,
          answeredAt: Date.now(),
          answerState: isCorrect ? ("correct" as const) : ("wrong" as const),
          answeredCount: newAnswered,
          correctCount: newCorrect,
          wrongCount: newWrong,
          score: newScore,
        };
      });

      const humanPlayers = updatedPlayers.filter((p) => !p.isBot);
      const answeredHumans = humanPlayers.filter((p) => p.selectedOptionId !== null).length;
      const answeredTotal = updatedPlayers.filter((p) => p.selectedOptionId !== null).length;

      // Immediately grant roll rights to a student as soon as they answer correctly!
      const updatedRollQueue =
        isCorrect && !state.rollQueue.includes(command.playerId)
          ? [...state.rollQueue, command.playerId]
          : state.rollQueue;

      room.state = {
        ...state,
        gameStatus: "answering",
        players: updatedPlayers,
        rollQueue: updatedRollQueue,
        currentPlayerId: updatedRollQueue[0] ?? state.currentPlayerId,
        leaderboard: computeLeaderboard(updatedPlayers),
        lastEvent: isCorrect
          ? `PLAYER · ${player.name} ตอบถูก! (+100 คะแนน) ได้รับสิทธิ์ทอยลูกเต๋าทันที`
          : `PLAYER · ${player.name} ตอบผิด (${answeredTotal}/${updatedPlayers.length} คน)`,
        updatedAt: Date.now(),
      };

      // If all real players in the room have answered, automatically reveal answers for everyone!
      if (humanPlayers.length > 0 && answeredHumans >= humanPlayers.length) {
        const revealed = revealAnswersOnServer(room);
        return {
          room: revealed.room,
          publicState: toPublicGameState(revealed.room, command.playerId),
        };
      }

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
      if (state.rollQueue.length === 0) {
        return { error: "ไม่มีสิทธิ์ทอยลูกเต๋าในรอบนี้" };
      }

      const isPlayerInQueue = state.rollQueue.includes(command.playerId);
      if (!isPlayerInQueue && !options.isTeacherAuthenticated) {
        return {
          error: "คุณยังไม่มีสิทธิ์ทอยลูกเต๋าในรอบนี้ (ต้องตอบคำถามให้ถูกต้องก่อน)",
        };
      }

      // If a previous player's special event is still unresolved when the next roller rolls,
      // auto-resolve it so the 2nd/next roller is never blocked from rolling & seeing their animation!
      if (state.activeSpecialEvent && !state.activeSpecialEvent.resolved) {
        room.state = {
          ...state,
          activeSpecialEvent: {
            ...state.activeSpecialEvent,
            resolved: true,
          },
        };
      }

      const targetRollerId = isPlayerInQueue
        ? command.playerId
        : state.rollQueue[0];

      return performServerDiceRollAndMove(room, targetRollerId);
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
      const isQuestionStillOpen = Boolean(state.question && !state.question.revealed);
      room.state = {
        ...state,
        activeSpecialEvent: resolvedEvent,
        gameStatus: isQuestionStillOpen
          ? "answering"
          : nextQueue.length > 0
          ? "dice"
          : "reveal",
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

    case "RESET_ROOM": {
      room.state = {
        ...state,
        gameStatus: "lobby",
        round: 0,
        question: null,
        players: [],
        leaderboard: [],
        currentPlayerId: null,
        dice: { value: null, rolling: false, rolledBy: null, lastReason: null },
        activeSpecialEvent: null,
        movement: null,
        movingPlayerId: null,
        rollQueue: [],
        lastEvent: `SYSTEM · รีเซ็ตห้องเกม "${state.game.title}" พร้อมรับนักเรียนรอบใหม่ (PIN ${room.pin})`,
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

  const unrolledCorrectIds = state.players
    .filter((p) => (p.answerState === "correct" || p.bonusNextTurn) && p.lastRoll === null)
    .sort((a, b) => (a.answeredAt ?? Infinity) - (b.answeredAt ?? Infinity))
    .map((p) => p.id);

  // Preserve anyone already in rollQueue (e.g. bonus roll or not yet rolled) and append newly-correct unrolled players
  const queue = Array.from(new Set([...state.rollQueue, ...unrolledCorrectIds]));

  const updatedPlayers = state.players.map((p) => {
    const didNotAnswer = p.selectedOptionId === null;
    const newWrong = didNotAnswer ? (p.wrongCount ?? 0) + 1 : (p.wrongCount ?? 0);
    const newAnswered = didNotAnswer ? (p.answeredCount ?? 0) + 1 : (p.answeredCount ?? 0);
    return {
      ...p,
      wrongCount: newWrong,
      answeredCount: newAnswered,
      bonusNextTurn: false,
    };
  });

  // If another player is now in queue to roll, auto-resolve any earlier player's special event so it doesn't block them
  const resolvedSpecialEvent =
    state.activeSpecialEvent &&
    !state.activeSpecialEvent.resolved &&
    queue.length > 0 &&
    state.activeSpecialEvent.playerId !== queue[0]
      ? { ...state.activeSpecialEvent, resolved: true }
      : state.activeSpecialEvent;

  room.state = {
    ...state,
    gameStatus: queue.length > 0 ? "dice" : "reveal",
    currentPlayerId: queue[0] ?? null,
    question: { ...state.question, revealed: true, timeLeft: 0 },
    players: updatedPlayers,
    leaderboard: computeLeaderboard(updatedPlayers),
    rollQueue: queue,
    activeSpecialEvent: resolvedSpecialEvent,
    lastEvent:
      queue.length > 0
        ? `SYSTEM · เฉลยคำตอบ! มีผู้เล่นรอทอยลูกเต๋า ${queue.length} คน`
        : "SYSTEM · เฉลยคำตอบแล้ว",
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
  let hasShieldNow = player.shield ?? false;
  let gemPointsAwarded = 0;

  // 1. Check if snake was triggered but player possesses a SHIELD
  if (effect && effect.kind === "snake" && hasShieldNow) {
    hasShieldNow = false; // Shield used up to block snake!
    finalPos = landedPos; // Protected! Stays at landedPos!
    specialEvent = {
      id: `evt-${Date.now()}-${player.id}`,
      playerId: player.id,
      playerName: player.name,
      avatarId: player.avatarId,
      kind: "shield",
      from: landedPos,
      to: landedPos,
      title: "🛡️ เกราะป้องกันงูทำงาน!",
      description: `ตกหัวเจ้างูที่ช่อง ${landedPos} แต่โล่วิเศษสลายตัวรับแทน ทำให้ไม่ร่วงลงไป! ปลอดภัย!`,
      resolved: false,
      bonusRollGranted: false,
    };
  } else if (effect) {
    finalPos = effect.to;
    grantBonusRoll = effect.specialKind === "star";
    grantNextRoundBoost = effect.specialKind === "boost";
    if (effect.specialKind === "shield") {
      hasShieldNow = true;
    }
    if (effect.specialKind === "gem") {
      gemPointsAwarded = 50;
    }

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
    const correctPoints = (p.correctCount ?? 0) * 100;
    const newScore = finalPos + finishBonus + correctPoints + gemPointsAwarded;

    return {
      ...p,
      position: finalPos,
      score: newScore,
      lastRoll: diceValue,
      finishRank: newFinishRank,
      shield: hasShieldNow,
      snakesBitten: (p.snakesBitten ?? 0) + (effect?.kind === "snake" && !player.shield ? 1 : 0),
      laddersClimbed: (p.laddersClimbed ?? 0) + (effect?.kind === "ladder" ? 1 : 0),
      specialEventsTriggered:
        (p.specialEventsTriggered ?? 0) +
        (effect?.kind === "special" || (effect?.kind === "snake" && player.shield) ? 1 : 0),
      bonusNextTurn: grantNextRoundBoost ? true : p.bonusNextTurn,
    };
  });

  // Update Roll Queue: if STAR bonus roll was granted, player stays at front of rollQueue!
  const nextQueue = grantBonusRoll
    ? state.rollQueue
    : state.rollQueue.filter((id) => id !== player.id);

  const fullPath =
    effect && effect.to !== landedPos ? [...path, effect.to] : path;

  const isQuestionStillOpen = Boolean(state.question && !state.question.revealed);
  const nextStatus = specialEvent
    ? "special_event"
    : isQuestionStillOpen
    ? "answering"
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
