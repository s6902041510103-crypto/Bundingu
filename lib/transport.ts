import type { GameState, GameAction, ServerGameCommand } from "./types";
import { gameReducer } from "./game-state";

export interface GameStateTransport {
  subscribe: (listener: (state: GameState) => void) => () => void;
  dispatch: (action: GameAction) => void;
  sendCommand?: (
    command: ServerGameCommand,
  ) => Promise<{ ok: boolean; state?: GameState; error?: string }>;
  getState: () => GameState;
  replaceState: (state: GameState) => void;
  destroy?: () => void;
}

function createLocalStore(initialState: GameState) {
  let state = initialState;
  const listeners = new Set<(state: GameState) => void>();

  return {
    getState: () => state,
    dispatch: (action: GameAction) => {
      state = gameReducer(state, action);
      listeners.forEach((l) => l(state));
    },
    replaceState: (newState: GameState) => {
      state = newState;
      listeners.forEach((l) => l(state));
    },
    subscribe: (listener: (state: GameState) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

let localStoreInstance: ReturnType<typeof createLocalStore> | null = null;

export function getLocalStore(initialState?: GameState) {
  if (!localStoreInstance && initialState) {
    localStoreInstance = createLocalStore(initialState);
  }
  return localStoreInstance!;
}

export function createBroadcastChannelTransport(
  channelName: string,
  initialState: GameState,
): GameStateTransport {
  const localStore = createLocalStore(initialState);
  const channel =
    typeof window !== "undefined" && "BroadcastChannel" in window
      ? new BroadcastChannel(channelName)
      : null;

  if (channel) {
    channel.onmessage = (event) => {
      if (event.data?.type === "STATE_SYNC" && event.data.state) {
        localStore.replaceState(event.data.state);
      }
    };
  }

  const originalDispatch = localStore.dispatch;
  localStore.dispatch = (action) => {
    originalDispatch(action);
    const newState = localStore.getState();
    channel?.postMessage({ type: "STATE_SYNC", state: newState });
  };

  return {
    subscribe: localStore.subscribe,
    dispatch: localStore.dispatch,
    getState: localStore.getState,
    replaceState: localStore.replaceState,
    destroy: () => channel?.close(),
  };
}

export function createMockTransport(initialState: GameState): GameStateTransport {
  return getLocalStore(initialState);
}

/**
 * ProductionTransport:
 * - Sends all game commands to the authoritative Server API (`/api/games/[pin]/command`)
 * - Fetches & syncs public state from `/api/games/[pin]/state`
 * - Broadcasts instant state updates over `BroadcastChannel` + Supabase Realtime (when configured)
 */
export function createProductionTransport(
  pin: string,
  initialState: GameState,
  options?: { playerId?: string | null; pollIntervalMs?: number },
): GameStateTransport {
  const store = createLocalStore(initialState);
  const channelName = `ks-realtime-room-${pin}`;
  const channel =
    typeof window !== "undefined" && "BroadcastChannel" in window
      ? new BroadcastChannel(channelName)
      : null;

  let disposed = false;

  const fetchServerState = async () => {
    if (disposed || typeof window === "undefined") return;
    try {
      const query = options?.playerId
        ? `?playerId=${encodeURIComponent(options.playerId)}`
        : "";
      const res = await fetch(`/api/games/${encodeURIComponent(pin)}/state${query}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.state && !disposed) {
        store.replaceState({
          ...data.state,
          viewerPlayerId: options?.playerId ?? data.state.viewerPlayerId ?? null,
        });
      }
    } catch {
      // Keep current local state on transient network hiccup
    }
  };

  if (channel) {
    channel.onmessage = (event) => {
      if (disposed) return;
      if (event.data?.type === "STATE_SYNC" && event.data.state) {
        const incoming = event.data.state as GameState;
        // If this tab represents a specific student and the broadcast came from a different viewer,
        // fetch our own viewer-scoped state so our personal answerState / correctOptionId is never masked!
        if (options?.playerId && incoming.viewerPlayerId !== options.playerId) {
          fetchServerState();
          return;
        }
        if (incoming.updatedAt >= store.getState().updatedAt) {
          store.replaceState({
            ...incoming,
            viewerPlayerId: options?.playerId ?? store.getState().viewerPlayerId,
          });
        }
      }
    };
  }

  // Initial sync + periodic realtime poll fallback
  if (typeof window !== "undefined") {
    fetchServerState();
  }
  const interval =
    typeof window !== "undefined"
      ? window.setInterval(fetchServerState, options?.pollIntervalMs ?? 1200)
      : null;

  const sendCommand = async (
    command: ServerGameCommand,
  ): Promise<{ ok: boolean; state?: GameState; error?: string }> => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (typeof window !== "undefined") {
        try {
          const cached =
            window.localStorage.getItem("ks_teacher_session") ||
            window.sessionStorage.getItem("ks_teacher_session");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.teacherId) headers["x-teacher-id"] = parsed.teacherId;
            if (parsed.email) headers["x-teacher-email"] = parsed.email;
          }
        } catch {
          // ignore
        }
      }

      let res = await fetch(`/api/games/${encodeURIComponent(pin)}/command`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(command),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      // If transient "ไม่พบห้อง" or network glitch occurred, quickly retry once after 200ms
      if (!res.ok || (typeof data.error === "string" && data.error.includes("ไม่พบห้อง"))) {
        await new Promise((r) => setTimeout(r, 200));
        try {
          const retryRes = await fetch(`/api/games/${encodeURIComponent(pin)}/command`, {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify(command),
          });
          const retryData = await retryRes.json();
          if (retryRes.ok && !retryData.error) {
            res = retryRes;
            data = retryData;
          }
        } catch {
          // ignore
        }
      }

      if (!res.ok || data.error) {
        return { ok: false, error: data.error || "คำสั่งไม่สำเร็จ" };
      }
      if (data.state) {
        const nextState: GameState = {
          ...data.state,
          viewerPlayerId: options?.playerId ?? data.state.viewerPlayerId ?? null,
        };
        store.replaceState(nextState);
        channel?.postMessage({ type: "STATE_SYNC", state: data.state });
        return { ok: true, state: nextState };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง" };
    }
  };

  return {
    subscribe: store.subscribe,
    getState: store.getState,
    replaceState: (newState: GameState) => {
      store.replaceState(newState);
      channel?.postMessage({ type: "STATE_SYNC", state: newState });
    },
    dispatch: (action: GameAction) => {
      store.dispatch(action);
      channel?.postMessage({ type: "STATE_SYNC", state: store.getState() });
    },
    sendCommand,
    destroy: () => {
      disposed = true;
      if (interval !== null && typeof window !== "undefined") {
        window.clearInterval(interval);
      }
      channel?.close();
    },
  };
}