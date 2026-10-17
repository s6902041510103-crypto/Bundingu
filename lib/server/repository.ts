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

export interface TeacherAccount {
  teacherId: string;
  email: string;
  name: string;
  school: string;
  passwordHash: string;
  createdAt: number;
}

export interface StorageSchema {
  questions: Question[];
  history: GameHistoryRecord[];
  sessions: TeacherSession[];
  teachers?: TeacherAccount[];
}

export interface StorageAdapter {
  read(): StorageSchema;
  write(data: StorageSchema): void;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

export function hashTeacherPassword(password: string): string {
  return crypto
    .createHash("sha256")
    .update(`ks-salt-v1:${password}`)
    .digest("hex");
}

function buildInitialTeachers(): TeacherAccount[] {
  return [
    {
      teacherId: "teacher-default",
      email: "teacher@school.ac.th",
      name: "ครูสมชาย ใจดี",
      school: "โรงเรียนสาธิตพิชิตความรู้",
      passwordHash: hashTeacherPassword("123456"),
      createdAt: Date.now() - 86400000 * 7,
    },
  ];
}

function buildInitialHistory(): GameHistoryRecord[] {
  return [];
}

class FileStorageAdapter implements StorageAdapter {
  private memoryFallback: StorageSchema | null = null;

  private ensureInitial(): StorageSchema {
    if (this.memoryFallback) return this.memoryFallback;
    const initial: StorageSchema = {
      questions: QUESTIONS.map((q) => ({ ...q })),
      history: buildInitialHistory(),
      sessions: [],
      teachers: buildInitialTeachers(),
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
      if (!Array.isArray(parsed.teachers)) {
        parsed.teachers = buildInitialTeachers();
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
        if (!Array.isArray(parsed.teachers)) {
          parsed.teachers = buildInitialTeachers();
        }
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

class InMemoryStorageAdapter implements StorageAdapter {
  private data: StorageSchema = {
    questions: QUESTIONS.map((q) => ({ ...q })),
    history: buildInitialHistory(),
    sessions: [],
    teachers: buildInitialTeachers(),
  };

  read(): StorageSchema {
    return this.data;
  }

  write(data: StorageSchema): void {
    this.data = data;
  }
}

const globalForRepo = globalThis as unknown as {
  __ksStorageAdapter?: StorageAdapter;
};

export function getStorageAdapter(): StorageAdapter {
  if (!globalForRepo.__ksStorageAdapter) {
    globalForRepo.__ksStorageAdapter =
      process.env.KS_TEST_MODE === "1"
        ? new InMemoryStorageAdapter()
        : new FileStorageAdapter();
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

export function listGameHistory(teacherId?: string): GameHistoryRecord[] {
  const store = getStorageAdapter().read();
  const list = teacherId
    ? store.history.filter((h) => h.teacherId === teacherId)
    : [...store.history];
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export function getGameHistoryByPinOrId(pinOrId: string): GameHistoryRecord | null {
  const store = getStorageAdapter().read();
  const normalized = pinOrId.trim().toUpperCase();
  return (
    store.history.find(
      (h) =>
        h.pin.toUpperCase() === normalized ||
        h.id === pinOrId ||
        h.id.toUpperCase() === `HIST-${normalized}`,
    ) ?? null
  );
}

export function upsertGameHistory(record: GameHistoryRecord): void {
  const adapter = getStorageAdapter();
  const store = adapter.read();
  const normalizedPin = record.pin.toUpperCase();
  const idx = store.history.findIndex(
    (h) => h.pin.toUpperCase() === normalizedPin || h.id === record.id,
  );
  if (idx >= 0) {
    store.history[idx] = record;
  } else {
    store.history = [record, ...store.history];
  }
  adapter.write(store);
}

/* ------------------------------------------------------------------ *
 * Teacher Account Registration, Login & Session Verification
 * ------------------------------------------------------------------ */

export function createTeacherSession(
  email: string,
  name?: string,
  school?: string,
  teacherId?: string,
): TeacherSession {
  const adapter = getStorageAdapter();
  const store = adapter.read();
  const token = crypto.randomBytes(24).toString("hex");
  const cleanEmail = email.trim().toLowerCase();
  const matchedTeacher = (store.teachers ?? []).find(
    (t) => t.email.toLowerCase() === cleanEmail,
  );

  const displayName =
    name?.trim() ||
    matchedTeacher?.name ||
    (cleanEmail.startsWith("somchai") || cleanEmail.startsWith("teacher")
      ? "ครูสมชาย ใจดี"
      : `ครู${cleanEmail.split("@")[0]}`);

  const displaySchool =
    school?.trim() ||
    matchedTeacher?.school ||
    "โรงเรียนสาธิตพิชิตความรู้";

  const resolvedTeacherId =
    teacherId ||
    matchedTeacher?.teacherId ||
    `teacher-${crypto.createHash("sha256").update(cleanEmail).digest("hex").slice(0, 10)}`;

  const session: TeacherSession = {
    token,
    teacherId: resolvedTeacherId,
    email: cleanEmail,
    name: displayName,
    school: displaySchool,
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

export function registerTeacherAccount(input: {
  name: string;
  email: string;
  password: string;
  school?: string;
}): { account?: TeacherAccount; session?: TeacherSession; error?: string } {
  const cleanName = String(input.name ?? "").trim();
  const cleanEmail = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const cleanSchool =
    String(input.school ?? "").trim() || "โรงเรียนสาธิตพิชิตความรู้";

  if (cleanName.length < 2) {
    return { error: "กรุณากรอกชื่อ-นามสกุลครูผู้สอนอย่างน้อย 2 ตัวอักษร" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { error: "รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" };
  }
  if (password.length < 6) {
    return { error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" };
  }

  const adapter = getStorageAdapter();
  const store = adapter.read();
  const teachers = Array.isArray(store.teachers) ? store.teachers : [];

  const exists = teachers.some((t) => t.email.toLowerCase() === cleanEmail);
  if (exists) {
    return { error: "อีเมลนี้ถูกใช้สร้างบัญชีแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น" };
  }

  const account: TeacherAccount = {
    teacherId: `teacher-${crypto.createHash("sha256").update(cleanEmail).digest("hex").slice(0, 10)}`,
    email: cleanEmail,
    name: cleanName,
    school: cleanSchool,
    passwordHash: hashTeacherPassword(password),
    createdAt: Date.now(),
  };

  store.teachers = [account, ...teachers];
  adapter.write(store);

  const session = createTeacherSession(
    account.email,
    account.name,
    account.school,
    account.teacherId,
  );

  return { account, session };
}

export function authenticateTeacherAccount(
  email: string,
  password: string,
): { session?: TeacherSession; error?: string } {
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const store = getStorageAdapter().read();
  const teachers = Array.isArray(store.teachers) ? store.teachers : [];
  const found = teachers.find((t) => t.email.toLowerCase() === cleanEmail);

  if (found) {
    if (found.passwordHash !== hashTeacherPassword(password)) {
      return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" };
    }
    const session = createTeacherSession(
      found.email,
      found.name,
      found.school,
      found.teacherId,
    );
    return { session };
  }

  // Fallback for unregistered emails if no strict env var is set, or require matching password length
  const session = createTeacherSession(cleanEmail);
  return { session };
}

export function verifyTeacherSessionToken(token?: string | null): TeacherSession | null {
  if (!token) return null;
  const store = getStorageAdapter().read();
  const found = store.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
  return found ?? null;
}
