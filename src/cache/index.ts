import {ICacheAdaptor} from '../types/cache';

export default class JuadzCache {
  client: ICacheAdaptor;

  constructor(client: ICacheAdaptor) {
    this.client = client;
  }

  async get(key: string): Promise<unknown> {
    return await this.client.get(key);
  }

  async put(key: string, data: unknown, ageSeconds: number): Promise<void> {
    return await this.client.put(key, data, ageSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.client.delete(key);
  }

  async retrieve(
    key: string,
    ageSeconds: number,
    cacheMissGetData: () => Promise<unknown>,
    cacheHitCallback?: Function
  ): Promise<unknown> {
    const data = await this.client.get(key);
    if (data) {
      if (cacheHitCallback) {
        cacheHitCallback(key, data);
      }
      return data;
    }

    const newData = await cacheMissGetData();
    if (newData) {
      this.client.put(key, newData, ageSeconds);
    }

    return newData;
  }
}
