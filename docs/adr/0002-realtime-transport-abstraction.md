# ADR 0002: Realtime Transport Abstraction

**Status**: Accepted
**Date**: 2026-09-30
**Deciders**: Knowledge Snake Team
**Technical Story**: Define GameStateTransport interface and implementation strategy

---

## Context

The game requires real-time state synchronization across 40+ clients (students + projector + teacher). However:

- **Vercel** (Next.js hosting) does not support persistent WebSocket connections
- **Supabase Realtime** provides managed WebSocket but should only handle distribution
- **Development** needs fast iteration without deploying backend
- **Testing** requires multi-tab/browser verification of state sync
- **Production** needs server-authoritative game logic separate from distribution

We need an abstraction that allows:
1. Local development with zero backend (Phase 0–2)
2. Local game logic simulation (Phase 1–2)
3. Production deployment with real Server Game Logic + Supabase (Phase 3+)
4. Zero UI changes when switching implementations

---

## Decision

Define **`GameStateTransport`** as the single abstraction interface. All Game UI code depends only on this interface.

### Interface Definition

```typescript
// src/lib/transport/GameStateTransport.ts
export interface GameStateTransport {
  readonly type: TransportType;           // 'mock' | 'dev-server' | 'production'
  readonly name: string;                  // Human-readable name

  // Connection
  connect(gamePin: GamePin, playerId?: PlayerId): Promise<void>;
  disconnect(): Promise<void>;

  // Authoritative State Subscription (from Server Game Logic via Supabase)
  subscribe(onStateUpdate: (state: GameState) => void): () => void;

  // Discrete Events Subscription (for UI reactions: confetti, sounds, toasts)
  subscribeToEvents(onEvent: (event: GameEvent) => void): () => void;

  // Commands → Server Game Logic (NOT Supabase directly)
  sendCommand(command: GameCommand): Promise<CommandResult>;

  // Current connection status
  getState(): TransportState;

  // Synchronous access for initial render
  getCurrentGameState(): GameState | null;
}
```

### Transport Types

```typescript
export type TransportType = 'mock' | 'dev-server' | 'production';

export const TRANSPORT_TYPES = {
  MOCK: 'mock' as TransportType,
  DEV_SERVER: 'dev-server' as TransportType,
  PRODUCTION: 'production' as TransportType,
} as const;
```

---

## Implementation Strategies

### 1. MockTransport (Phase 0–2) — `type: 'mock'`

**Technology**: `BroadcastChannel` API (browser-native, no server)

**Architecture**:
```
Tab A (Student)                    Tab B (Projector)                    Tab C (Teacher)
┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
│ MockTransport   │               │ MockTransport   │               │ MockTransport   │
│  ┌───────────┐  │               │  ┌───────────┐  │               │  ┌───────────┐  │
│  │Local Mock │◀─┼──BroadcastCh─▶│  │Local Mock │◀─┼──BroadcastCh─▶│  │Local Mock │  │
│  │Game Logic │  │               │  │Game Logic │  │               │  │Game Logic │  │
│  └───────────┘  │               │  └───────────┘  │               │  └───────────┘  │
└─────────────────┘               └─────────────────┘               └─────────────────┘
```

**Characteristics**:
- Each tab runs **independent Mock Game Logic** instance
- `BroadcastChannel` syncs **Commands** and **State** across tabs
- Commands broadcast → all tabs process locally → state converges
- **Not truly server-authoritative** — each tab computes locally
- **Sufficient for**: UI development, animation testing, multi-tab sync verification
- **NOT for**: Production multiplayer, cheat prevention, load testing

**Command Flow (Multi-tab)**:
```
Tab A sends JOIN_GAME
    │
    ├─ BroadcastChannel: { type: 'COMMAND', command, targetPin }
    │
    ▼ Tab B & C receive
    ├─ Process command locally (their own Mock Game Logic)
    ├─ Update local state
    ├─ Broadcast STATE_SYNC with new version
    │
    ▼ All tabs converge to same state
```

### 2. DevServerTransport (Phase 1–2) — `type: 'dev-server'`

**Technology**: Local Node.js process (or Next.js API routes) + BroadcastChannel

**Architecture**:
```
All Tabs                              Local Dev Server
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│ MockTransport (thin client)     │   │ Single Game Logic Instance      │
│  • Subscribe to BroadcastChannel│   │  • Authoritative GameState      │
│  • Send Commands via HTTP/WSS   │◀─▶│  • Processes ALL commands       │
└─────────────────────────────────┘   │  • Broadcasts State via BC      │
                                      └─────────────────────────────────┘
```

**Characteristics**:
- **Single authoritative Game Logic** (runs in separate process)
- Tabs are thin clients — send commands, receive state
- Closer to production architecture
- Enables testing true server-authoritative behavior locally

### 3. ProductionTransport (Phase 3+) — `type: 'production'`

**Technology**: HTTP/WebSocket to Server Game Logic + Supabase Realtime subscription

