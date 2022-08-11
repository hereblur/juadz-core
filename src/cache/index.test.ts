import JuadzCache from './index';
import useMemoryCacheAdaptor from './memory-cache';

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
