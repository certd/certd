import { mitter } from "/@/utils/util.mitt";

let registed = false;
export function registerOnceVipModal(callback: () => void) {
  if (registed) {
    return;
  }
  registed = true;
  mitter.on("openVipModal", () => {
    callback();
  });
}
