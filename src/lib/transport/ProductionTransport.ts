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
  private sessionId?: string;
  private isConnected: boolean = false;

  // Cached latest authoritative public game state
  private currentGameState: GameState | null = null;

  // Subscriptions registries
  private stateSubscribers: Set<(state: GameState) => void> = new Set();
  private eventSubscribers: Set<(event: GameEvent) => void> = new Set();
  private pollTimer: any = null;

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
   * Task 4.4E-2: Prepares session credentials for HTTP Command Dispatch and state sync
   */
  async connect(gamePin: GamePin, playerId?: PlayerId): Promise<void> {
    this.gamePin = gamePin;
    this.playerId = playerId;
    this.sessionId = playerId || `session-${gamePin}-${Date.now()}`;
    this.isConnected = true;

    // Fetch initial state immediately
    await this.fetchState();

    // Start background sync poll (every 1s) to keep multi-tab / clients in sync
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    this.pollTimer = setInterval(() => {
      if (this.isConnected) {
        this.fetchState();
      }
    }, 1000);

    // TODO (Task 4.4E-2 Realtime): Establish Supabase Realtime channel subscriptions:
    // - Subscribe to stateChannelName (game:{pin}:state)
    // - Subscribe to eventsChannelName (game:{pin}:events)
  }

  /**
   * Disconnect from game session and clean up subscriptions
   */
  async disconnect(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.isConnected = false;
    this.gamePin = undefined;
    this.playerId = undefined;
    this.sessionId = undefined;
    this.currentGameState = null;

    // Clear active subscribers
    this.stateSubscribers.clear();
    this.eventSubscribers.clear();

    // TODO (Task 4.4E-2 Realtime): Unsubscribe from Supabase Realtime channels
  }

  /**
   * Fetch latest authoritative game state from server
   */
  async fetchState(): Promise<GameState | null> {
    if (!this.gamePin) return null;
    const baseUrl = this.productionApiUrl ? this.productionApiUrl.replace(/\/+$/, '') : '';
    const url = `${baseUrl}/api/game/${encodeURIComponent(this.gamePin.toUpperCase())}/command`;
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.gameState) {
          this.handleIncomingStateUpdate(result.data.gameState);
          return result.data.gameState;
        }
      }
    } catch {
      // Ignore network errors during polling
    }
    return null;
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
   * Send game command to Server Game Logic via HTTP API Route
   * Task 4.4E-2: Dispatches commands to /api/game/[pin]/command
   */
  async sendCommand<T = void>(command: GameCommand): Promise<CommandResult<T>> {
    // Pre-flight check: Must be connected
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

    const pin = (command as any).gamePin || this.gamePin;
    if (!pin) {
      return {
        success: false,
        error: {
          code: 'MISSING_GAME_PIN',
          message: 'Game PIN is required to dispatch command.',
        },
      };
    }

    const baseUrl = this.productionApiUrl ? this.productionApiUrl.replace(/\/+$/, '') : '';
    const url = `${baseUrl}/api/game/${encodeURIComponent(pin.toUpperCase())}/command`;

    const payload = {
      gamePin: pin,
      playerId: (command as any).playerId || this.playerId,
      sessionId: (command as any).sessionId || this.sessionId,
      ...command,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let result: CommandResult<T>;
      try {
        result = await response.json();
      } catch {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: `Server returned non-JSON response (HTTP status ${response.status})`,
          },
        };
      }

      // If state was returned in result, update local cache and notify subscribers
      if (result.success && result.data && (result.data as any).gameState) {
        this.handleIncomingStateUpdate((result.data as any).gameState);
      }

      return result;
    } catch (networkError: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: networkError?.message || 'Network error occurred while dispatching command.',
        },
      };
    }
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