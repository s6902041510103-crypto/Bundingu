import { BOARD_TOTAL, FINISH_AT } from "./board";
import type {
  Avatar,
  GameInfo,
  GameSettings,
  LadderLink,
  Player,
  Question,
  QuestionDifficulty,
  SnakeLink,
  SpecialCell,
} from "./types";

/* ------------------------------------------------------------------ *
 * Avatar roster — the single animal avatar set used everywhere
 * ------------------------------------------------------------------ */

export const AVATARS: Avatar[] = [
  { id: "fox", emoji: "🦊", label: "Fox", labelTh: "สุนัขจิ้งจอก", primary: "#fb923c", secondary: "#fff7ed", accent: "#c2410c", ring: "#fb923c" },
  { id: "panda", emoji: "🐼", label: "Panda", labelTh: "แพนด้า", primary: "#f1f5f9", secondary: "#334155", accent: "#0f172a", ring: "#94a3b8" },
  { id: "tiger", emoji: "🐯", label: "Tiger", labelTh: "เสือ", primary: "#f59e0b", secondary: "#fef3c7", accent: "#b45309", ring: "#f59e0b" },
  { id: "frog", emoji: "🐸", label: "Frog", labelTh: "กบ", primary: "#4ade80", secondary: "#dcfce7", accent: "#15803d", ring: "#4ade80" },
  { id: "cat", emoji: "🐱", label: "Cat", labelTh: "แมว", primary: "#a5b4fc", secondary: "#eef2ff", accent: "#4338ca", ring: "#a5b4fc" },
  { id: "bear", emoji: "🐻", label: "Bear", labelTh: "หมี", primary: "#d6a17a", secondary: "#fef3e2", accent: "#7c4a21", ring: "#d6a17a" },
  { id: "rabbit", emoji: "🐰", label: "Rabbit", labelTh: "กระต่าย", primary: "#fbcfe8", secondary: "#fdf2f8", accent: "#be185d", ring: "#fbcfe8" },
  { id: "penguin", emoji: "🐧", label: "Penguin", labelTh: "เพนกวิน", primary: "#38bdf8", secondary: "#f0f9ff", accent: "#075985", ring: "#38bdf8" },
  { id: "lion", emoji: "🦁", label: "Lion", labelTh: "สิงโต", primary: "#fbbf24", secondary: "#fef3c7", accent: "#92400e", ring: "#fbbf24" },
  { id: "koala", emoji: "🐨", label: "Koala", labelTh: "โคอาลา", primary: "#cbd5e1", secondary: "#f1f5f9", accent: "#475569", ring: "#cbd5e1" },
  { id: "monkey", emoji: "🐵", label: "Monkey", labelTh: "ลิง", primary: "#fdba74", secondary: "#fef3c7", accent: "#9a3412", ring: "#fdba74" },
  { id: "dog", emoji: "🐶", label: "Dog", labelTh: "สุนัข", primary: "#fcd34d", secondary: "#fffbeb", accent: "#a16207", ring: "#fcd34d" },
];

export const AVATAR_MAP: Record<string, Avatar> = Object.fromEntries(
  AVATARS.map((a) => [a.id, a]),
);

export function getAvatar(id: string): Avatar {
  return AVATAR_MAP[id] ?? AVATARS[0];
}

/* ------------------------------------------------------------------ *
 * Board configuration — exact 4 Snakes & 4 Ladders per specification
 * Snakes: 98→62, 84→43, 65→31, 47→19
 * Ladders: 7→28, 21→56, 43→78, 61→89
 * ------------------------------------------------------------------ */

export const SNAKES: SnakeLink[] = [
  { from: 98, to: 62 },
  { from: 84, to: 43 },
  { from: 65, to: 31 },
  { from: 47, to: 19 },
];

export const LADDERS: LadderLink[] = [
  { from: 7, to: 28 },
  { from: 21, to: 56 },
  { from: 43, to: 78 },
  { from: 61, to: 89 },
];

