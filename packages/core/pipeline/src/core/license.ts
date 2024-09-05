import { logger } from "../utils/index.js";
import { setLogger, isPlus } from "@certd/plus";
setLogger(logger);
export * from "@certd/plus";

export function checkPlus() {
  if (!isPlus()) {
    throw new Error("此为专业版功能，请升级到专业版");
  }
}
