import { IStorage, MemoryStorage } from "./storage";

export interface IContext {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  getObj(key: string): Promise<any>;
  setObj(key: string, value: any): Promise<void>;
}

export class ContextFactory {
  storage: IStorage;
  memoryStorage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.memoryStorage = new MemoryStorage();
  }

  getContext(scope: string, namespace: string): IContext {
    return new StorageContext(scope, namespace, this.storage);
  }

  getMemoryContext(scope: string, namespace: string): IContext {
    return new StorageContext(scope, namespace, this.memoryStorage);
  }
}

export class StorageContext implements IContext {
  storage: IStorage;
  namespace: string;
  scope: string;
  constructor(scope: string, namespace: string, storage: IStorage) {
    this.storage = storage;
    this.scope = scope;
    this.namespace = namespace;
  }

  async get(key: string) {
    return await this.storage.get(this.scope, this.namespace, key);
  }
  async set(key: string, value: string) {
    return await this.storage.set(this.scope, this.namespace, key, value);
  }
  async getObj(key: string): Promise<any> {
    const str = await this.get(key);
    if (str) {
      const store = JSON.parse(str);
      return store.value;
    }
    return null;
  }

  async setObj(key: string, value: any) {
    await this.set(key, JSON.stringify({ value }));
  }
}
