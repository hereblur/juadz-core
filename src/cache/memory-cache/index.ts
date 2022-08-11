import {Cache, CacheClass} from 'memory-cache';
import {ICacheAdaptor} from '../../types/cache';

export default function useMemoryCacheAdaptor(
  memoryCacheInstance: CacheClass<string, unknown> | null = null
): ICacheAdaptor {
  const cacheInstance = memoryCacheInstance ? memoryCacheInstance : new Cache();

  return {
    get: async (k: string): Promise<unknown> => cacheInstance.get(k) as unknown,
    put: async (
      k: string,
      data: unknown,
      ageSeconds: number
    ): Promise<void> => {
      cacheInstance.put(k, data, ageSeconds * 1000);
    },
    delete: async (k: string): Promise<void> => {
      cacheInstance.del(k);
    },
  };
}
