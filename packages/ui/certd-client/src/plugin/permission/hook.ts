import router from "/src/router";
import { useUserStore } from "/@/store/user";
import { usePermissionStore } from "./store.permission";
import util from "./util.permission";
import { message } from "ant-design-vue";
import NProgress from "nprogress";
export function registerRouterHook() {
  // 注册路由beforeEach钩子，在第一次加载路由页面时，加载权限
  router.beforeEach(async (to, from) => {
    const permissionStore = usePermissionStore();
    if (permissionStore.isInited) {
      if (to.meta.permission) {
        //校验权限
        // @ts-ignore
        if (!util.hasPermissions(to.meta.permission)) {
          //没有权限
          message.warn("对不起，您没有权限");
          //throw new Error("对不起，您没有权限");
          NProgress.done();
          return false;
        }
      }
      return true;
    }

    const userStore = useUserStore();
    const token = userStore.getToken;
    if (!token || token === "undefined") {
      return true;
    }
    // 初始化权限列表
    try {
      console.log("permission is enabled");
      await permissionStore.loadFromRemote();
      console.log("PM load success");
      return { ...to, replace: true };
    } catch (e) {
      console.error("加载动态路由失败", e);
      return false;
    }
  });
}
