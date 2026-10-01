# Knowledge Snake — Glossary

> **Domain Vocabulary** — Single source of truth for all domain terms.
> Update this file whenever a term is introduced, refined, or deprecated.
> This glossary contains **only domain vocabulary** — no implementation details.

---

## Core Domain

### Game
A single play session created by a Teacher. Has a Game PIN, configured rounds, a Question Set, a list of Players, and a Board. Exists from Lobby → Result.

### Game PIN
A 6-character alphanumeric code (e.g., `A7K9M2`) generated when a Teacher creates a Game. Used by Students to join. Case-insensitive.

### Teacher
The actor who creates Games, manages Question Sets, starts/ends Games, and views Results/History. Authenticated (Mock in Phase 0–3, Supabase Auth in Phase 4+).

### Student
The actor who joins a Game via Game PIN + Display Name. No persistent account. Identified by a `playerId` stored in localStorage for rejoin capability.

### Lobby
The waiting phase before a Game starts. Shows Game PIN, QR Code, player count, player list with Avatars and status. Teacher controls START.

### Question Round
A synchronous phase where all Players receive the same Question simultaneously. 15-second countdown. 4 choices (A/B/C/D). Single answer. Correct answer grants Roll Queue entry.

### Roll Queue
Ordered list of Players who answered correctly, sorted by answer submission timestamp (fastest first). Each Player rolls Dice in turn.

### Game Board
A 10×10 grid (100 cells) with zigzag numbering (1 bottom-left → 100 top-left). Contains Snakes, Ladders, and optionally Special Cells.

### Snake
A board element connecting a higher-numbered cell to a lower-numbered cell. Landing on the head slides the Player down to the tail.
- 98 → 62
- 84 → 43
- 65 → 31
- 47 → 19

### Ladder
A board element connecting a lower-numbered cell to a higher-numbered cell. Landing on the foot climbs the Player up to the top.
- 7 → 28
- 21 → 56
- 43 → 78
- 61 → 89

### Special Cell (Disabled in MVP)
Cells with bonus effects. Defined in config but inactive by default.
- 25: BONUS — Roll Again
- 50: GIFT — Move Up 3
- 75: BOOST — Next Roll without answering correctly

### Finish Bonus
Extra score awarded to Players who reach Cell 100, based on finish order:
- 1st: +3 (Score = 103)
- 2nd: +2 (Score = 102)
- 3rd: +1 (Score = 101)
Leaderboard sorts by Score (Position + Bonus).

---

## Technical Architecture

### GameStateTransport
Abstraction interface for subscribing to authoritative Game State updates and sending Commands. Decouples Game UI from Realtime distribution and Game Logic implementation.
- `MockTransport` — BroadcastChannel (dev only, single-browser multi-tab, no real Game Logic)
- `DevServerTransport` — Local in-process Game Logic + BroadcastChannel (Phase 1–2)
- `ProductionTransport` — Connects to Server-Side Game Logic via HTTP/WebSocket; receives authoritative State via Supabase Realtime (Phase 3+)

### Server-Side Game Logic (Authoritative Game Engine)
The single source of truth for all game mechanics. Runs independently of Supabase Realtime.
Responsibilities:
- Validates answer correctness and timing (roll queue ordering)
- Grants/denies roll permissions
- Generates dice results (cryptographically secure RNG)
- Computes movement: bounce-back, snake/ladder transitions, special cell effects
- Determines finish order and calculates scores (position + finish bonus)
- Manages game phase transitions: lobby → question → rolling → moving → finished
- Maintains authoritative GameState
- Emits GameState events to Supabase Realtime for distribution to all clients
- Validates Avatar changes (collision checking per room)

### Supabase Realtime (Distribution Layer Only)
Pub/Sub WebSocket service for broadcasting authoritative GameState from Server Game Logic to all connected Clients. Does NOT contain game logic. Channels: `game:{pin}:state`, `game:{pin}:events`.

### GameState
Authoritative snapshot emitted by Server Game Logic. Contains:
- `gameStatus`: 'lobby' | 'question' | 'rolling' | 'moving' | 'finished'
- `round`: current round number (1-based)
- `question`: current Question object (during question phase)
- `players`: Player[] with position, score, status, avatarId
- `currentPlayer`: playerId whose turn to roll
- `rollQueue`: playerId[] waiting to roll (ordered by answer speed)
- `dice`: { value: 1-6, animationSeed: string } | null
- `board`: { snakes, ladders, specialCells } (static config)
- `leaderboard`: Player[] sorted by score

