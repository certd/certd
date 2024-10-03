import { logger } from "../utils/index.js";
import { setLogger, isPlus, isComm } from "@certd/plus-core";
setLogger(logger);
export * from "@certd/plus-core";

export function checkPlus() {
  if (!isPlus()) {
    throw new Error("此为专业版功能，请升级到专业版");
  }
}

export function checkComm() {
  if (!isComm()) {
    throw new Error("此为商业版功能，请升级到商业版");
  }
}
