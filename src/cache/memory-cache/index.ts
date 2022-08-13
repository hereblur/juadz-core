import type {CacheClass} from 'memory-cache';
import {ICacheAdaptor} from '../../types/cache';

export default function useMemoryCacheAdaptor(
  memoryCacheInstance: CacheClass<string, unknown> | null = null
): ICacheAdaptor {
  let cacheInstance: CacheClass<string, unknown>;

  const cacheHandler = async () => {
    if (cacheInstance) {
      return cacheInstance;
    }
    const {Cache} = await import('memory-cache');
    cacheInstance = new Cache();
    return cacheInstance;
  };

  if (memoryCacheInstance) {
    cacheInstance = memoryCacheInstance;
  }

  return {
    get: async (k: string): Promise<unknown> =>
      (await cacheHandler()).get(k) as unknown,
    put: async (
      k: string,
      data: unknown,
      ageSeconds: number
    ): Promise<void> => {
      (await cacheHandler()).put(k, data, ageSeconds * 1000);
    },
    delete: async (k: string): Promise<void> => {
      (await cacheHandler()).del(k);
    },
  };
}