export const SPECIAL_CELLS: SpecialCell[] = [
  { at: 1, kind: "start", label: "START", emoji: "🚩", description: "จุดเริ่มต้นของทุกคน" },
  { at: 12, kind: "shield", label: "SHIELD", emoji: "🛡️", description: "โล่วิเศษ — ได้รับเกราะป้องกันการตกหัวงู 1 ครั้ง!" },
  { at: 25, kind: "star", label: "STAR", emoji: "⭐", description: "ช่องดาวโบนัส — ได้สิทธิ์ทอยลูกเต๋าเพิ่มอีก 1 ครั้งทันที!" },
  { at: 38, kind: "gem", label: "GEM", emoji: "💎", description: "อัญมณีมหัศจรรย์ — รับคะแนนโบนัสพิเศษ +50 คะแนน!" },
  { at: 50, kind: "gift", label: "GIFT", emoji: "🎁", description: "กล่องของขวัญนำโชค — ก้าวเดินหน้าเพิ่มทันที 3 ช่อง!" },
  { at: 60, kind: "magnet", label: "MAGNET", emoji: "🧲", description: "แม่เหล็กพลังสูง — ดูดตัวละครพุ่งไปหาบันไดช่อง 61 ทันที!" },
  { at: 75, kind: "rocket", label: "ROCKET", emoji: "🚀", description: "จรวดบูสเตอร์ — พุ่งทะยานไปข้างหน้า 5 ช่อง!" },
  { at: 88, kind: "boost", label: "BOOST", emoji: "⚡", description: "สายฟ้าพลังงาน — ได้รับสิทธิ์ทอยลูกเต๋าในรอบถัดไปทันที!" },
  { at: BOARD_TOTAL, kind: "finish", label: "FINISH", emoji: "🏁", description: "เส้นชัย — พิชิตช่องที่ 100 สำเร็จ!" },
];

/* ------------------------------------------------------------------ *
 * Game settings & room info
 * ------------------------------------------------------------------ */

export const GAME_SETTINGS: GameSettings = {
  maxPlayers: 40,
  questionTimeLimit: 20,
  diceMin: 1,
  diceMax: 6,
  finishBonuses: [3, 2, 1],
  scoreRule: "score = finalPosition (+ โบนัสเส้นชัย 3/2/1)",
};

export const MOCK_GAME: GameInfo = {
  id: "game-KS4829",
  pin: "KS4829",
  title: "Math Challenge",
  subject: "คณิตศาสตร์",
  grade: "มัธยมศึกษาปีที่ 1",
  hostName: "ครูสมชาย ใจดี",
  school: "โรงเรียนสาธิตพิชิตความรู้",
  createdAt: Date.now() - 1800000,
};

export const SUBJECTS = [
  "คณิตศาสตร์",
  "วิทยาศาสตร์",
  "สังคมศึกษา",
  "ประวัติศาสตร์",
  "ภาษาอังกฤษ",
  "เทคโนโลยี",
] as const;

export const QUESTION_SETS = [
  { id: "set-all", label: "รวมทุกหมวดหมู่ (All Subjects)", subject: "ทั้งหมด" },
  { id: "set-math", label: "คณิตศาสตร์ ม.1 (Math Challenge)", subject: "คณิตศาสตร์" },
  { id: "set-science", label: "วิทยาศาสตร์พื้นฐาน (Science Quiz)", subject: "วิทยาศาสตร์" },
  { id: "set-social", label: "สังคมศึกษาและอาเซียน (Social Studies)", subject: "สังคมศึกษา" },
  { id: "set-history", label: "ประวัติศาสตร์ไทย (History Fun)", subject: "ประวัติศาสตร์" },
  { id: "set-english", label: "ภาษาอังกฤษเพื่อการสื่อสาร (English Test)", subject: "ภาษาอังกฤษ" },
  { id: "set-tech", label: "วิทยาการคำนวณและเทคโนโลยี (Tech Quiz)", subject: "เทคโนโลยี" },
];

/* ------------------------------------------------------------------ *
 * Initial Question Bank
 * ------------------------------------------------------------------ */

const q = (
  id: string,
  subject: string,
  prompt: string,
  options: string[],
  correctIndex: number,
  explanation: string,
  difficulty: QuestionDifficulty = "medium",
  hint?: string,
): Question => ({
  id,
  subject,
  prompt,
  hint,
  difficulty,
  options: options.map((text, index) => ({
    id: `${id}-${String.fromCharCode(65 + index)}`,
    text,
  })),
  correctOptionId: `${id}-${String.fromCharCode(65 + correctIndex)}`,
  explanation,
  createdAt: 1760000000000,
});

