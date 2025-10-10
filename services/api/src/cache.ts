import Redis from 'ioredis';

type MemoryEntry = {
  value: string;
  expiresAt: number;
};

const memoryStore = new Map<string, MemoryEntry>();
const desiredProvider = (process.env.CACHE_PROVIDER ?? 'memory').toLowerCase();
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

let redisClient: Redis | null = null;
let redisReady = false;

if (desiredProvider === 'redis') {
  redisClient = new Redis(redisUrl, { lazyConnect: true });
  redisClient.on('ready', () => {
    redisReady = true;
  });
  redisClient.on('error', () => {
    redisReady = false;
  });
  redisClient.on('end', () => {
    redisReady = false;
  });
  redisClient
    .connect()
    .then(() => {
      redisReady = true;
    })
    .catch(() => {
      redisReady = false;
    });
}

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

function deserialize<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setMemory(key: string, value: string, ttlSeconds: number): void {
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

function getMemory<T>(key: string): T | null {
  const entry = memoryStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }

  return deserialize<T>(entry.value);
}

export async function get<T>(key: string): Promise<T | null> {
  if (redisClient && redisReady) {
    try {
      const raw = await redisClient.get(key);
      const parsed = deserialize<T>(raw);
      if (parsed) {
        return parsed;
      }
    } catch {
      redisReady = false;
    }
  }

  return getMemory<T>(key);
}

export async function set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const serialized = serialize(value);

  if (redisClient && redisReady) {
    try {
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
      return;
    } catch {
      redisReady = false;
    }
  }

  setMemory(key, serialized, ttlSeconds);
}

export async function del(key: string): Promise<void> {
  if (redisClient && redisReady) {
    try {
      await redisClient.del(key);
    } catch {
      redisReady = false;
    }
  }
  memoryStore.delete(key);
}

export async function flush(prefix?: string): Promise<void> {
  if (prefix) {
    for (const key of memoryStore.keys()) {
      if (key.startsWith(prefix)) {
        memoryStore.delete(key);
      }
    }
  } else {
    memoryStore.clear();
  }

  if (redisClient && redisReady) {
    try {
      if (prefix) {
        let cursor = '0';
        do {
          // eslint-disable-next-line no-await-in-loop
          const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
          cursor = nextCursor;
          if (keys.length > 0) {
            // eslint-disable-next-line no-await-in-loop
            await redisClient.del(...keys);
          }
        } while (cursor !== '0');
      } else {
        await redisClient.flushdb();
      }
    } catch {
      redisReady = false;
    }
  }
}

export function ready(): boolean {
  return redisReady;
}
