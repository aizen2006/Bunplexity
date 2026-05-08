import { createClient } from 'redis';

const client = createClient({
  url: 'redis://localhost:6379',
});

const DEFAULT_EXPIRATION = 3600;

export default async function getOrSetCache(
  key: string,
  cb: () => Promise<any>
): Promise<any> {
  const cachedData = await client.get(key);

  if (cachedData) {
    return JSON.parse(cachedData);
  }

  const freshData = await cb();

  await client.setEx(
    key,
    DEFAULT_EXPIRATION,
    JSON.stringify(freshData)
  );

  return freshData;
}

