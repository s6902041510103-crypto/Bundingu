import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Global bus for local in-memory Realtime broadcast channels (used in offline / test / dev mode)
class MockRealtimeBus {
  private channels: Map<string, Set<LocalRealtimeChannel>> = new Map();

  register(topic: string, channel: LocalRealtimeChannel): void {
    if (!this.channels.has(topic)) {
      this.channels.set(topic, new Set());
    }
    this.channels.get(topic)!.add(channel);
  }

  unregister(topic: string, channel: LocalRealtimeChannel): void {
    const set = this.channels.get(topic);
    if (set) {
      set.delete(channel);
      if (set.size === 0) {
        this.channels.delete(topic);
      }
    }
  }

  broadcast(topic: string, event: string, payload: any): void {
    const set = this.channels.get(topic);
    if (set) {
      set.forEach((ch) => {
        ch.deliverBroadcast(event, payload);
      });
    }
  }
}

const globalRealtimeBus = new MockRealtimeBus();

export class LocalRealtimeChannel {
  readonly topic: string;
  private listeners: Map<string, Array<(payload: any) => void>> = new Map();
  private statusListeners: Array<(status: string, err?: any) => void> = [];
  private isSubscribed: boolean = false;

  constructor(topic: string) {
    this.topic = topic;
  }

  on(type: string, filter: { event: string }, callback: (payload: any) => void): this {
    if (type === 'broadcast') {
      const eventKey = filter.event;
      if (!this.listeners.has(eventKey)) {
        this.listeners.set(eventKey, []);
      }
      this.listeners.get(eventKey)!.push(callback);
    }
    return this;
  }

  subscribe(callback?: (status: string, err?: any) => void): this {
    if (callback) {
      this.statusListeners.push(callback);
    }
    this.isSubscribed = true;
    globalRealtimeBus.register(this.topic, this);

    setTimeout(() => {
      if (this.isSubscribed) {
        this.statusListeners.forEach((fn) => {
          try {
            fn('SUBSCRIBED');
          } catch (e) {
            console.error(e);
          }
        });
      }
    }, 0);

    return this;
  }

  async unsubscribe(): Promise<'ok'> {
    this.isSubscribed = false;
    globalRealtimeBus.unregister(this.topic, this);
    this.statusListeners.forEach((fn) => {
      try {
        fn('CLOSED');
      } catch {}
    });
    return 'ok';
  }

  async send(msg: { type: string; event: string; payload: any }): Promise<'ok'> {
    if (msg.type === 'broadcast') {
      globalRealtimeBus.broadcast(this.topic, msg.event, msg.payload);
    }
    return 'ok';
  }

  deliverBroadcast(event: string, payload: any): void {
    const list = this.listeners.get(event) || [];
    list.forEach((cb) => {
      try {
        cb({ event, payload });
      } catch (err) {
        console.error('[LocalRealtimeChannel] Error in broadcast listener:', err);
      }
    });
  }
}

function createLocalSupabaseClient(): SupabaseClient {
  const activeChannels = new Map<string, LocalRealtimeChannel>();

  const client = {
    channel(topic: string): RealtimeChannel {
      const ch = new LocalRealtimeChannel(topic);
      activeChannels.set(topic, ch);
      return ch as unknown as RealtimeChannel;
    },
    removeChannel(channel: any): Promise<'ok'> {
      if (channel && typeof channel.unsubscribe === 'function') {
        return channel.unsubscribe();
      }
      return Promise.resolve('ok');
    },
    getChannels(): RealtimeChannel[] {
      return Array.from(activeChannels.values()) as unknown as RealtimeChannel[];
    },
  } as unknown as SupabaseClient;

  return client;
}

let cachedClient: SupabaseClient | null = null;
let cachedLocalClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client.
 * If credentials are configured, connects to Supabase Realtime cloud service.
 * If credentials are not configured, provides a local in-memory Realtime client
 * adhering to the exact same Realtime channel subscription and broadcast contract.
 */
export function getSupabaseClient(url?: string, anonKey?: string): SupabaseClient {
  const targetUrl = url || supabaseUrl;
  const targetKey = anonKey || supabaseAnonKey;

  // Real Supabase credentials present
  if (targetUrl && targetKey && targetUrl.startsWith('http')) {
    if (url || anonKey) {
      return createClient(targetUrl, targetKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    }

    if (!cachedClient) {
      cachedClient = createClient(targetUrl, targetKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    }

    return cachedClient;
  }

  // Fallback to in-memory Realtime client
  if (!cachedLocalClient) {
    cachedLocalClient = createLocalSupabaseClient();
  }
  return cachedLocalClient;
}

/**
 * Default Supabase client instance
 */
export const supabase: SupabaseClient = getSupabaseClient();

export type { SupabaseClient };