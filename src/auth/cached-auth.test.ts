import JuadzCache from '../cache';
import useCachedAuth from './cached-auth';
import memoryCacheAdaptor from '../cache/memory-cache';
import {ErrorToHttp} from '../types/http';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface AnyObject {
  [k: string]: unknown;
}

test('cache auth', async () => {
  const cache = useCachedAuth(new JuadzCache(memoryCacheAdaptor()), 1);
  const actor = {
    name: 'test',
    permissions: ['a', 'b', 'c', 'd'],
  };

  const response = await cache.authen(actor);
  expect((response.body as AnyObject).bearerToken).toBeTruthy();

  const token = (response.body as AnyObject).bearerToken;

  const result = await cache.verify(token as string);
  expect(result).toMatchObject(actor);

  await sleep(1001);
  try {
    const failed = await cache.verify(token as string);
    expect(failed).toBeNull();
  } catch (error) {
    const e = error as ErrorToHttp;
    expect(e.statusCode).toBe(401);
  }
});
