/**
 * GameStorage - Vercel KV / Upstash Redis Persistent Database Adapter
 *
 * Enables persistent authoritative game state storage directly on Vercel
 * without requiring Supabase.
 *
 * Supported Vercel Environment Variables:
 * - KV_REST_API_URL & KV_REST_API_TOKEN (Vercel KV default)
 * - UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN (Vercel Marketplace Redis)
 *
 * Falls back gracefully to in-memory storage during local testing or development.
 */

import { Redis } from '@upstash/redis';
import type { ServerGameState } from '@/server/gameState';

class GameStorage {
  private redis: Redis | null = null;
  private inMemoryMap: Map<string, ServerGameState> = new Map();
  private isVercelConfigured: boolean = false;

  constructor() {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      try {
        this.redis = new Redis({ url, token });
        this.isVercelConfigured = true;
      } catch (err) {
        console.warn('[GameStorage] Failed to initialize Vercel KV / Redis, falling back to memory:', err);
      }
    }
  }

  /**
   * Check whether Vercel KV / Redis database is configured and active
   */
  isUsingVercelDatabase(): boolean {
    return this.isVercelConfigured && this.redis !== null;
  }

  /**
   * Retrieve authoritative ServerGameState for a given PIN
   */
  async getGameState(pin: string): Promise<ServerGameState | null> {
    const normalizedPin = pin.trim().toUpperCase();

    if (this.redis) {
      try {
        const state = await this.redis.get<ServerGameState>(`game:${normalizedPin}:state`);
        if (state) {
          // Sync to local memory cache
          this.inMemoryMap.set(normalizedPin, state);
          return state;
        }
      } catch (err) {
        console.warn(`[GameStorage] Error reading game:${normalizedPin} from Vercel KV:`, err);
      }
    }

    return this.inMemoryMap.get(normalizedPin) || null;
  }

  /**
   * Save authoritative ServerGameState to Vercel KV with 24h TTL
   */
  async saveGameState(
    pin: string,
    state: ServerGameState,
    ttlSeconds: number = 86400
  ): Promise<void> {
    const normalizedPin = pin.trim().toUpperCase();
    this.inMemoryMap.set(normalizedPin, state);

    if (this.redis) {
      try {
        await this.redis.set(`game:${normalizedPin}:state`, state, { ex: ttlSeconds });
      } catch (err) {
        console.warn(`[GameStorage] Error writing game:${normalizedPin} to Vercel KV:`, err);
      }
    }
  }

  /**
   * Delete game state from Vercel KV
   */
  async deleteGameState(pin: string): Promise<void> {
    const normalizedPin = pin.trim().toUpperCase();
    this.inMemoryMap.delete(normalizedPin);

    if (this.redis) {
      try {
        await this.redis.del(`game:${normalizedPin}:state`);
      } catch (err) {
        console.warn(`[GameStorage] Error deleting game:${normalizedPin} from Vercel KV:`, err);
      }
    }
  }
}

export const gameStorage = new GameStorage();
