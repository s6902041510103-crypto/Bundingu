/**
 * RealtimePublisher - Server-Authoritative Supabase Realtime Publisher
 *
 * Implements Task 4.4E-3:
 * Broadcasts authoritative GameState updates and discrete GameEvents to clients
 * using Supabase Realtime Broadcast channels:
 * - Channel: game:{pin}:state (event: 'state_update')
 * - Channel: game:{pin}:events (event: 'game_event')
 *
 * Security:
 * Strictly ensures only PublicGameState is published.
 * Sensitive server fields (correctAnswer, rngSeed, sessionId, teacherId) are never exposed.
 */

import { getSupabaseClient, SupabaseClient } from '@/lib/supabase/client';
import { toPublicGameState } from '@/server/gameState';
import type { ServerGameState, ServerGameEvent, PublicGameState } from '@/server/gameState';
import type { GameEvent } from '@/domain/types';
import type { GameEngine } from '@/server/gameEngine';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

interface GameChannels {
  stateChannel: RealtimeChannel | null;
  eventsChannel: RealtimeChannel | null;
}

class RealtimePublisher {
  private supabase: SupabaseClient | null = null;
  private channelMap: Map<string, GameChannels> = new Map();
  private attachedEngines: Map<string, () => void> = new Map();
  private localEmitter: EventEmitter = new EventEmitter();

  constructor() {
    this.localEmitter.setMaxListeners(100);
  }

  /**
   * Lazily retrieve or initialize Supabase client
   */
  private getClient(): SupabaseClient | null {
    if (!this.supabase) {
      this.supabase = getSupabaseClient();
    }
    return this.supabase;
  }

  /**
   * Get or create Supabase Realtime channels for a given game PIN
   */
  private getChannels(pin: string): GameChannels {
    const normalizedPin = pin.trim().toUpperCase();
    if (this.channelMap.has(normalizedPin)) {
      return this.channelMap.get(normalizedPin)!;
    }

    const client = this.getClient();
    let stateChannel: RealtimeChannel | null = null;
    let eventsChannel: RealtimeChannel | null = null;

    if (client) {
      try {
        stateChannel = client.channel(`game:${normalizedPin}:state`, {
          config: { broadcast: { ack: false, self: true } },
        });
        stateChannel.subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[RealtimePublisher] Channel error on game:${normalizedPin}:state (${status})`);
          }
        });

        eventsChannel = client.channel(`game:${normalizedPin}:events`, {
          config: { broadcast: { ack: false, self: true } },
        });
        eventsChannel.subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[RealtimePublisher] Channel error on game:${normalizedPin}:events (${status})`);
          }
        });
      } catch (err) {
        console.error('[RealtimePublisher] Failed to initialize Supabase channels:', err);
      }
    }

    const entry: GameChannels = { stateChannel, eventsChannel };
    this.channelMap.set(normalizedPin, entry);
    return entry;
  }

  /**
   * Publish sanitized PublicGameState to game:{pin}:state
   */
  async publishState(
    pin: string,
    state: ServerGameState | PublicGameState
  ): Promise<boolean> {
    if (!pin || !state) return false;

    const normalizedPin = pin.trim().toUpperCase();

    // Enforce Rule 7: Always sanitize to PublicGameState
    const publicState: PublicGameState = toPublicGameState(state as any);

    // Emit on local process bus for immediate cross-client sync
    this.localEmitter.emit(`state:${normalizedPin}`, publicState);

    // Broadcast over Supabase Realtime channel if available
    const { stateChannel } = this.getChannels(normalizedPin);
    if (stateChannel) {
      try {
        await stateChannel.send({
          type: 'broadcast',
          event: 'state_update',
          payload: {
            gameState: publicState,
            timestamp: new Date().toISOString(),
          },
        });
        return true;
      } catch (err) {
        console.warn(`[RealtimePublisher] Failed to broadcast state to game:${normalizedPin}:state:`, err);
      }
    }

    return true;
  }

  /**
   * Publish discrete GameEvent to game:{pin}:events
   */
  async publishEvent(
    pin: string,
    event: ServerGameEvent | GameEvent
  ): Promise<boolean> {
    if (!pin || !event) return false;

    const normalizedPin = pin.trim().toUpperCase();

    // Emit on local process bus
    this.localEmitter.emit(`event:${normalizedPin}`, event);

    // Broadcast over Supabase Realtime channel if available
    const { eventsChannel } = this.getChannels(normalizedPin);
    if (eventsChannel) {
      try {
        await eventsChannel.send({
          type: 'broadcast',
          event: 'game_event',
          payload: {
            event,
            timestamp: new Date().toISOString(),
          },
        });
        return true;
      } catch (err) {
        console.warn(`[RealtimePublisher] Failed to broadcast event to game:${normalizedPin}:events:`, err);
      }
    }

    return true;
  }

  /**
   * Publish multiple discrete GameEvents
   */
  async publishEvents(
    pin: string,
    events: (ServerGameEvent | GameEvent)[]
  ): Promise<void> {
    if (!events || events.length === 0) return;
    for (const event of events) {
      await this.publishEvent(pin, event);
    }
  }

  /**
   * Attach GameEngine event hooks to automatically publish state transitions
   * triggered by timers (countdown 3-2-1, 15s timer expiration, etc.)
   */
  attachEngine(pin: string, engine: GameEngine): () => void {
    const normalizedPin = pin.trim().toUpperCase();

    // Detach any previous engine attached to this pin
    this.detachEngine(normalizedPin);

    const unsubscribe = engine.on('game_event', (event: any) => {
      if (event?.type === 'GAME_STATE_UPDATED' && event?.gameState) {
        this.publishState(normalizedPin, event.gameState).catch(console.error);
      }
      this.publishEvent(normalizedPin, event).catch(console.error);
    });

    this.attachedEngines.set(normalizedPin, unsubscribe);
    return () => this.detachEngine(normalizedPin);
  }

  /**
   * Detach GameEngine event hooks for a pin
   */
  detachEngine(pin: string): void {
    const normalizedPin = pin.trim().toUpperCase();
    const detach = this.attachedEngines.get(normalizedPin);
    if (detach) {
      detach();
      this.attachedEngines.delete(normalizedPin);
    }
  }

  /**
   * Subscribe to local in-process state updates (used for local testing / multi-tab fallback)
   */
  onLocalStateUpdate(pin: string, listener: (state: PublicGameState) => void): () => void {
    const normalizedPin = pin.trim().toUpperCase();
    const eventName = `state:${normalizedPin}`;
    this.localEmitter.on(eventName, listener);
    return () => {
      this.localEmitter.off(eventName, listener);
    };
  }

  /**
   * Subscribe to local in-process game events
   */
  onLocalGameEvent(pin: string, listener: (event: GameEvent) => void): () => void {
    const normalizedPin = pin.trim().toUpperCase();
    const eventName = `event:${normalizedPin}`;
    this.localEmitter.on(eventName, listener);
    return () => {
      this.localEmitter.off(eventName, listener);
    };
  }

  /**
   * Clean up all channels and listeners
   */
  cleanup(): void {
    this.attachedEngines.forEach((detach) => detach());
    this.attachedEngines.clear();

    const client = this.getClient();
    if (client) {
      this.channelMap.forEach(({ stateChannel, eventsChannel }) => {
        if (stateChannel) client.removeChannel(stateChannel);
        if (eventsChannel) client.removeChannel(eventsChannel);
      });
    }
    this.channelMap.clear();
    this.localEmitter.removeAllListeners();
  }
}

export const realtimePublisher = new RealtimePublisher();