export const QUESTIONS: Question[] = [
  q(
    "q1",
    "สังคมศึกษา",
    "ประเทศไทยมีอาณาเขตติดต่อกับประเทศใดบ้างทางทิศใต้?",
    ["มาเลเซีย", "สิงคโปร์", "อินโดนีเซีย", "ฟิลิปปินส์"],
    0,
    "ทิศใต้ของประเทศไทยมีพรมแดนทางบกติดต่อกับประเทศมาเลเซีย",
    "easy",
  ),
  q(
    "q2",
    "คณิตศาสตร์",
    "ผลลัพธ์ของ 12 × 8 เท่ากับเท่าไร?",
    ["86", "92", "96", "104"],
    2,
    "12 × 8 = (10 × 8) + (2 × 8) = 80 + 16 = 96",
    "medium",
  ),
  q(
    "q3",
    "วิทยาศาสตร์",
    "ข้อใดไม่ใช่สมบัติของธาตุโลหะ?",
    ["นำไฟฟ้าได้ดี", "นำความร้อนได้ดี", "เปราะและแตกหักง่าย", "มีความมันวาว"],
    2,
    "สมบัติที่เปราะและแตกหักง่ายเป็นสมบัติของอโลหะ ส่วนโลหะสามารถตีเป็นแผ่นหรือดึงเป็นเส้นได้",
    "hard",
  ),
  q(
    "q4",
    "ประวัติศาสตร์",
    "เหตุการณ์ใดเกิดขึ้นในปี พ.ศ. 2475?",
    [
      "การเลิกทาสในสมัยรัชกาลที่ 5",
      "การเปลี่ยนแปลงการปกครองเป็นระบอบประชาธิปไตย",
      "การสถาปนากรุงรัตนโกสินทร์",
      "สงครามโลกครั้งที่ 1 สิ้นสุดลง",
    ],
    1,
    "วันที่ 24 มิถุนายน พ.ศ. 2475 เป็นวันเปลี่ยนแปลงการปกครองของสยามเข้าสู่ระบอบประชาธิปไตย",
    "medium",
  ),
  q(
    "q5",
    "คณิตศาสตร์",
    "ถ้า 3x + 7 = 22 ค่า x เท่ากับเท่าใด?",
    ["3", "5", "7", "9"],
    1,
    "3x + 7 = 22 → 3x = 15 → x = 5",
    "medium",
  ),
  q(
    "q6",
    "วิทยาศาสตร์",
    "ข้อใดเป็นพลังงานทดแทน (พลังงานหมุนเวียน)?",
    ["ถ่านหิน", "น้ำมันดิบ", "พลังงานแสงอาทิตย์", "ก๊าซธรรมชาติ"],
    2,
    "แสงอาทิตย์เป็นพลังงานหมุนเวียนที่เกิดขึ้นใหม่อย่างต่อเนื่อง ส่วนถ่านหิน น้ำมัน และก๊าซธรรมชาติเป็นเชื้อเพลิงฟอสซิล",
    "easy",
  ),
  q(
    "q7",
    "วิทยาศาสตร์",
    "อวัยวะใดของมนุษย์ทำหน้าที่สูบฉีดเลือดไปเลี้ยงทั่วร่างกาย?",
    ["สมอง", "หัวใจ", "ปอด", "กระเพาะอาหาร"],
    1,
    "หัวใจทำหน้าที่สูบฉีดเลือดผ่านระบบไหลเวียนโลหิตไปทั่วร่างกาย",
    "easy",
  ),
  q(
    "q8",
    "วิทยาศาสตร์",
    "สารในข้อใดมีค่า pH ต่ำกว่า 7 และมีสมบัติเป็นกรด?",
    ["น้ำบริสุทธิ์", "สบู่เหลว", "น้ำส้มสายชู", "ผงซักฟอก"],
    2,
    "สารละลายที่มีค่า pH ต่ำกว่า 7 มีสมบัติเป็นกรด น้ำส้มสายชูมีกรดอะซิติกจึงมีค่า pH ประมาณ 2.5–3",
    "medium",
  ),
  q(
    "q9",
    "เทคโนโลยี",
    "ระบบใดทำหน้าที่แปลงชื่อโดเมนเว็บไซต์ให้เป็นหมายเลข IP Address?",
    ["Router", "DNS", "Modem", "Firewall"],
    1,
    "DNS (Domain Name System) ทำหน้าที่แปลงชื่อโดเมน เช่น knowledge-snake.game ให้เป็นหมายเลข IP",
    "medium",
  ),
  q(
    "q10",
    "ภาษาอังกฤษ",
    "Choose the correct form: 'She ____ to school every morning.'",
    ["go", "goes", "going", "gone"],
    1,
    "ประธานเอกพจน์บุรุษที่ 3 (She) ใน Present Simple Tense กริยาต้องเติม -es จึงใช้ goes",
    "easy",
  ),
  q(
    "q11",
    "คณิตศาสตร์",
    "รูปสามเหลี่ยมที่มีฐานยาว 10 ซม. และสูง 6 ซม. มีพื้นที่กี่ตารางเซนติเมตร?",
    ["20 ตร.ซม.", "30 ตร.ซม.", "40 ตร.ซม.", "60 ตร.ซม."],
    1,
    "พื้นที่สามเหลี่ยม = 1/2 × ฐาน × สูง = 1/2 × 10 × 6 = 30 ตารางเซนติเมตร",
    "easy",
  ),
  q(
    "q12",
    "สังคมศึกษา",
    "ประชาคมอาเซียน (ASEAN) มีประเทศสมาชิกก่อตั้งในยุคแรกกี่ประเทศ?",
    ["5 ประเทศ", "7 ประเทศ", "10 ประเทศ", "11 ประเทศ"],
    0,
    "อาเซียนก่อตั้งขึ้นในปี พ.ศ. 2510 โดย 5 ประเทศผู้ก่อตั้ง ได้แก่ ไทย มาเลเซีย สิงคโปร์ อินโดนีเซีย และฟิลิปปินส์",
    "hard",
  ),
];

