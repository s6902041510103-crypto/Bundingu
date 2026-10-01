# ADR 0001: Architecture Overview

**Status**: Accepted
**Date**: 2026-09-30
**Deciders**: Knowledge Snake Team
**Technical Story**: Architecture foundation for multiplayer educational board game

---

## Context

Knowledge Snake is a multiplayer educational web game combining Kahoot-style quiz with Snake & Ladder board game mechanics. Key requirements:

- **Real-time multiplayer**: ~40 students per room, classroom setting
- **Server-authoritative**: No client-side game logic; anti-cheat, single source of truth
- **Teacher/Student roles**: Teacher creates/controls game; Students join via PIN (no login)
- **Projector View**: Separate fullscreen display for classroom projector
- **Deploy on Vercel**: Next.js frontend; no persistent WebSocket on Vercel
- **Phase-based development**: Incremental delivery with checkpoints

---

## Decision

We adopt a **3-Layer Architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER (Next.js on Vercel)               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Student View│  │Projector View│  │Teacher Dash. │  │  Landing Page   │  │
│  │ /game/[pin] │  │/game/[pin]/pr│  │  /teacher    │  │  /              │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
│         │                │                 │                   │           │
│         └────────────────┼─────────────────┼───────────────────┘           │
│                          ▼                                             │
│                 ┌─────────────────┐                                    │
│                 │GameStateTransport│ ◀── Abstract Interface            │
│                 │  (Mock/Prod)    │                                    │
│                 └────────┬────────┘                                    │
└───────────────────────────┼────────────────────────────────────────────┘
                            │ Commands (HTTP/WSS) + State/Events (Supabase Realtime)
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SERVER GAME LOGIC (Authoritative)                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Game Engine (Single Process)                    │   │
│  │  • Answer validation & timing    • Dice RNG (secure)              │   │
│  │  • Roll queue management         • Movement (bounce, snake/ladder)│   │
│  │  • Phase machine                 • Scoring & finish order         │   │
│  │  • Avatar collision checking     • GameState persistence          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              Supabase Realtime Publisher                            │   │
│  │  • Channel: game:{pin}:state   • Channel: game:{pin}:events       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────┬────────────────────────────────────────────┘
                            │ Pub/Sub Distribution
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE REALTIME (Pub/Sub Only)                       │
│  • WebSocket connections from all clients                                   │
│  • Broadcasts GameState + Events                                            │
│  • NO game logic, NO command handling                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility | Technology |
|-------|---------------|------------|
| **Client** | Render UI, deterministic animations, send Commands | Next.js 14, React, Tailwind |
| **Transport** | Abstract interface for Commands ↔ State/Events | `GameStateTransport` interface |
| **Server Game Logic** | **Single Source of Truth** — All game mechanics | Node.js/Edge (separate from Vercel) |
| **Supabase Realtime** | Pub/Sub distribution only | Supabase Realtime (WebSocket) |

### Key Architectural Rules

1. **Client NEVER computes game outcomes** — dice, movement, scoring, phase transitions
2. **Client NEVER writes to Supabase Realtime directly** — only subscribes
3. **Server Game Logic is the only authority** — validates, computes, emits
4. **Supabase Realtime = Distribution only** — no logic, no commands
5. **Commands flow Client → Server Game Logic → Supabase → All Clients**

---

## Transport Abstraction

`GameStateTransport` interface decouples UI from implementation:

```typescript
interface GameStateTransport {
  connect(gamePin: GamePin, playerId?: PlayerId): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(onStateUpdate: (state: GameState) => void): () => void;
  subscribeToEvents(onEvent: (event: GameEvent) => void): () => void;
  sendCommand(command: GameCommand): Promise<CommandResult>;
  getState(): TransportState;
  getCurrentGameState(): GameState | null;
}
```

### Implementations (per Phase)

| Phase | Transport | Purpose |
|-------|-----------|---------|
| 0–2 | `MockTransport` (BroadcastChannel) | Local dev, multi-tab testing |
| 1–2 | `DevServerTransport` | Local Game Logic + BroadcastChannel |
| 3+ | `ProductionTransport` | Server Game Logic → Supabase Realtime |

---

## Data Flow Summary

### Question Phase (Security Critical)
```
Server Game Logic          Supabase Realtime          All Clients
     │                          │                        │
     ├─ Selects ServerQuestion ─┤                        │
     │  (has correctAnswer)     │                        │
     │                          │                        │
     ├─ Creates PublicQuestion ─┤                        │
     │  (NO correctAnswer)      │                        │
     │                          ├─ Broadcasts ──────────▶│ Receives PublicQuestion
     │                          │                        │ Starts 15s timer
     │                          │                        │
     │                    AnswerCommand                  │
     │◀────────────────────────┤                        │
     │                          │                        │
     ├─ Validates correctAnswer │                        │
     ├─ Computes answerTime    │                        │
     ├─ Updates rollQueue      │                        │
     │                          │                        │
     ├─ Emits AnswerResultEvent│                        │
     ├─ Emits Updated GameState│                        │
     │                          ├─ Broadcasts ──────────▶│ Receives result + state
     │                          │                        │ Renders feedback
```

### Dice Roll Phase
```
Client (at front of queue)    Server Game Logic          Supabase          All Clients
     │                          │                        │                  │
     ├─ RollDiceCommand ───────▶│                        │                  │
     │                          ├─ Generates secure RNG  │                  │
     │                          ├─ Creates DiceResult   │                  │
     │                          │  { value, animationSeed│                  │
     │                          ├─ Emits DiceRolledEvent│                  │
     │                          ├─ Computes movement    │                  │
     │                          │  (bounce, snake, ladder)                 │
     │                          ├─ Emits PlayerMoving   │                  │
     │                          ├─ Emits PlayerMoved    │                  │
     │                          │                        │                  │
     │                          ├─ Broadcasts Events+St.│                  │
     │                          │                        ├─────────────────▶│
     │                          │                        │                  │
     │                          │                        │  Render deterministic
     │                          │                        │  animation from seed
     │                          │                        │  Show movement path
```

---

## Consequences

### Positive
- **Clear separation**: UI, Transport, Game Logic, Distribution all independent
- **Testable**: MockTransport enables full multi-tab testing without backend
- **Secure**: Correct answers never leave Server Game Logic
- **Scalable**: Server Game Logic can scale independently; Supabase handles connections
- **Deployable**: Next.js on Vercel; Game Logic on Railway/Render/Fly.io; Supabase managed
- **Swappable**: Transport implementations interchangeable without UI changes

### Negative
- **More components**: Requires running Server Game Logic separately in production
- **Network hops**: Client → Game Logic → Supabase → Client (mitigated by edge deployment)
- **Complexity**: More moving parts than monolithic Supabase-only approach

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Game Logic server downtime | Deploy on managed platform (Railway/Render) with health checks |
| Supabase Realtime latency | Use same region as Game Logic; connection pooling |
| State divergence | Single authoritative source; version numbers on GameState |

---

## Related Decisions

- ADR 0002: Realtime Transport Abstraction (interface details)
- ADR 0003: Game State Management (state shape, commands, events)
- ADR 0009: Question Security & Data Flow (PublicQuestion vs ServerQuestion)