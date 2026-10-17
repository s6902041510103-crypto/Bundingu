"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useCallback,
} from "react";
import type { GameState, GameAction } from "@/lib/types";
import { gameReducer, createInitialGameState } from "@/lib/game-state";
import { createMockTransport } from "@/lib/transport";

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

interface GameProviderProps {
  children: React.ReactNode;
  initialState?: GameState;
}

export function GameProvider({ children, initialState }: GameProviderProps) {
  const transportRef = useRef<ReturnType<typeof createMockTransport> | null>(null);
  const [state, dispatch] = useReducer(gameReducer, initialState ?? createInitialGameState());

  useEffect(() => {
    transportRef.current = createMockTransport(state);
    const unsubscribe = transportRef.current.subscribe((newState) => {
      dispatch({ type: "STATE_REPLACED", state: newState } as GameAction);
    });
    return unsubscribe;
  }, []);

  const wrappedDispatch = useCallback(
    (action: GameAction) => {
      transportRef.current?.dispatch(action);
    },
    [],
  );

  return (
    <GameContext.Provider value={{ state, dispatch: wrappedDispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameState must be used within a GameProvider");
  }
  return context;
}

export function useGameDispatch() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameDispatch must be used within a GameProvider");
  }
  return context.dispatch;
}