export interface ICacheAdaptor {
  get: (key: string) => Promise<unknown>;
  put: (key: string, data: unknown, ageSeconds: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
}
