import sleep from "./util.sleep";
import { request } from "./util.request";
export * from "./util.log";
export * from "./util.file";
export const utils = {
  sleep,
  http: request,
};
