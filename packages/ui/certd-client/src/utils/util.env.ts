// @ts-ignore
import _ from "lodash-es";

export class EnvConfig {
  MODE: string = import.meta.env.MODE;
  API: string = import.meta.env.VITE_APP_API;
  STORAGE: string = import.meta.env.VITE_APP_STORAGE;
  TITLE: string = import.meta.env.VITE_APP_TITLE;
  SLOGAN: string = import.meta.env.VITE_APP_SLOGAN;
  COPYRIGHT_YEAR: string = import.meta.env.VITE_APP_COPYRIGHT_YEAR;
  COPYRIGHT_NAME: string = import.meta.env.VITE_APP_COPYRIGHT_NAME;
  COPYRIGHT_URL: string = import.meta.env.VITE_APP_COPYRIGHT_URL;
  LOGO: string = import.meta.env.VITE_APP_LOGO;
  PM_ENABLED: string = import.meta.env.VITE_APP_PM_ENABLED;
  ICP_NO: string = import.meta.env.VITE_APP_ICP_NO;

  init(env: any) {
    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        this[key] = env[key];
      }
    }
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
