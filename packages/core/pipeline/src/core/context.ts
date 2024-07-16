import { IStorage, MemoryStorage } from "./storage.js";

const CONTEXT_VERSION_KEY = "contextVersion";
export interface IContext {
  getInt(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  getObj<T = any>(key: string): Promise<T | null>;
  setObj<T = any>(key: string, value: T): Promise<void>;
  updateVersion(): Promise<void>;
  initVersion(): Promise<void>;
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

  _version = 0;
  _initialVersion = 0;
  constructor(scope: string, namespace: string, storage: IStorage) {
    this.storage = storage;
    this.scope = scope;
    this.namespace = namespace;
  }

  async initVersion() {
    const version = await this.getInt(CONTEXT_VERSION_KEY);
    this._initialVersion = version;
    this._version = version;
  }

  async updateVersion() {
    if (this._version === this._initialVersion) {
      this._version++;
    }

    await this.set(CONTEXT_VERSION_KEY, this._version.toString());
  }

  async get(key: string) {
    const version = key === CONTEXT_VERSION_KEY ? 0 : this._version;
    return await this.storage.get(this.scope, this.namespace, version.toString(), key);
  }
  async set(key: string, value: string) {
    const version = key === CONTEXT_VERSION_KEY ? 0 : this._version;
    return await this.storage.set(this.scope, this.namespace, version.toString(), key, value);
  }

  async getInt(key: string): Promise<number> {
    const str = await this.get(key);
    if (str) {
      return parseInt(str);
    }
    return 0;
  }
  async getObj<T = any>(key: string): Promise<T | null> {
    const str = await this.get(key);
    if (str) {
      const store = JSON.parse(str);
      return store.value;
    }
    return null;
  }

  async setObj<T = any>(key: string, value: T) {
    await this.set(key, JSON.stringify({ value }));
  }
}
