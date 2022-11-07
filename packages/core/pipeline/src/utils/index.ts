import sleep from "./util.sleep";
import { request } from "./util.request";
export * from "./util.log";
export const utils = {
  sleep,
  http: request,
};
