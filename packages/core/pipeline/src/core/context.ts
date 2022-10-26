import { IStorage } from "./storage";

export interface IContext {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
}

export class ContextFactory {
  storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  getContext(scope: string, namespace: string): IContext {
    return new StorageContext(scope, namespace, this.storage);
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
  async get(key: string): Promise<any> {
    const str = await this.storage.get(this.scope, this.namespace, key);
    if (str) {
      const store = JSON.parse(str);
      return store.value;
    }
    return null;
  }

  async set(key: string, value: any) {
    await this.storage.set(this.scope, this.namespace, key, JSON.stringify({ value }));
  }
}
