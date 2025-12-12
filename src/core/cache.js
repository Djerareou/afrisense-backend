let redisClient = null;
let inMemory = new Map();

async function getRedisClient() {
  if (redisClient) return redisClient;
  try {
    const { createClient } = await import('redis');
    redisClient = createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
    redisClient.on('error', (e) => console.error('Redis error', e));
    await redisClient.connect();
    return redisClient;
  } catch (err) {
    // redis not available, use in-memory
    return null;
  }
}

export async function cacheGet(key) {
  const client = await getRedisClient();
  if (client) {
    const v = await client.get(key);
    return v ? JSON.parse(v) : null;
  }
  const entry = inMemory.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    inMemory.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  const client = await getRedisClient();
  if (client) {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return;
  }
  inMemory.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
}

export default { cacheGet, cacheSet };
