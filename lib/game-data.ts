import { BOARD_TOTAL, FINISH_AT } from "./board";
import type {
  Avatar,
  GameInfo,
  GameSettings,
  LadderLink,
  Player,
  Question,
  SnakeLink,
  SpecialCell,
} from "./types";

/* ------------------------------------------------------------------ *
 * Avatar roster — the single avatar set used everywhere
 * ------------------------------------------------------------------ */

export const AVATARS: Avatar[] = [
  { id: "fox", emoji: "🦊", label: "Fox", labelTh: "สุนัขจิ้งจอก", primary: "#fb923c", secondary: "#fff7ed", accent: "#c2410c", ring: "#fb923c" },
  { id: "panda", emoji: "🐼", label: "Panda", labelTh: "แพนด้า", primary: "#f1f5f9", secondary: "#1f2937", accent: "#111827", ring: "#94a3b8" },
  { id: "tiger", emoji: "🐯", label: "Tiger", labelTh: "เสือ", primary: "#f59e0b", secondary: "#fef3c7", accent: "#b45309", ring: "#f59e0b" },
  { id: "frog", emoji: "🐸", label: "Frog", labelTh: "กบ", primary: "#4ade80", secondary: "#dcfce7", accent: "#15803d", ring: "#4ade80" },
  { id: "cat", emoji: "🐱", label: "Cat", labelTh: "แมว", primary: "#a5b4fc", secondary: "#eef2ff", accent: "#4338ca", ring: "#a5b4fc" },
  { id: "bear", emoji: "🐻", label: "Bear", labelTh: "หมี", primary: "#d6a17a", secondary: "#fef3e2", accent: "#7c4a21", ring: "#d6a17a" },
  { id: "rabbit", emoji: "🐰", label: "Rabbit", labelTh: "กระต่าย", primary: "#fbcfe8", secondary: "#fdf2f8", accent: "#be185d", ring: "#fbcfe8" },
  { id: "penguin", emoji: "🐧", label: "Penguin", labelTh: "เพนกวิน", primary: "#38bdf8", secondary: "#f0f9ff", accent: "#075985", ring: "#38bdf8" },
  { id: "lion", emoji: "🦁", label: "Lion", labelTh: "สิงห์", primary: "#fbbf24", secondary: "#fef3c7", accent: "#92400e", ring: "#fbbf24" },
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
 * Board configuration — snakes send players DOWN, ladders send them UP
 * ------------------------------------------------------------------ */

export const SNAKES: SnakeLink[] = [
  { from: 98, to: 62 },
  { from: 84, to: 43 },
  { from: 65, to: 31 },
  { from: 47, to: 19 },
  { from: 36, to: 16 },
  { from: 77, to: 55 },
];

export const LADDERS: LadderLink[] = [
  { from: 7, to: 28 },
  { from: 21, to: 56 },
  { from: 43, to: 78 },
  { from: 61, to: 89 },
  { from: 14, to: 36 },
  { from: 33, to: 54 },
];

export const SPECIAL_CELLS: SpecialCell[] = [
  { at: 1, kind: "start", label: "START", emoji: "🚩", description: "จุดเริ่มต้นของทุกคน" },
  { at: 25, kind: "star", label: "BONUS", emoji: "⭐", description: "ช่องดาว — ได้สิทธิ์ทอยโบนัส" },
  { at: 50, kind: "gift", label: "GIFT", emoji: "🎁", description: "ช่องของขวัญ — โบนัสพิเศษ" },
  { at: 75, kind: "boost", label: "BOOST", emoji: "✨", description: "ช่องเร่ง — เดินต่อได้อีกครั้ง" },
  { at: BOARD_TOTAL, kind: "finish", label: "FINISH", emoji: "🏁", description: "เส้นชัย — คะแนนสูงสุด" },
];

/* ------------------------------------------------------------------ *
 * Game settings & room info
 * ------------------------------------------------------------------ */

export const GAME_SETTINGS: GameSettings = {
  maxPlayers: 40,
  questionTimeLimit: 15,
  diceMin: 1,
  diceMax: 6,
  finishBonuses: [3, 2, 1],
  scoreRule: "score = finalPosition (+ โบนัสเส้นชัย 3/2/1)",
};

export const MOCK_GAME: GameInfo = {
  id: "game-482913",
  pin: "482913",
  title: "ผจญภัยนักเรียนแห่งวิทยาลัย",
  subject: "วิทยาศาสตร์",
  grade: "มัธยมศึกษาปีที่ 6",
  hostName: "ครูณัฐวุฒิ (โก้)",
  school: "โรงเรียนสาธิตเทคโนโลยี",
};

/* ------------------------------------------------------------------ *
 * Questions
 * ------------------------------------------------------------------ */

const q = (
  id: string,
  subject: string,
  prompt: string,
  options: string[],
  correctIndex: number,
  explanation: string,
  hint?: string,
): Question => ({
  id,
  subject,
  prompt,
  hint,
  options: options.map((text, index) => ({
    id: `${id}-${String.fromCharCode(65 + index)}`,
    text,
  })),
  correctOptionId: `${id}-${String.fromCharCode(65 + correctIndex)}`,
  explanation,
});

export const QUESTIONS: Question[] = [
  q(
    "q1",
    "พลังงาน",
    "ข้อใดเป็นพลังงานทดแทน (พลังงานหมุนเวียน)?",
    ["ถ่านหิน", "น้ำมัน", "พลังงานแสงอาทิตย์", "ก๊าซธรรมชาติ"],
    2,
    "แสงอาทิตย์เป็นพลังงานที่เกิดขึ้นใหม่ได้เรื่อย ๆ จึงถือเป็นพลังงานทดแทน ส่วนถ่านหิน น้ำมัน และก๊าซธรรมชาติเป็นพลังงานฟอสซิลที่ใช้ไม่หมดในระยะสั้น",
  ),
  q(
    "q2",
    "ชีววิทยา",
    "อวัยวะใดของมนุษย์ทำหน้าที่สูบฉีดเลือดไปทั่วร่างกาย?",
    ["สมอง", "หัวใจ", "ปอด", "กระเพาะอาหาร"],
    1,
    "หัวใจทำงานเหมือนปั๊ม มีกล้ามเนื้อชั้นนอกหนาและกล้ามเนื้อชั้นในบาง ทำให้เลือดฉีดได้แรงตลอดทั้งร่างกาย",
  ),
  q(
    "q3",
    "เคมี",
    "สารใดมีค่า pH ต่ำกว่า 7 และเรียกว่าสารกรด?",
    ["น้ำบริสุทธิ์", "เลือด", "น้ำส้มสายชู", "น้ำเชื่อม"],
    2,
    "pH ต่ำกว่า 7 เป็นกรด น้ำส้มสายชูมีค่า pH ประมาณ 2–3 จึงมีรสเปรี้ยวและทำปฏิกิริยากับโลหะได้",
  ),
  q(
    "q4",
    "ฟิสิกส์",
    "กฎของนิวตันข้อใดเป็นคำตอบที่ถูกต้อง?",
    [
      "แรง = มวล × ความเร็ว",
      "แรง = มวล × ความเร่ง",
      "แรง = พลังงาน × เวลา",
      "แรง = งาน ÷ ระยะทาง",
    ],
    1,
    "F = m·a คือแรงเท่ากับมวลคูณความเร่ง ถ้ามวลคงที่ แรงจะแปรผันตามความเร่งของวัตถุ",
  ),
  q(
    "q5",
    "โลกศาสตร์",
    "เขตวัฒนาแผ่นดินของไทยตั้งอยู่ในเขตใด?",
    ["เขตร้อนชื้น", "เขตแห้ง", "เขตอบอุ่น", "เขตเย็นชื้น"],
    1,
    "ประเทศไทยตั้งอยู่ประมาณละติจูด 5°–20° เหนือ จึงอยู่ในเขตแห้ง มีฝนน้อยและฤดูแล้งยาวนาน",
  ),
  q(
    "q6",
    "คณิตศาสตร์",
    "ถ้า 3x + 7 = 22 ค่า x เท่ากับเท่าใด?",
    ["3", "5", "7", "9"],
    1,
    "3x + 7 = 22 → 3x = 15 → x = 5",
  ),
  q(
    "q7",
    "สุขศึกษา",
    "การนอนที่พอเพียงของวัยรุ่นควรนานเท่าใด?",
    ["4–5 ชั่วโมง", "6–7 ชั่วโมง", "8–10 ชั่วโมง", "11–12 ชั่วโมง"],
    2,
    "วัยรุ่นควรนอน 8–10 ชั่วโมงต่อวัน เพื่อให้สมองได้พักฟื้นและหลั่งโรงค์โทรโนนช่วงหลับ",
  ),
  q(
    "q8",
    "เทคโนโลยี",
    "ระบบใดทำหน้าที่จำแยกชื่อโดเมนของเว็บไซต์?",
    ["Router", "DNS", "Modem", "Firewall"],
    1,
    "DNS (Domain Name System) ทำหน้าที่แปลงชื่อโดเมน เช่น kn-snake.game ให้เป็นหมายเลข IP",
  ),
  q(
    "q9",
    "ดาราศาสตร์",
    "ดาวเคราะห์ดวงใดอยู่ใกล้โลกที่สุด?",
    ["ดาวศุกร์", "ดาวอังคาร", "ดาวพุธ", "ดาวศิลป์"],
    2,
    "ดาวพุธอยู่ห่างจากโลกประมาณ 77 ล้านกิโลเมตรในช่วงที่ใกล้โลกที่สุด จึงเรียกว่าเป็นดาวเคราะห์เพื่อนบ้าน",
  ),
  q(
    "q10",
    "วิทยาศาสตร์",
    "น้ำแข็งเปลี่ยนเป็นน้ำเรียกว่าการเปลี่ยนสถานะใด?",
    ["การระเหย", "การหลอมเหลว", "การแข็งตัว", "การควบแน่นตัว"],
    1,
    "ของแข็งเปลี่ยนเป็นของเหลวเรียกว่าการหลอมเหลว น้ำแข็งจึงหลอมเป็นน้ำในกระบวนการนี้",
  ),
];

/* ------------------------------------------------------------------ *
 * Mock players — 40 seats, deterministic so SSR and client match
 * ------------------------------------------------------------------ */

const NICKNAMES = [
  "Mew", "Bank", "Ton", "Film", "Nam", "Gun", "Bow", "Oat", "Mint", "Fern",
  "Bas", "Nan", "Peach", "Jay", "Top", "Ning", "Kao", "May", "Ploy", "Nam2",
  "Ink", "Puen", "Torch", "Beam", "Star", "Wave", "Cool", "Best", "Mark", "Free",
  "Ball", "Bank2", "Mook", "Nok", "Aom", "Pet", "Sang", "Fah", "Big", "Max",
];

const AVATAR_CYCLE: Avatar["id"][] = [
  "fox", "panda", "tiger", "frog", "cat", "bear", "rabbit", "penguin", "lion", "koala",
  "monkey", "dog",
];

export const MOCK_PLAYERS: Player[] = NICKNAMES.map((name, index) => {
  const avatarId = AVATAR_CYCLE[index % AVATAR_CYCLE.length];
  const position = index === 0 ? 0 : (index * 7 + 3) % 96;
  const isBot = index > 11;
  return {
    id: `p-${String(index + 1).padStart(2, "0")}`,
    name: index < 4 ? ["Mew", "Bank", "Ton", "Film"][index] : name,
    avatarId,
    position,
    score: position,
    isReady: index < 12,
    isHost: index === 0,
    isBot,
    answerState: "idle",
    selectedOptionId: null,
    lastRoll: null,
    finishRank: null,
  };
});

/* The student who is looking at the device right now */
export const VIEWER_PLAYER_ID = "p-02";

export const BOARD_CONFIG = {
  size: 10,
  total: BOARD_TOTAL,
  finishAt: FINISH_AT,
};
