import { logger } from "@certd/basic";
import { isPlus } from "@certd/plus-core";

let adminMode = "saas";

export function setAdminMode(mode: string = "saas") {
  adminMode = mode;
}
export function getAdminMode() {
  return adminMode;
}

export function isEnterprise() {
  const isEnterprise = adminMode === "enterprise";
  if (!isPlus()) {
    if (isEnterprise) {
      logger.warn("不是VIP，无法使用企业项目管理功能，退回普通模式");
    }
    return false;
  }
  return isEnterprise;
}
