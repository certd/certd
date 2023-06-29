import { env } from "./util.env";
function isNullOrUnDef(value: any) {
  return value == null;
}
const DEFAULT_CACHE_TIME = 60 * 60 * 24 * 7;
export interface CreateStorageParams {
  prefixKey: string;
  storage: Storage;
  timeout?: number;
}

/**
 *Cache class
 *Construction parameters can be passed into sessionStorage, localStorage,
 * @class Cache
 * @example
 */
export class WebStorage {
  private storage: Storage;
  private prefixKey?: string;
  private timeout?: number;
  /**
   *
   * @param option
   */
  constructor(option: Partial<CreateStorageParams>) {
    this.storage = option.storage ?? localStorage;
    this.prefixKey = option.prefixKey ?? getStorageShortName();
    this.timeout = option.timeout ?? DEFAULT_CACHE_TIME;
  }

  private getKey(key: string) {
    return `${this.prefixKey}${key}`.toUpperCase();
  }

  /**
   *
   *  Set cache
   * @param {string} key
   * @param {*} value
   * @param expire
   * @expire Expiration time in seconds
   * @memberof Cache
   */
  set(key: string, value: any, expire: number | undefined = this.timeout) {
    const stringData = JSON.stringify({
      value,
      time: Date.now(),
      expire: expire != null ? new Date().getTime() + expire * 1000 : null
    });
    this.storage.setItem(this.getKey(key), stringData);
  }

  /**
   *Read cache
   * @param {string} key
   * @param def
   * @memberof Cache
   */
  get(key: string, def: any = null): any {
    const val = this.storage.getItem(this.getKey(key));
    if (!val) return def;

    try {
      const data = JSON.parse(val);
      const { value, expire } = data;
      if (isNullOrUnDef(expire) || expire >= new Date().getTime()) {
        return value;
      }
      this.remove(key);
    } catch (e) {
      return def;
    }
  }

  /**
   * Delete cache based on key
   * @param {string} key
   * @memberof Cache
   */
  remove(key: string) {
    this.storage.removeItem(this.getKey(key));
  }

  /**
   * Delete all caches of this instance
   */
  clear(): void {
    this.storage.clear();
  }
}
export const createStorage = (option: Partial<CreateStorageParams> = {}): WebStorage => {
  return new WebStorage(option);
};

export type Options = Partial<CreateStorageParams>;

function getStorageShortName() {
  return env.MODE + "_" + env.get("STORAGE", "certd") + "_";
}

export const createSessionStorage = (options: Options = {}): WebStorage => {
  return createStorage({ storage: sessionStorage, ...options });
};

export const createLocalStorage = (options: Options = {}): WebStorage => {
  return createStorage({ storage: localStorage, timeout: DEFAULT_CACHE_TIME, ...options });
};

export const SessionStorage = createSessionStorage();
export const LocalStorage = createLocalStorage();

export default WebStorage;
