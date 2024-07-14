// @ts-ignore
import _ from "lodash-es";
export function getEnvValue(key: string) {
  // @ts-ignore
  return import.meta.env["VITE_APP_" + key];
}

export class EnvConfig {
  API: string;
  MODE: string;
  STORAGE: string;
  TITLE: string;
  SLOGAN: string;
  COPYRIGHT_YEAR: string;
  COPYRIGHT_NAME: string;
  COPYRIGHT_URL: string;
  LOGO_PATH: string;
  PM_ENABLED: string;
  ICP_NO: string;
  constructor() {
    this.init();
  }

  init() {
    // @ts-ignore
    _.forEach(import.meta.env, (value, key) => {
      if (key.startsWith("VITE_APP")) {
        key = key.replace("VITE_APP_", "");
        // @ts-ignore
        this[key] = value;
      }
    });
    // @ts-ignore
    this.MODE = import.meta.env.MODE;
  }

  get(key: string, defaultValue: string) {
    //@ts-ignore
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