/* ------------------------------------------------------------------ *
 * Initial Players for default room 123456
 * ------------------------------------------------------------------ */

const INITIAL_ROOM_PLAYERS: Array<{
  name: string;
  avatarId: Avatar["id"];
  position: number;
  score: number;
  laddersClimbed: number;
  snakesBitten: number;
  correctCount: number;
  answeredCount: number;
}> = [
  { name: "Panda", avatarId: "panda", position: 68, score: 68, laddersClimbed: 2, snakesBitten: 0, correctCount: 4, answeredCount: 5 },
  { name: "Tiger", avatarId: "tiger", position: 56, score: 56, laddersClimbed: 1, snakesBitten: 1, correctCount: 3, answeredCount: 5 },
  { name: "Lion", avatarId: "lion", position: 48, score: 48, laddersClimbed: 1, snakesBitten: 0, correctCount: 3, answeredCount: 5 },
  { name: "Cat", avatarId: "cat", position: 39, score: 39, laddersClimbed: 1, snakesBitten: 1, correctCount: 2, answeredCount: 5 },
  { name: "Bear", avatarId: "bear", position: 28, score: 28, laddersClimbed: 1, snakesBitten: 1, correctCount: 2, answeredCount: 5 },
  { name: "Rabbit", avatarId: "rabbit", position: 22, score: 22, laddersClimbed: 0, snakesBitten: 0, correctCount: 2, answeredCount: 5 },
  { name: "Penguin", avatarId: "penguin", position: 15, score: 15, laddersClimbed: 0, snakesBitten: 1, correctCount: 1, answeredCount: 5 },
  { name: "Fox", avatarId: "fox", position: 12, score: 12, laddersClimbed: 0, snakesBitten: 0, correctCount: 1, answeredCount: 5 },
];

export const MOCK_PLAYERS: Player[] = INITIAL_ROOM_PLAYERS.map((item, index) => ({
  id: `p-${String(index + 1).padStart(2, "0")}`,
  name: item.name,
  avatarId: item.avatarId,
  position: item.position,
  score: item.score,
  isReady: true,
  isHost: false,
  isBot: false,
  answerState: "idle",
  selectedOptionId: null,
  lastRoll: null,
  finishRank: null,
  correctCount: item.correctCount,
  answeredCount: item.answeredCount,
  laddersClimbed: item.laddersClimbed,
  snakesBitten: item.snakesBitten,
  specialEventsTriggered: 0,
  connected: true,
}));

/* The student who is looking at the device right now (fallback) */
export const VIEWER_PLAYER_ID = "p-01";

export const BOARD_CONFIG = {
  size: 10,
  total: BOARD_TOTAL,
  finishAt: FINISH_AT,
};
