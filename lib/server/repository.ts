import fs from "fs";
import path from "path";
import crypto from "crypto";
import { QUESTIONS, MOCK_PLAYERS } from "../game-data";
import type {
  AvatarId,
  GameHistoryRecord,
  PlayerReportRow,
  Question,
  QuestionDifficulty,
} from "../types";

export interface TeacherSession {
  token: string;
  teacherId: string;
  email: string;
  name: string;
  school: string;
  createdAt: number;
  expiresAt: number;
}

export interface StorageSchema {
  questions: Question[];
  history: GameHistoryRecord[];
  sessions: TeacherSession[];
}

export interface StorageAdapter {
  read(): StorageSchema;
  write(data: StorageSchema): void;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

function buildInitialHistory(): GameHistoryRecord[] {
  const sampleResults: PlayerReportRow[] = [
    {
      rank: 1,
      playerId: "p-01",
      name: "Panda",
      avatarId: "panda",
      score: 103,
      position: 100,
      isFinished: true,
      finishRank: 1,
      finishBonus: 3,
      laddersClimbed: 2,
      snakesBitten: 0,
      correctCount: 4,
      answeredCount: 5,
      accuracyPercent: 80,
    },
    {
      rank: 2,
      playerId: "p-02",
      name: "Tiger",
      avatarId: "tiger",
      score: 86,
      position: 86,
      isFinished: false,
      finishRank: null,
      finishBonus: 0,
      laddersClimbed: 3,
      snakesBitten: 1,
      correctCount: 4,
      answeredCount: 5,
      accuracyPercent: 80,
    },
    {
      rank: 3,
      playerId: "p-03",
      name: "Lion",
      avatarId: "lion",
      score: 76,
      position: 76,
      isFinished: false,
      finishRank: null,
      finishBonus: 0,
      laddersClimbed: 2,
      snakesBitten: 1,
      correctCount: 3,
      answeredCount: 5,
      accuracyPercent: 60,
    },
    {
      rank: 4,
      playerId: "p-04",
      name: "Cat",
      avatarId: "cat",
      score: 69,
      position: 69,
      isFinished: false,
      finishRank: null,
      finishBonus: 0,
      laddersClimbed: 1,
      snakesBitten: 1,
      correctCount: 3,
      answeredCount: 5,
      accuracyPercent: 60,
    },
    {
      rank: 5,
      playerId: "p-05",
      name: "Bear",
      avatarId: "bear",
      score: 62,
      position: 62,
      isFinished: false,
      finishRank: null,
      finishBonus: 0,
      laddersClimbed: 1,
      snakesBitten: 2,
      correctCount: 2,
      answeredCount: 5,
      accuracyPercent: 40,
    },
  ];

  return [
    {
      id: "hist-123456",
      pin: "123456",
      title: "Math Challenge",
      subject: "คณิตศาสตร์",
      grade: "มัธยมศึกษาปีที่ 1",
      hostName: "ครูสมชาย ใจดี",
      createdAt: Date.now() - 3600000 * 2,
      finishedAt: null,
      status: "playing",
      totalRounds: 5,
      roundsPlayed: 2,
      questionTimeLimit: 30,
      playersCount: MOCK_PLAYERS.length,
      maxPlayers: 40,
      winnerName: "Panda",
      winnerAvatarId: "panda",
      winnerScore: 68,
      playerResults: MOCK_PLAYERS.map((p, idx) => ({
        rank: idx + 1,
        playerId: p.id,
        name: p.name,
        avatarId: p.avatarId,
        score: p.score,
        position: p.position,
        isFinished: Boolean(p.finishRank),
        finishRank: p.finishRank,
        finishBonus: 0,
        laddersClimbed: p.laddersClimbed ?? 0,
        snakesBitten: p.snakesBitten ?? 0,
        correctCount: p.correctCount ?? 0,
        answeredCount: p.answeredCount ?? 0,
        accuracyPercent:
          (p.answeredCount ?? 0) > 0
            ? Math.round(((p.correctCount ?? 0) / (p.answeredCount ?? 1)) * 100)
            : null,
      })),
    },
    {
      id: "hist-654321",
      pin: "654321",
      title: "Science Quiz",
      subject: "วิทยาศาสตร์",
      grade: "มัธยมศึกษาปีที่ 2",
      hostName: "ครูสมชาย ใจดี",
      createdAt: Date.now() - 86400000,
      finishedAt: Date.now() - 84600000,
      status: "completed",
      totalRounds: 5,
      roundsPlayed: 5,
      questionTimeLimit: 20,
      playersCount: 18,
      maxPlayers: 40,
      winnerName: "Panda",
      winnerAvatarId: "panda",
      winnerScore: 103,
      playerResults: sampleResults,
    },
    {
      id: "hist-987654",
      pin: "987654",
      title: "History Fun",
      subject: "ประวัติศาสตร์",
      grade: "มัธยมศึกษาปีที่ 3",
      hostName: "ครูสมชาย ใจดี",
      createdAt: Date.now() - 86400000 * 2,
      finishedAt: Date.now() - 86400000 * 2 + 1800000,
      status: "completed",
      totalRounds: 5,
      roundsPlayed: 5,
      questionTimeLimit: 20,
      playersCount: 15,
      maxPlayers: 40,
      winnerName: "Tiger",
      winnerAvatarId: "tiger",
      winnerScore: 98,
      playerResults: sampleResults.map((r, i) =>
        i === 0
          ? { ...sampleResults[1], rank: 1, score: 98, position: 98, isFinished: false, finishRank: null, finishBonus: 0 }
          : i === 1
          ? { ...sampleResults[0], rank: 2, score: 91, position: 91, isFinished: false, finishRank: null, finishBonus: 0 }
          : r,
      ),
    },
  ];
}

class FileStorageAdapter implements StorageAdapter {
  private memoryFallback: StorageSchema | null = null;

