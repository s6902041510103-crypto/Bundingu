import type { GameState, GameAction } from "./types";
import { gameReducer } from "./game-state";

export interface GameStateTransport {
  subscribe: (listener: (state: GameState) => void) => () => void;
  dispatch: (action: GameAction) => void;
  getState: () => GameState;
  replaceState: (state: GameState) => void;
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
  const localStore = getLocalStore(initialState);
  const channel = new BroadcastChannel(channelName);

  channel.onmessage = (event) => {
    if (event.data?.type === "STATE_SYNC") {
      localStore.replaceState(event.data.state);
    }
  };

  const originalDispatch = localStore.dispatch;
  localStore.dispatch = (action) => {
    originalDispatch(action);
    const newState = localStore.getState();
    channel.postMessage({ type: "STATE_SYNC", state: newState });
  };

  return {
    subscribe: localStore.subscribe,
    dispatch: localStore.dispatch,
    getState: localStore.getState,
    replaceState: localStore.replaceState,
  };
}

export function createMockTransport(initialState: GameState): GameStateTransport {
  return getLocalStore(initialState);
}