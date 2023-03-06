import JuadzCache from './index';
// import useMemoryCacheAdaptor from './memory-cache';

import type {CacheClass} from 'memory-cache';
import {ICacheAdaptor} from '../types/cache';

export default function useMemoryCacheAdaptor(): ICacheAdaptor {
  let cacheInstance: CacheClass<string, unknown>;

  const cacheHandler = async () => {
    if (cacheInstance) {
      return cacheInstance;
    }
    const {Cache} = await import('memory-cache');
    cacheInstance = new Cache();
    return cacheInstance;
  };

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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

test('juadz cache', async () => {
  const cache = new JuadzCache(useMemoryCacheAdaptor());

  await cache.put('test', {data: 'test', value: 1}, 1);
  const data = await cache.get('test');
  expect(data).toMatchObject({data: 'test', value: 1});

  await sleep(1001);
  const failed = await cache.get('test');
  expect(failed).toBeNull();

  let count = 0;
  const getData = async () => {
    return {data: 'hello', value: count++};
  };

  const getDataFn = jest.fn(getData);

  const rdata = await cache.retrieve('test2', 1, getDataFn);
  expect(rdata).toMatchObject({data: 'hello', value: 0});

  expect(getDataFn).toBeCalled();
  expect(getDataFn).toBeCalledTimes(1);

  const getDataFn2 = jest.fn(getData);

  const rdata2 = await cache.retrieve('test2', 1, getDataFn2);
  expect(rdata2).toMatchObject({data: 'hello', value: 0});
  expect(getDataFn2).toHaveBeenCalledTimes(0);
});
