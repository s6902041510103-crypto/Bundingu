/**
 * GameStateTransport Interface
 * Abstraction layer for realtime communication
 * Allows swapping Mock/Dev/Production implementations without changing Game UI
 */

import type {
  GameState,
  GameCommand,
  GameEvent,
  CommandResult,
  GamePin,
  PlayerId,
  TransportState,
  TransportType,
} from '@/domain/types';

export interface GameStateTransport {
  // Transport identity
  readonly type: TransportType;
  readonly name: string;

  // Connection lifecycle
  connect(gamePin: GamePin, playerId?: PlayerId): Promise<void>;
  disconnect(): Promise<void>;

  // State subscription (authoritative state from Server Game Logic)
  subscribe(onStateUpdate: (state: GameState) => void): () => void;

  // Event subscription (discrete events for UI reactions)
  subscribeToEvents(onEvent: (event: GameEvent) => void): () => void;

  // Send commands to Server Game Logic
  sendCommand<T = void>(command: GameCommand): Promise<CommandResult<T>>;

  // Current connection state
  getState(): TransportState;

  // Synchronous access to latest known state (for initial render)
  getCurrentGameState(): GameState | null;
}

// Transport factory type
export type TransportFactory = (config: TransportConfig) => GameStateTransport;

export interface TransportConfig {
  type: TransportType;
  // Mock config
  mockGameState?: GameState;
  // Dev server config
  devServerUrl?: string;
  // Production config
  productionApiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

// Transport registry for easy switching
export const TRANSPORT_TYPES = {
  MOCK: 'mock' as TransportType,
  DEV_SERVER: 'dev-server' as TransportType,
  PRODUCTION: 'production' as TransportType,
} as const;

export function createTransportKey(type: TransportType): string {
  return `knowledge-snake-transport-${type}`;
}