import permission from "./permission.js";
import permissionUtil from "../util.permission";
const install = function (app: any) {
  app.directive("permission", permission);
  app.config.globalProperties.$hasPermissions = permissionUtil.hasPermissions;
};

export default {
  install,
  ...permission
};
