import { usePermissionStore } from "./store.permission";
import { NoPermissionError } from "./errors";
import { message } from "ant-design-vue";
const util = {
  hasPermissions: (value: string | string[]): boolean => {
    let need: string[] = [];
    if (typeof value === "string") {
      need.push(value);
    } else if (value && value instanceof Array && value.length > 0) {
      need = need.concat(value);
    }
    if (need.length === 0) {
      throw new Error('need permissions! Like "sys:user:view" ');
    }
    const permissionStore = usePermissionStore();
    const userPermissionList = permissionStore.getPermissions;
    return userPermissionList.some((permission: any) => {
      return need.includes(permission);
    });
  },
  requirePermissions: (value: any) => {
    if (!util.hasPermissions(value)) {
      message.error("对不起，您没有权限执行此操作");
      throw new NoPermissionError();
    }
  }
};

export default util;