  private ensureInitial(): StorageSchema {
    if (this.memoryFallback) return this.memoryFallback;
    const initial: StorageSchema = {
      questions: QUESTIONS.map((q) => ({ ...q })),
      history: buildInitialHistory(),
      sessions: [],
    };
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
        this.memoryFallback = initial;
        return initial;
      }
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw) as StorageSchema;
      if (!Array.isArray(parsed.questions) || !Array.isArray(parsed.history)) {
        this.memoryFallback = initial;
        return initial;
      }
      this.memoryFallback = parsed;
      return parsed;
    } catch {
      this.memoryFallback = initial;
      return initial;
    }
  }

  read(): StorageSchema {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        const parsed = JSON.parse(raw) as StorageSchema;
        this.memoryFallback = parsed;
        return parsed;
      }
    } catch {
      // fallback to memory
    }
    return this.ensureInitial();
  }

  write(data: StorageSchema): void {
    this.memoryFallback = data;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch {
      // In read-only serverless environments, memoryFallback persists for the instance lifetime
    }
  }
}

const globalForRepo = globalThis as unknown as {
  __ksStorageAdapter?: StorageAdapter;
};

export function getStorageAdapter(): StorageAdapter {
  if (!globalForRepo.__ksStorageAdapter) {
    globalForRepo.__ksStorageAdapter = new FileStorageAdapter();
  }
  return globalForRepo.__ksStorageAdapter;
}

/* ------------------------------------------------------------------ *
 * Question Repository
 * ------------------------------------------------------------------ */

export interface QuestionInput {
  prompt: string;
  subject: string;
  difficulty?: QuestionDifficulty;
  options: [string, string, string, string] | string[];
  correctIndex: number;
  explanation?: string;
  hint?: string;
}

export function validateQuestionInput(input: QuestionInput): string | null {
  if (!input.prompt || input.prompt.trim().length < 3) {
    return "กรุณาระบุข้อความคำถามอย่างน้อย 3 ตัวอักษร";
  }
  if (!input.subject || !input.subject.trim()) {
    return "กรุณาเลือกรายวิชา";
  }
  if (!Array.isArray(input.options) || input.options.length !== 4) {
    return "คำถามต้องมีตัวเลือกครบ 4 ข้อ";
  }
  for (let i = 0; i < 4; i++) {
    if (!input.options[i] || !input.options[i].trim()) {
      return `กรุณาระบุข้อความตัวเลือกข้อ ${String.fromCharCode(65 + i)}`;
    }
  }
  if (
    typeof input.correctIndex !== "number" ||
    input.correctIndex < 0 ||
    input.correctIndex > 3
  ) {
    return "กรุณาเลือกคำตอบที่ถูกต้อง (A, B, C หรือ D)";
  }
  return null;
}

export function listQuestions(filters?: {
  subject?: string;
  difficulty?: string;
  search?: string;
}): Question[] {
  const store = getStorageAdapter().read();
  let items = [...store.questions];

  if (filters?.subject && filters.subject !== "ทั้งหมด" && filters.subject !== "all") {
    items = items.filter((q) => q.subject === filters.subject);
  }
  if (filters?.difficulty && filters.difficulty !== "all" && filters.difficulty !== "ทั้งหมด") {
    items = items.filter((q) => (q.difficulty ?? "medium") === filters.difficulty);
  }
  if (filters?.search && filters.search.trim()) {
    const qLower = filters.search.trim().toLowerCase();
    items = items.filter(
      (q) =>
        q.prompt.toLowerCase().includes(qLower) ||
        q.subject.toLowerCase().includes(qLower) ||
        q.options.some((o) => o.text.toLowerCase().includes(qLower)),
    );
  }

  return items;
}

