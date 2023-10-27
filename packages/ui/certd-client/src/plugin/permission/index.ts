import permissionDirective from "./directive/index.js";
import { registerRouterHook } from "./hook";
import util from "./util.permission";
export * from "./use-crud-permission";
export * from "./errors";

export function usePermission() {
  return {
    ...util
  };
}

export default {
  install(app: any) {
    // 开启权限模块
    // 注册v-permission指令, 用于控制按钮权限
    app.use(permissionDirective);
    // 注册路由钩子
    // 通过路由守卫，在登录成功后拦截路由，从后台加载权限数据
    // 然后将权限数据转化为菜单和路由，添加到系统中
    registerRouterHook();
  }
};
