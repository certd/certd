import permission from "./permission";
import permissionUtil from "../util.permission";
const install = function (app) {
  app.directive("permission", permission);
  app.config.globalProperties.$hasPermissions = permissionUtil.hasPermissions;
};

permission.install = install;
export default permission;