export function createQuestionRecord(input: QuestionInput): {
  question?: Question;
  error?: string;
} {
  const validationError = validateQuestionInput(input);
  if (validationError) return { error: validationError };

  const adapter = getStorageAdapter();
  const store = adapter.read();
  const id = `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const newQuestion: Question = {
    id,
    prompt: input.prompt.trim(),
    subject: input.subject.trim(),
    difficulty: input.difficulty ?? "medium",
    options: input.options.slice(0, 4).map((text, idx) => ({
      id: `${id}-${String.fromCharCode(65 + idx)}`,
      text: text.trim(),
    })),
    correctOptionId: `${id}-${String.fromCharCode(65 + input.correctIndex)}`,
    explanation: input.explanation?.trim() || "",
    hint: input.hint?.trim() || undefined,
    createdAt: Date.now(),
  };

  store.questions = [newQuestion, ...store.questions];
  adapter.write(store);
  return { question: newQuestion };
}

export function updateQuestionRecord(
  id: string,
  input: QuestionInput,
): { question?: Question; error?: string } {
  const validationError = validateQuestionInput(input);
  if (validationError) return { error: validationError };

  const adapter = getStorageAdapter();
  const store = adapter.read();
  const index = store.questions.findIndex((q) => q.id === id);
  if (index === -1) {
    return { error: "ไม่พบคำถามที่ต้องการแก้ไข" };
  }

  const updated: Question = {
    ...store.questions[index],
    prompt: input.prompt.trim(),
    subject: input.subject.trim(),
    difficulty: input.difficulty ?? store.questions[index].difficulty ?? "medium",
    options: input.options.slice(0, 4).map((text, idx) => ({
      id: `${id}-${String.fromCharCode(65 + idx)}`,
      text: text.trim(),
    })),
    correctOptionId: `${id}-${String.fromCharCode(65 + input.correctIndex)}`,
    explanation: input.explanation?.trim() ?? "",
    hint: input.hint?.trim() || undefined,
  };

  store.questions[index] = updated;
  adapter.write(store);
  return { question: updated };
}

export function deleteQuestionRecord(id: string): { deleted: boolean; error?: string } {
  const adapter = getStorageAdapter();
  const store = adapter.read();
  const before = store.questions.length;
  store.questions = store.questions.filter((q) => q.id !== id);
  if (store.questions.length === before) {
    return { deleted: false, error: "ไม่พบคำถามที่ต้องการลบ" };
  }
  adapter.write(store);
  return { deleted: true };
}

/* ------------------------------------------------------------------ *
 * History & Reports Repository
 * ------------------------------------------------------------------ */

export function listGameHistory(): GameHistoryRecord[] {
  const store = getStorageAdapter().read();
  return [...store.history].sort((a, b) => b.createdAt - a.createdAt);
}

export function getGameHistoryByPinOrId(pinOrId: string): GameHistoryRecord | null {
  const store = getStorageAdapter().read();
  return (
    store.history.find((h) => h.pin === pinOrId || h.id === pinOrId) ?? null
  );
}

export function upsertGameHistory(record: GameHistoryRecord): void {
  const adapter = getStorageAdapter();
  const store = adapter.read();
  const idx = store.history.findIndex(
    (h) => h.pin === record.pin || h.id === record.id,
  );
  if (idx >= 0) {
    store.history[idx] = record;
  } else {
    store.history = [record, ...store.history];
  }
  adapter.write(store);
}

/* ------------------------------------------------------------------ *
 * Teacher Session & Server Auth Verification
 * ------------------------------------------------------------------ */

export function createTeacherSession(email: string, name?: string): TeacherSession {
  const adapter = getStorageAdapter();
  const store = adapter.read();
  const token = crypto.randomBytes(24).toString("hex");
  const cleanEmail = email.trim().toLowerCase();
  const displayName =
    name?.trim() ||
    (cleanEmail.startsWith("somchai") || cleanEmail.startsWith("teacher")
      ? "ครูสมชาย ใจดี"
      : `ครู${cleanEmail.split("@")[0]}`);

  const session: TeacherSession = {
    token,
    teacherId: `teacher-${crypto.createHash("sha256").update(cleanEmail).digest("hex").slice(0, 10)}`,
    email: cleanEmail,
    name: displayName,
    school: "โรงเรียนสาธิตพิชิตความรู้",
    createdAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };

  store.sessions = [
    session,
    ...store.sessions.filter((s) => s.expiresAt > Date.now()).slice(0, 50),
  ];
  adapter.write(store);
  return session;
}

export function verifyTeacherSessionToken(token?: string | null): TeacherSession | null {
  if (!token) return null;
  const store = getStorageAdapter().read();
  const found = store.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
  return found ?? null;
}
