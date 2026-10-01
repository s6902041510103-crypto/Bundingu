/**
 * ProductionTransport - Production implementation of GameStateTransport (Task 4.4E-1)
 *
 * Connects Game UI to Server Game Logic and Supabase Realtime.
 *
 * Architectural Flow:
 * Client
 *   ↓
 * ProductionTransport
 *   ↓
 * Server Game Logic (via HTTP/WebSocket)
 *   ↓
 * GameEngine (Server-Authoritative)
 *   ↓
 * PublicGameState / Game Events
 *   ↓
 * Supabase Realtime Channels (game:{pin}:state, game:{pin}:events)
 *   ↓
 * All Clients (subscribed via ProductionTransport)
 *
 * Security:
 * Client never touches ServerGameState directly.
 * Sensitive fields (correctAnswer, rngSeed, teacherId, sessionId) are isolated server-side.
 */

import type {
  GameStateTransport,
  TransportConfig,
  TransportType,
  GameState,
  GameCommand,
  GameEvent,
  CommandResult,
  GamePin,
  PlayerId,
  TransportState,
} from '@/domain/types';

/**
 * ProductionTransport handles:
 * 1. Connection lifecycle and state tracking
 * 2. Subscription to authoritative GameState updates
 * 3. Subscription to discrete GameEvents
 * 4. Dispatching client GameCommands to Server Game Logic
 */
export class ProductionTransport implements GameStateTransport {
  readonly type: TransportType = 'production';
  readonly name: string = 'ProductionTransport';

  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private productionApiUrl?: string;

  private gamePin?: GamePin;
  private playerId?: PlayerId;
  private isConnected: boolean = false;

  // Cached latest authoritative public game state
  private currentGameState: GameState | null = null;

  // Subscriptions registries
  private stateSubscribers: Set<(state: GameState) => void> = new Set();
  private eventSubscribers: Set<(event: GameEvent) => void> = new Set();

  constructor(config: TransportConfig) {
    this.supabaseUrl = config.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseAnonKey = config.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    this.productionApiUrl = config.productionApiUrl || process.env.NEXT_PUBLIC_GAME_LOGIC_URL;
  }

  // ==========================================================================
  // Channel Identification (Adhering to ADR 0001, ADR 0002, and SQL migration)
  // ==========================================================================

  /**
   * Channel name for authoritative state distribution: game:{pin}:state
   */
  get stateChannelName(): string | null {
    return this.gamePin ? `game:${this.gamePin.toUpperCase()}:state` : null;
  }

  /**
   * Channel name for discrete game events: game:{pin}:events
   */
  get eventsChannelName(): string | null {
    return this.gamePin ? `game:${this.gamePin.toUpperCase()}:events` : null;
  }

  // ==========================================================================
  // Connection Lifecycle
  // ==========================================================================

  /**
   * Connect to game room session
   * Task 4.4E-1: Initializes session state and prepares subscription channels
   * (Realtime WebSocket channel subscription is wired in Task 4.4E-2)
   */
  async connect(gamePin: GamePin, playerId?: PlayerId): Promise<void> {
    this.gamePin = gamePin;
    this.playerId = playerId;
    this.isConnected = true;

    // TODO (Task 4.4E-2): Establish Supabase Realtime channel subscriptions:
    // - Subscribe to stateChannelName (game:{pin}:state)
    // - Subscribe to eventsChannelName (game:{pin}:events)
  }

  /**
   * Disconnect from game session and clean up subscriptions
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.gamePin = undefined;
    this.playerId = undefined;
    this.currentGameState = null;

    // Clear active subscribers
    this.stateSubscribers.clear();
    this.eventSubscribers.clear();

    // TODO (Task 4.4E-2): Unsubscribe from Supabase Realtime channels
  }

  // ==========================================================================
  // Subscriptions
  // ==========================================================================

  /**
   * Subscribe to authoritative GameState updates
   * Returns unsubscribe cleanup function
   */
  subscribe(onStateUpdate: (state: GameState) => void): () => void {
    this.stateSubscribers.add(onStateUpdate);

    // Immediately emit current state if already cached
    if (this.currentGameState !== null) {
      onStateUpdate(this.currentGameState);
    }

    return () => {
      this.stateSubscribers.delete(onStateUpdate);
    };
  }

  /**
   * Subscribe to discrete GameEvents (dice roll, player move, round finish)
   * Returns unsubscribe cleanup function
   */
  subscribeToEvents(onEvent: (event: GameEvent) => void): () => void {
    this.eventSubscribers.add(onEvent);

    return () => {
      this.eventSubscribers.delete(onEvent);
    };
  }

  // ==========================================================================
  // Command Dispatch
  // ==========================================================================

  /**
   * Send game command to Server Game Logic
   * In Task 4.4E-1: Contract validated; actual HTTP/WS network dispatch is wired in Task 4.4E-2
   */
  async sendCommand<T = void>(command: GameCommand): Promise<CommandResult<T>> {
    if (!this.isConnected) {
      return {
        success: false,
        error: {
          code: 'NOT_CONNECTED',
          message: 'ProductionTransport is not connected. Call connect() first.',
        },
      };
    }

    if (!command || !command.type) {
      return {
        success: false,
        error: {
          code: 'INVALID_COMMAND',
          message: 'Command type is required.',
        },
      };
    }

    // TODO (Task 4.4E-2): Send command via HTTP/WebSocket to Server Command Endpoint
    return {
      success: false,
      error: {
        code: 'COMMAND_API_PENDING',
        message: 'Command API route integration pending (Task 4.4E-2)',
      },
    };
  }

  // ==========================================================================
  // State Getters
  // ==========================================================================

  /**
   * Get current transport connection status
   */
  getState(): TransportState {
    return {
      connected: this.isConnected,
      gamePin: this.gamePin,
      playerId: this.playerId,
    };
  }

  /**
   * Synchronous access to latest known public game state
   */
  getCurrentGameState(): GameState | null {
    return this.currentGameState;
  }

  // ==========================================================================
  // Incoming Data Handlers (Hook points for Task 4.4E-2 Realtime integration)
  // ==========================================================================

  /**
   * Ingest state update received from Realtime channel
   */
  handleIncomingStateUpdate(state: GameState): void {
    this.currentGameState = state;
    this.stateSubscribers.forEach(subscriber => {
      try {
        subscriber(state);
      } catch (err) {
        console.error('[ProductionTransport] Error in state subscriber:', err);
      }
    });
  }

  /**
   * Ingest discrete event received from Realtime channel
   */
  handleIncomingEvent(event: GameEvent): void {
    this.eventSubscribers.forEach(subscriber => {
      try {
        subscriber(event);
      } catch (err) {
        console.error('[ProductionTransport] Error in event subscriber:', err);
      }
    });
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Factory function to create ProductionTransport
 */
export function createProductionTransport(config: TransportConfig): GameStateTransport {
  const supabaseUrl = config.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = config.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase credentials not configured. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  return new ProductionTransport(config);
}

/**
 * Check if ProductionTransport can be initialized
 */
export function canUseProductionTransport(config?: TransportConfig): boolean {
  const url = config?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = config?.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key);
}