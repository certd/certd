import _ from "lodash-es";
export function getEnvValue(key) {
  // @ts-ignore
  return import.meta.env["VITE_APP_" + key];
}

export class EnvConfig {
  API;
  MODE;
  STORAGE;
  TITLE;
  PM_ENABLED;
  constructor() {
    this.init();
  }

  init() {
    // @ts-ignore
    _.forEach(import.meta.env, (value, key) => {
      if (key.startsWith("VITE_APP")) {
        key = key.replace("VITE_APP_", "");
        this[key] = value;
      }
    });
    // @ts-ignore
    this.MODE = import.meta.env.MODE;
  }

  get(key, defaultValue) {
    return this[key] ?? defaultValue;
  }
  isDev() {
    return this.MODE === "development" || this.MODE === "debug";
  }
  isProd() {
    return this.MODE === "production";
  }
}

export const env = new EnvConfig();
