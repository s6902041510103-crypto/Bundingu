# 🐍 Knowledge Snake (เกมบันไดงูพิชิตความรู้)

> เว็บแอปพลิเคชันเกมกระดานการศึกษาแบบ Real-time รองรับผู้เล่นพร้อมกันในห้องเรียน สำหรับครูและนักเรียน โดยใช้กฎบันไดงูคลาสสิก 100 ช่อง ผสานกับการตอบคำถามความรู้รอบตัวและระบบโบนัสการเข้าห้องเร็ว

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase Realtime](https://img.shields.io/badge/Supabase-Realtime-emerald?style=flat&logo=supabase)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

---

## 🌟 จุดเด่นของระบบ (Key Features)

### 1. สถาปัตยกรรม Server-Authoritative แบบ 100%
- **Logic & RNG อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น**: การเดินหมาก, การตรวจคำตอบ, การคำนวณคะแนน, และการสุ่มลูกเต๋า (RNG) ทำงานบน Node.js Server ผ่าน `GameEngine`
- **Zero-Secret Public State**: ข้อมูลสำคัญ เช่น `correctAnswer`, `rngSeed`, `sessionId`, `teacherId` จะถูกตัดออกก่อนกระจายไปยัง Client เสมอ ป้องกันการโกง 100%
- **Supabase Realtime Synchronization**: อัปเดตสถานะเกมแบบ Pub/Sub ผ่านแชนเนล `game:{pin}:state` และ `game:{pin}:events` โดยมี Fallback Polling อัตโนมัติเมื่อออฟไลน์

### 2. กระดาน 100 ช่องตามมาตรฐาน (Classic 100-Cell Board)
- กระดานขนาด 10×10 ตาราง แบบ Zigzag (1 ถึง 100)
- **จุดเริ่มต้น (Start)**: ช่องที่ 1 🚩
- **เส้นชัย (Finish)**: ช่องที่ 100 🏁 (มีกฎ Bounce Back: หากทอยเต๋าเกิน 100 หมากจะเด้งถอยหลังตามจำนวนที่เกิน)
- **งู (Snakes)**: สไลด์ถอยหลัง 4 จุด (98→62, 84→43, 65→31, 47→19)
- **บันได (Ladders)**: ปีนขึ้นหน้า 4 จุด (7→28, 21→56, 43→78, 61→89)
- **ช่องกิจกรรมพิเศษ (Special Cells)**:
  - **ช่อง 25 (BONUS)**: สิทธิ์ทอยลูกเต๋าซ้ำ (Roll Again)
  - **ช่อง 50 (GIFT)**: เดินหน้าเพิ่มทันที 3 ช่อง (Move Up 3)
  - **ช่อง 75 (BOOST)**: ฟรีสิทธิ์ทอยรอบถัดไปและโบนัสคะแนน +50 แต้ม

### 3. ระบบโบนัสลำดับการเข้าห้อง (Join Order Bonus Multipliers)
จูงใจให้นักเรียนรีบเข้าห้องเรียน โดยคิดโบนัสคูณคะแนนสุทธิหลังจบเกม:
- **คนที่ 1**: ตัวคูณโบนัส **×5** (🥇)
- **คนที่ 2**: ตัวคูณโบนัส **×4** (🥈)
- **คนที่ 3**: ตัวคูณโบนัส **×3** (🥉)
- **คนที่ 4**: ตัวคูณโบนัส **×2** (🎖️)
- **คนที่ 5 เป็นต้นไป**: ตัวคูณโบนัส **×1** (👤)

**สูตรคำนวณคะแนนสุทธิ (Final Score Formula)**:
```text
baseScore   = ช่องสุดท้ายบนกระดาน (1-100) + โบนัสเข้าเส้นชัย (ที่ 1: +3, ที่ 2: +2, ที่ 3: +1)
finalScore  = baseScore × bonusMultiplier
```

### 4. ตัวละครสัตว์ประจำตัว 12 ชนิด (12 Animal Avatars)
1. 🦊 สุนัขจิ้งจอก (Fox)
2. 🐼 แพนด้า (Panda)
3. 🐯 เสือ (Tiger)
4. 🐸 กบ (Frog)
5. 🐱 แมว (Cat)
6. 🐻 หมี (Bear)
7. 🐰 กระต่าย (Rabbit)
8. 🐧 เพนกวิน (Penguin)
9. 🦁 สิงโต (Lion)
10. 🐨 โคอาลา (Koala)
11. 🐵 ลิง (Monkey)
12. 🐶 สุนัข (Dog)

### 5. มุมมองสำหรับผู้ใช้ 3 รูปแบบ (Three Viewports)
1. **หน้าจอครูผู้สอน (`/teacher/dashboard`)**:
   - ควบคุมการเริ่มเกมและปล่อยคำถาม (Live Game Controller)
   - นับถอยหลัง 3 วินาที (3 → 2 → 1) ก่อนเปิดให้ตอบ
   - ระบบกด "ไปต่อ" ทันทีเมื่อนักเรียนตอบครบทุกคน หรือหมดเวลา 15 วินาที
   - จัดการคลังคำถาม (CRUD Question Bank) บันทึกลง LocalStorage
   - ดูประวัติห้องเกมและพิมพ์รายงานคะแนน
2. **หน้าจอโปรเจกเตอร์ห้องเรียน (`/game/[pin]/projector`)**:
   - แสดงผลกระดาน 100 ช่องขนาดใหญ่ พร้อมเส้นงูและบันได SVG
   - แสดงคิวทอยเต๋าแบบ Real-time และแอนิเมชันลูกเต๋า 3D
   - แสดงโพเดียมผู้ชนะอันดับ 1, 2, 3 พร้อมสรุปคะแนน
3. **หน้าจอนักเรียน (`/join` และ `/game/[pin]/play`)**:
   - ไม่ต้องสมัครสมาชิก เพียงกรอก Game PIN 6 หลักและชื่อเล่น
   - กดเลือกคำตอบ A, B, C, D พร้อมระบบตรวจคำตอบทันที
   - ตอบถูกได้สิทธิ์เข้าคิวทอยลูกเต๋าตามความเร็วในการตอบ

---

## 🚀 การติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### ความต้องการของระบบ (Prerequisites)
- Node.js version 18.18+ หรือ 20+
- npm หรือ yarn หรือ pnpm

### ติดตั้ง Dependencies
```bash
git clone https://github.com/s6902041510103-crypto/Bundingu.git
cd Bundingu
npm install
```

### รัน Development Server
```bash
npm run dev
```
เข้าใช้งานผ่านเบราว์เซอร์ที่: **`http://localhost:3000`**

### การตรวจสอบ Type-Check และ Build
```bash
# ตรวจสอบ TypeScript ทั้งหมด
npm run type-check

# สร้าง Production Build
npm run build
```

---

## 🧪 การทดสอบระบบ (Automated Tests & Simulation)

### 1. ทดสอบจำลองผู้เล่น 40 คนพร้อมกัน (40-Player Load Simulation)
ทดสอบการเข้าห้องพร้อมกัน 40 คน, การคำนวณโบนัสเข้าห้อง (×5, ×4, ×3, ×2, ×1), การนับถอยหลัง 3-2-1, การส่งคำตอบพร้อมกัน, การจัดคิวทอยเต๋า, และการตรวจความปลอดภัยของข้อมูล:
```bash
node scratch/test-40-players-load.mjs
```

### 2. ทดสอบความถูกต้องของ Gameplay Flow 12 รายการ (Regression 12/12)
```bash
node scratch/test-gameplay-regression.mjs
```

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
Knowledge-Snake/
├── src/
│   ├── app/
│   │   ├── api/game/[pin]/command/route.ts  # Server Command API Endpoint
│   │   ├── game/
│   │   │   ├── [pin]/
│   │   │   │   ├── page.tsx                # Student Game Lobby
│   │   │   │   ├── play/page.tsx           # Student/Teacher Gameplay Board
│   │   │   │   └── projector/page.tsx      # Classroom Projector View
│   │   │   └── board/page.tsx              # Standalone Board Preview
│   │   ├── join/page.tsx                   # Student Join Page (No login required)
│   │   ├── teacher/
│   │   │   ├── login/page.tsx              # Teacher Login Page
│   │   │   ├── register/page.tsx           # Teacher Register Page
│   │   │   └── dashboard/page.tsx          # Teacher Live Controller & Question Bank
│   │   └── page.tsx                        # Main Landing Page
│   ├── components/
│   │   ├── avatars/AvatarSVGs.tsx          # 12 Animal SVG Avatars
│   │   ├── game/
│   │   │   ├── BoardCell.tsx               # 3D Fantasy Cell with Special Badges
│   │   │   ├── BoardSvgOverlay.tsx         # Snakes & Ladders Curves
│   │   │   ├── GameBoard.tsx               # 100-cell Grid & Pawn Layer
│   │   │   ├── GamePodiumModal.tsx         # 🥇🥈🥉 Podium & Printable Report
│   │   │   └── Dice.tsx                    # Animated Dice Component
│   ├── domain/
│   │   └── types.ts                        # Core Types (Player, GameState, Commands)
│   ├── lib/
│   │   ├── auth/authService.ts             # Auth Service (Supabase + Local Demo)
│   │   ├── game-data.ts                    # Board Config, Snakes, Ladders, Join Multipliers
│   │   ├── supabase/client.ts              # Supabase Client & Local Realtime Bus
│   │   └── transport/
│   │       ├── GameStateTransport.ts       # Transport Interface
│   │       └── ProductionTransport.ts      # Supabase Realtime Client Transport
│   └── server/
│       ├── boardRules.ts                   # Pure Movement, Snakes, Ladders, Bounce
│       ├── commandHandler.ts               # Authoritative State Mutations
│       ├── gameEngine.ts                   # Server-Authoritative Orchestration Engine
│       ├── gamePhaseRules.ts               # Game Status Phase Validations
│       ├── gameState.ts                    # Public vs Server State Sanitization
│       ├── gameStateRules.ts               # Immutable State Helpers
│       ├── questionRules.ts                # Secret Question Evaluation
│       ├── realtimePublisher.ts            # Supabase Realtime Broadcast Publisher
│       ├── rollQueueRules.ts               # Roll Queue Ordering by Answer Time
│       └── validation.ts                   # Command Payload Validation
└── scratch/
    ├── test-40-players-load.mjs            # 40-Player Simulation Test
    └── test-gameplay-regression.mjs        # 12/12 Flow Verification Test
```

---

## 🔒 มาตรการความปลอดภัยของข้อมูล (Security Standards)

1. **ไม่ส่งเฉลยไปยัง Client**: ฟิลด์ `correctAnswer` จะถูกลบออก (`delete sanitizedData.correctAnswer`) ทุกครั้งก่อนส่งสถานะไปยัง Client
2. **ไม่ส่ง RNG Seed**: เมล็ดสุ่มลูกเต๋า `rngSeed` จะถูกตัดออกเสมอ ป้องกันไม่ให้ผู้เล่นคาดเดาผลการทอยล่วงหน้า
3. **ตรวจสอบสิทธิ์ผู้เล่น**: ทุกคำสั่ง `ROLL_DICE` มีการตรวจสอบว่าถึงตาของผู้เล่นคนนั้นจริงหรือไม่ (`NOT_PLAYER_TURN`) ป้องกันการทอยแทรกคิว

---

## 📄 License
This project is licensed under the MIT License.
