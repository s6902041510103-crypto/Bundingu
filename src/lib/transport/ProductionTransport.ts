/**
 * ProductionTransport - Production implementation of GameStateTransport (Task 4.4E-1 & 4.4E-3)
 *
 * Connects Game UI to Server Game Logic and Supabase Realtime.
 *
 * Architectural Flow:
 * Client
 *   ↓
 * ProductionTransport
 *   ↓
 * Server Game Logic (via HTTP POST /api/game/[pin]/command)
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
import { getSupabaseClient, SupabaseClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * ProductionTransport handles:
 * 1. Connection lifecycle and state tracking
 * 2. Subscription to authoritative GameState updates via Supabase Realtime (game:{pin}:state)
 * 3. Subscription to discrete GameEvents via Supabase Realtime (game:{pin}:events)
 * 4. Automatic reconnection with exponential backoff and state refresh
 * 5. Clean unsubscribe on disconnect
 * 6. Dispatching client GameCommands to Server Game Logic
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
  private isRealtimeConnected: boolean = false;

  // Supabase Realtime client and channels
  private supabase: SupabaseClient | null = null;
  private stateChannel: RealtimeChannel | null = null;
  private eventsChannel: RealtimeChannel | null = null;

  // Browser-native BroadcastChannel fallback for multi-tab local dev sync
  private localBroadcastChannel: any = null;

  // Reconnection management
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;

  // Cached latest authoritative public game state
  private currentGameState: GameState | null = null;

  // Subscriptions registries
  private stateSubscribers: Set<(state: GameState) => void> = new Set();
  private eventSubscribers: Set<(event: GameEvent) => void> = new Set();
  private fallbackPollTimer: ReturnType<typeof setInterval> | null = null;

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
   * Task 4.4E-3: Connects to Supabase Realtime channels for state and events
   */
  async connect(gamePin: GamePin, playerId?: PlayerId): Promise<void> {
    this.gamePin = gamePin;
    this.playerId = playerId;
    this.sessionId = playerId || `session-${gamePin}-${Date.now()}`;
    this.isConnected = true;
    this.reconnectAttempts = 0;

    // Fetch initial authoritative state immediately
    await this.fetchState();

    // Establish Supabase Realtime subscriptions
    await this.setupRealtimeSubscriptions();

    // Setup local BroadcastChannel for browser tabs sync if supported
    this.setupLocalBroadcast();

    // Ensure state sync is active across clients when not connected to remote Supabase
    const isRealSupabase = Boolean(
      this.supabaseUrl &&
      this.supabaseUrl.startsWith('http') &&
      !this.supabaseUrl.includes('your-project-ref')
    );
    if (!isRealSupabase) {
      this.startFallbackPoll();
    }
  }

  /**
   * Disconnect from game session and cleanly unsubscribe from Realtime channels
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.isRealtimeConnected = false;

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Stop fallback poll timer
    this.stopFallbackPoll();

    // Clean up Supabase channels
    await this.teardownRealtimeChannels();

    // Clean up local BroadcastChannel
    if (this.localBroadcastChannel) {
      try {
        this.localBroadcastChannel.close();
      } catch {
        // Ignore
      }
      this.localBroadcastChannel = null;
    }

    this.gamePin = undefined;
    this.playerId = undefined;
    this.sessionId = undefined;
    this.currentGameState = null;

    // Clear active subscribers
    this.stateSubscribers.clear();
    this.eventSubscribers.clear();
  }

  /**
   * Setup Supabase Realtime channels for game state and discrete events
   */
  private async setupRealtimeSubscriptions(): Promise<void> {
    if (!this.gamePin) return;

    const normalizedPin = this.gamePin.toUpperCase();

    // Lazily get or create Supabase client
    if (!this.supabase) {
      this.supabase = getSupabaseClient(this.supabaseUrl, this.supabaseAnonKey);
    }

    if (!this.supabase) {
      // Supabase credentials not configured: fallback to heartbeat polling
      this.startFallbackPoll();
      return;
    }

    try {
      // 1. Subscribe to State Channel: game:{pin}:state
      const stateChName = `game:${normalizedPin}:state`;
      this.stateChannel = this.supabase.channel(stateChName, {
        config: { broadcast: { ack: false, self: true } },
      });

      this.stateChannel
        .on('broadcast', { event: 'state_update' }, (payload: any) => {
          const incoming = payload?.payload?.gameState || payload?.gameState;
          if (incoming) {
            this.handleIncomingStateUpdate(incoming);
          }
        })
        .subscribe((status: string, err?: any) => {
          this.handleChannelStatus('state', status, err);
        });

      // 2. Subscribe to Events Channel: game:{pin}:events
      const eventsChName = `game:${normalizedPin}:events`;
      this.eventsChannel = this.supabase.channel(eventsChName, {
        config: { broadcast: { ack: false, self: true } },
      });

      this.eventsChannel
        .on('broadcast', { event: 'game_event' }, (payload: any) => {
          const event = payload?.payload?.event || payload?.event;
          if (event) {
            this.handleIncomingEvent(event);
          }
        })
        .subscribe((status: string, err?: any) => {
          this.handleChannelStatus('events', status, err);
        });
    } catch (err) {
      console.warn('[ProductionTransport] Error establishing Realtime channels:', err);
      this.startFallbackPoll();
    }
  }

  /**
   * Handle Supabase Realtime channel connection status changes
   */
  private handleChannelStatus(channel: 'state' | 'events', status: string, err?: any): void {
    const isRealSupabase = Boolean(
      this.supabaseUrl &&
      this.supabaseUrl.startsWith('http') &&
      !this.supabaseUrl.includes('your-project-ref')
    );

    if (status === 'SUBSCRIBED') {
      this.isRealtimeConnected = isRealSupabase;
      this.reconnectAttempts = 0;
      if (isRealSupabase) {
        // Real cloud Supabase Realtime active -> Stop fallback polling
        this.stopFallbackPoll();
      } else {
        // Local in-memory fallback bus -> Keep polling to ensure cross-process / cross-device sync
        this.startFallbackPoll();
      }
      // Refresh state to ensure no missed updates during handshake
      this.fetchState().catch(() => {});
    } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
      this.isRealtimeConnected = false;
      if (err) {
        console.warn(`[ProductionTransport] Realtime ${channel} channel status: ${status}`, err);
      }
      if (this.isConnected) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Schedule automatic reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.isConnected) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[ProductionTransport] Reconnection attempts exhausted, using fallback polling');
      this.startFallbackPoll();
      return;
    }

    const delayMs = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    // While reconnecting, run fallback poll to ensure state doesn't freeze
    this.startFallbackPoll();

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (!this.isConnected) return;

      await this.teardownRealtimeChannels();
      await this.setupRealtimeSubscriptions();
    }, delayMs);
  }

  /**
   * Teardown Supabase Realtime channels
   */
  private async teardownRealtimeChannels(): Promise<void> {
    if (this.supabase) {
      if (this.stateChannel) {
        try {
          await this.supabase.removeChannel(this.stateChannel);
        } catch {
          // Ignore
        }
        this.stateChannel = null;
      }
      if (this.eventsChannel) {
        try {
          await this.supabase.removeChannel(this.eventsChannel);
        } catch {
          // Ignore
        }
        this.eventsChannel = null;
      }
    }
  }

  /**
   * Setup browser-level BroadcastChannel for multi-tab sync when running in browser
   */
  private setupLocalBroadcast(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window && this.gamePin) {
      try {
        this.localBroadcastChannel = new BroadcastChannel(`ks_sync_${this.gamePin.toUpperCase()}`);
        this.localBroadcastChannel.onmessage = (event: MessageEvent) => {
          if (event.data?.type === 'STATE_UPDATE' && event.data?.gameState) {
            this.handleIncomingStateUpdate(event.data.gameState);
          } else if (event.data?.type === 'GAME_EVENT' && event.data?.event) {
            this.handleIncomingEvent(event.data.event);
          }
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }
  }

  /**
   * Broadcast state to sibling browser tabs
   */
  private broadcastLocalUpdate(state: GameState): void {
    if (this.localBroadcastChannel) {
      try {
        this.localBroadcastChannel.postMessage({
          type: 'STATE_UPDATE',
          gameState: state,
        });
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Start low-frequency fallback poll (runs only when Realtime is disconnected or unconfigured)
   */
  private startFallbackPoll(): void {
    if (this.fallbackPollTimer || !this.isConnected) return;
    this.fallbackPollTimer = setInterval(() => {
      if (this.isConnected && !this.isRealtimeConnected) {
        this.fetchState().catch(() => {});
      }
    }, 1000);
  }

  /**
   * Stop fallback poll
   */
  private stopFallbackPoll(): void {
    if (this.fallbackPollTimer) {
      clearInterval(this.fallbackPollTimer);
      this.fallbackPollTimer = null;
    }
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
   * Task 4.4E-2 & Task 4.4E-3: Dispatches commands to /api/game/[pin]/command
   * Server validates, mutates authoritative state, and broadcasts via Supabase Realtime.
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
        const state = (result.data as any).gameState;
        this.handleIncomingStateUpdate(state);
        this.broadcastLocalUpdate(state);
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
   * Check if Realtime connection is active
   */
  isRealtimeActive(): boolean {
    return this.isRealtimeConnected;
  }

  /**
   * Synchronous access to latest known public game state
   */
  getCurrentGameState(): GameState | null {
    return this.currentGameState;
  }

  // ==========================================================================
  // Incoming Data Handlers (Realtime Channel Ingestion)
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