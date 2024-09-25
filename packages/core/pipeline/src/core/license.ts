import { logger } from "../utils/index.js";
import { setLogger, isPlus } from "@certd/plus-core";
setLogger(logger);
export * from "@certd/plus-core";

export function checkPlus() {
  if (!isPlus()) {
    throw new Error("此为专业版功能，请升级到专业版");
  }
}
