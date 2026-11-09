import type { ServerRoom } from "./game-engine";
import type { StorageSchema } from "./repository";

const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL ||
  "https://beloved-cat-144821.upstash.io";

const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  "gQAAAAAAAjW1AAIgcDE1MjhlMWFjZDliMzI0MzQxYmMzOWMxYTdkMzg2NDJiZA";

export function isRedisConfigured(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

/**
 * Execute a raw Upstash Redis command via REST API without requiring heavy external dependencies.
 */
export async function upstashCommand<T = unknown>(command: (string | number)[]): Promise<T | null> {
  if (!isRedisConfigured()) return null;
  try {
    const res = await fetch(`${REDIS_URL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      // Don't cache in Next.js fetch cache
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: T; error?: string };
    if (json.error) return null;
    return json.result !== undefined ? json.result : null;
  } catch {
    return null;
  }
}

/**
 * Store a live room in Redis with 24-hour expiration (86400s).
 */
export async function saveRoomToRedis(room: ServerRoom): Promise<boolean> {
  if (!isRedisConfigured()) return false;
  try {
    const pin = room.pin.toUpperCase();
    const key = `ks:room:${pin}`;
    const value = JSON.stringify(room);
    // SET key value EX 86400
    const res = await upstashCommand<string>(["SET", key, value, "EX", 86400]);
    return res === "OK";
  } catch {
    return false;
  }
}

/**
 * Retrieve a live room from Redis.
 */
export async function getRoomFromRedis(pin: string): Promise<ServerRoom | null> {
  if (!isRedisConfigured()) return null;
  try {
    const cleanPin = pin.trim().toUpperCase();
    const key = `ks:room:${cleanPin}`;
    const raw = await upstashCommand<string>(["GET", key]);
    if (!raw) return null;
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as ServerRoom) : (raw as ServerRoom);
    if (parsed && parsed.pin && parsed.state) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Delete a room from Redis.
 */
export async function deleteRoomFromRedis(pin: string): Promise<boolean> {
  if (!isRedisConfigured()) return false;
  try {
    const cleanPin = pin.trim().toUpperCase();
    const key = `ks:room:${cleanPin}`;
    await upstashCommand(["DEL", key]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save persistent store schema to Redis.
 */
export async function saveStoreToRedis(store: StorageSchema): Promise<boolean> {
  if (!isRedisConfigured()) return false;
  try {
    const value = JSON.stringify(store);
    const res = await upstashCommand<string>(["SET", "ks:global:store", value]);
    return res === "OK";
  } catch {
    return false;
  }
}

/**
 * Get persistent store schema from Redis.
 */
export async function getStoreFromRedis(): Promise<StorageSchema | null> {
  if (!isRedisConfigured()) return null;
  try {
    const raw = await upstashCommand<string>(["GET", "ks:global:store"]);
    if (!raw) return null;
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as StorageSchema) : (raw as StorageSchema);
    if (parsed && Array.isArray(parsed.questions)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}