import { createClient } from 'redis';
import 'dotenv/config';
import { log } from './logger';

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on('error', (err) => log('error', 'Redis error', err));
client.connect().catch((err) => log('error', 'Redis connection failed', err));

const DEFAULT_EXPIRATION = 3600;

export default async function getOrSetCache(
  key: string,
  cb: () => Promise<any>
): Promise<any> {
  try {
    if (!client.isReady) return await cb();

    const cachedData = await client.get(key);
    if (cachedData) return JSON.parse(cachedData);

    const freshData = await cb();
    await client.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(freshData));
    return freshData;
  } catch (err) {
    log('error', 'Cache error, falling back to fresh data', err);
    return await cb();
  }
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    if (!client.isReady) return;
    await client.del(key);
  } catch (err) {
    log('error', 'Cache invalidation error', err);
  }
}