**Architecture**:
```
Client (Vercel)                     Server Game Logic (Railway/Render)     Supabase Realtime
┌─────────────────────────┐          ┌─────────────────────────────────┐   ┌─────────────────┐
│ ProductionTransport     │          │ Authoritative Game Engine       │   │ Pub/Sub Only    │
│  • REST/WebSocket for   │◀────────▶│  • Validates commands           │   │  • game:{pin}   │
│    Commands             │          │  • Computes outcomes            │   │  • state/events │
│  • Supabase Realtime    │          │  • Emits State + Events         │   │  • 40+ conns    │
│    subscription         │          └──────────────┬──────────────────┘   └────────┬────────┘
└─────────────────────────┘                         │                          │
                                                   │ Publishes State/Events    │
                                                   └──────────────┬─────────────┘
                                                                  │ Subscribes
                                                   ┌──────────────▼─────────────┐
                                                   │ All Clients (Vercel)       │
                                                   │  • Student View            │
                                                   │  • Projector View          │
                                                   │  • Teacher Dashboard       │
                                                   └────────────────────────────┘
```

**Characteristics**:
- **True server-authoritative** — Game Logic is single source of truth
- **Supabase = Distribution only** — no logic, no command handling
- **Commands**: Client → Game Logic (HTTP/WSS)
- **State/Events**: Game Logic → Supabase Realtime → All Clients
- **Scales**: Game Logic horizontal scaling; Supabase handles WebSocket connections

---

## Transport Factory Pattern

```typescript
// src/lib/transport/index.ts
import { GameStateTransport, TransportConfig, TransportFactory, TRANSPORT_TYPES } from './GameStateTransport';
import { MockTransport, mockTransport } from './MockTransport';
// import { DevServerTransport } from './DevServerTransport';
// import { ProductionTransport } from './ProductionTransport';

export function createTransport(config: TransportConfig): GameStateTransport {
  switch (config.type) {
    case TRANSPORT_TYPES.MOCK:
      return mockTransport; // Singleton for BroadcastChannel sharing

    case TRANSPORT_TYPES.DEV_SERVER:
      // return new DevServerTransport(config.devServerUrl);
      throw new Error('DevServerTransport not implemented yet');

    case TRANSPORT_TYPES.PRODUCTION:
      // return new ProductionTransport({
      //   apiUrl: config.productionApiUrl,
      //   supabaseUrl: config.supabaseUrl,
      //   supabaseAnonKey: config.supabaseAnonKey,
      // });
      throw new Error('ProductionTransport not implemented yet');

    default:
      throw new Error(`Unknown transport type: ${config.type}`);
  }
}

// Environment-based selection
export function getDefaultTransportConfig(): TransportConfig {
  const env = process.env.NEXT_PUBLIC_TRANSPORT_TYPE || 'mock';

  switch (env) {
    case 'production':
      return {
        type: TRANSPORT_TYPES.PRODUCTION,
        productionApiUrl: process.env.NEXT_PUBLIC_GAME_LOGIC_URL,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      };
    case 'dev-server':
      return {
        type: TRANSPORT_TYPES.DEV_SERVER,
        devServerUrl: process.env.NEXT_PUBLIC_DEV_SERVER_URL || 'http://localhost:3001',
      };
    default:
      return { type: TRANSPORT_TYPES.MOCK };
  }
}
```

---

## Usage in React Components

```typescript
// src/hooks/useGameTransport.ts
import { useEffect, useState, useCallback } from 'react';
import { createTransport, getDefaultTransportConfig } from '@/lib/transport';
import type { GameState, GameEvent, GameCommand, CommandResult, GamePin, PlayerId } from '@/domain/types';

export function useGameTransport(gamePin: GamePin, playerId?: PlayerId) {
  const [transport] = useState(() => createTransport(getDefaultTransportConfig()));
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    transport.connect(gamePin, playerId).then(() => {
      if (!mounted) return;
      setConnected(true);
      setGameState(transport.getCurrentGameState());
    }).catch(err => {
      if (mounted) setError(err.message);
    });

    const unsubscribeState = transport.subscribe((state) => {
      if (mounted) setGameState(state);
    });

    const unsubscribeEvents = transport.subscribeToEvents((event) => {
      // Handle discrete events (confetti, sounds, toasts)
      handleGameEvent(event);
    });

    return () => {
      mounted = false;
      unsubscribeState();
      unsubscribeEvents();
      transport.disconnect();
    };
  }, [gamePin, playerId]);

  const sendCommand = useCallback(async (command: GameCommand): Promise<CommandResult> => {
    return transport.sendCommand(command);
  }, [transport]);

  return { gameState, connected, error, sendCommand, transport };
}
```

---

## Consequences

### Positive
- **UI completely decoupled** from realtime implementation
- **Phase-appropriate complexity**: Mock → Dev Server → Production
- **Multi-tab testing** from Phase 0 via BroadcastChannel
- **Single interface** — components never know which transport is active
- **Environment-driven** — switch via `NEXT_PUBLIC_TRANSPORT_TYPE`

### Negative
- **Abstraction overhead** — interface must accommodate all implementations
- **Mock limitations** — not truly authoritative; can diverge in edge cases
- **BroadcastChannel constraints** — same-origin only; no cross-device testing

### Migration Path
| From | To | Effort |
|------|-----|--------|
| Mock → Dev Server | Replace transport factory config | Low |
| Dev Server → Production | Implement ProductionTransport; deploy Game Logic | Medium |
| Mock → Production | Skip Dev Server; implement ProductionTransport directly | Medium |

---

## Related Decisions

- ADR 0001: Architecture Overview (3-layer context)
- ADR 0003: Game State Management (state shape, commands, events)
- ADR 0006: Phasing & Checkpoints (when each transport is used)