### GameCommand
Client → Server messages representing player intent:
- `JoinGameCommand { pin, displayName, preferredAvatarId? }`
- `AnswerCommand { questionId, choiceIndex, timestamp }`
- `RollDiceCommand { playerId }` (only valid when at front of rollQueue)
- `ChangeAvatarCommand { playerId, newAvatarId }`
- `TeacherStartGameCommand { pin }`
- `TeacherNextRoundCommand { pin }`

### PublicQuestion
Client-safe question data sent during Question Phase. Contains: `questionId`, `question`, `choices[4]`, `category?`, `difficulty?`. **Never contains `correctAnswer`**.

### ServerQuestion
Server-only question data. Extends PublicQuestion with `correctAnswer` and `explanation`. Never leaves Server Game Logic.

### Projector View
A read-only, fullscreen UI at `/game/[pin]/projector` showing the Board, Player positions, Current Player, Dice, Round, and Leaderboard. No controls. Consumes same GameState as Student View.

### Avatar
A predefined animal illustration assigned to a Player. 12 total (`avatar-01` … `avatar-12`). Assigned randomized with collision checking per room. Player may reroll or pick manually (collision-checked). Changes are Server-Authoritative.

### QuestionRepository
Abstraction for fetching Questions.
- `MockQuestionRepository` — Local TypeScript array (Phase 0–2)
- `SupabaseQuestionRepository` — Postgres table (Phase 3+)

### AuthRepository
Abstraction for Teacher authentication.
- `MockAuthRepository` — Simulated login (Phase 0–3)
- `SupabaseAuthRepository` — Supabase Auth (Phase 4+)

---

## Auth & Identity

### Student Rejoin Flow
1. Client reads `playerId` from localStorage (if exists)
2. Client sends `RejoinCommand { pin, playerId }` via GameStateTransport
3. Server Game Logic validates: `playerId` exists in Game Session AND session not expired
4. Server responds: `RejoinSuccess { playerState }` OR `RejoinFailed { reason }`
5. On success: Client receives full authoritative GameState and resumes
**Rule**: localStorage is an untrusted hint. Server is the only authority on player identity.

### Avatar System
- **Pool**: 12 predefined avatars (`avatar-01` … `avatar-12`), stable IDs, consistent visuals
- **Assignment on Join**: Server picks random unused avatar from pool. If all 12 used, picks random from full pool (duplicates allowed).
- **Student Actions**:
  - "Randomize" → `ChangeAvatarCommand { playerId, mode: 'random' }` → Server picks random unused (or any if all used)
  - "Pick" → `ChangeAvatarCommand { playerId, mode: 'pick', avatarId }` → Server validates not in use (or allows per rules)
- **Authority**: Server validates and applies avatar change → emits updated `PlayerState` → all clients render new avatar
- **Collision Prevention**: Server tracks assigned avatars per Game Session

---

## UI & Routes

### Student View
`/game/[pin]` — Main game interface for Students. Shows Question during question phase, Board during rolling/moving phases.

### Projector View
`/game/[pin]/projector` — Host display for classroom projector. Board-only, fullscreen.

### Board Preview
`/game/board` — Static board preview on Landing Page.

### Teacher Dashboard
`/teacher` — Authenticated Teacher area (Phase 4+). Create Game, Question Bank, History, Export.

---

## Supabase & Security (Phase 3.3+)

### Supabase Realtime
Pub/Sub WebSocket service for broadcasting authoritative GameState from Server Game Logic to all connected Clients. Does NOT contain game logic. Channels: `game:{pin}:state`, `game:{pin}:events`.
Enabled tables: `games`, `game_players`, `game_questions`.
NOT enabled: `questions` (contains `correct_answer`), `teachers` (private).

### Row Level Security (RLS)
PostgreSQL security feature restricting row access based on policies.
Current policies (Phase 3.3):
- Teacher access: Full CRUD on own data (`games`, `game_players`, `game_questions`, `questions`, `teachers`)
- Student access: NOT YET IMPLEMENTED (students lack Supabase Auth in Phase 3.3)

### Server-Authoritative Access (Phase 3.4+)
Architecture where Server Game Logic is the single authority:
1. Validates student via Game PIN + player_id
2. Issues short-lived JWT for Realtime access
3. Subscribes to filtered Realtime channels (`game:{pin}:state`, `game:{pin}:events`)
6. Emits filtered events (NEVER sends `correct_answer`)

### Security Rule: Correct Answer Isolation
**Never expose `questions.correct_answer` to students.**
- `questions` table: Teacher-only RLS (full access including `correct_answer`)
- Student delivery: Server fetches question → strips `correct_answer` → sends `PublicQuestion` via Realtime
- `questions` table NOT in Realtime publication