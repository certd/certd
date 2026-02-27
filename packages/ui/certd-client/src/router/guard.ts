import type { Router } from "vue-router";

import { DEFAULT_HOME_PATH, LOGIN_PATH } from "/@/vben/constants";
import { preferences } from "/@/vben/preferences";
import { useAccessStore } from "/@/vben/stores";
import { generateMenus, startProgress, stopProgress } from "/@/vben/utils";
import { frameworkRoutes } from "/@/router/resolve";
import { useSettingStore } from "/@/store/settings";
import { usePermissionStore } from "/@/plugin/permission/store.permission";
import util from "/@/plugin/permission/util.permission";
import { useUserStore } from "/@/store/user";
import { useProjectStore } from "../store/project";
export const PROJECT_JOIN_PATH = "/certd/project/join";
function buildAccessedMenus(menus: any) {
  if (menus == null) {
    return;
  }
  const list: any = [];
  for (const sub of menus) {
    if (sub.meta?.permission != null) {
      if (!util.hasPermissions(sub.meta.permission)) {
        continue;
      }
    }
    const item: any = {
      ...sub,
    };

    list.push(item);
    if (sub.children && sub.children.length > 0) {
      item.children = buildAccessedMenus(sub.children);
    }
  }
  return list;
}
/**
 * 通用守卫配置
 * @param router
 */
export function setupCommonGuard(router: Router) {
  // 记录已经加载的页面
  const loadedPaths = new Set<string>();

  router.beforeEach(async to => {
    const settingStore = useSettingStore();
    await settingStore.initOnce();

    to.meta.loaded = loadedPaths.has(to.path);

    // 页面加载进度条
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach(to => {
    // 记录页面是否加载,如果已经加载，后续的页面切换动画等效果不在重复执行

    loadedPaths.add(to.path);

    // 关闭页面加载进度条
    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}

/**
 * 权限访问守卫配置
 * @param router
 */
function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    if (to.matched && to.matched.length > 2) {
      to.matched.splice(1, to.matched.length - 2);
    }

    const accessStore = useAccessStore();
    // 是否已经生成过动态路由
    if (!accessStore.isAccessChecked) {
      if (accessStore.accessToken) {
        //如果已登录
        const permissionStore = usePermissionStore();
        await permissionStore.loadFromRemote();
        const userStore = useUserStore();
        await userStore.getUserInfoAction();
      }

      const settingsStore = useSettingStore();
      const headerMenus: any[] = settingsStore.getHeaderMenus;
      let allMenus = await generateMenus(frameworkRoutes[0].children, router);
      allMenus = allMenus.concat(headerMenus);
      const accessibleMenus = buildAccessedMenus(allMenus);
      accessStore.setAccessRoutes(frameworkRoutes);
      accessStore.setAccessMenus(accessibleMenus);
      accessStore.setIsAccessChecked(true);
    }

    // 基本路由，这些路由不需要进入权限拦截
    const needAuth = to.matched.some(r => {
      return r.meta?.auth || r.meta?.permission;
    });

    if (to.path === LOGIN_PATH && accessStore.accessToken) {
      return {
        path: DEFAULT_HOME_PATH,
        // 携带当前跳转的页面，登录后重新跳转该页面
        replace: true,
      };
    }

    if (!needAuth) {
      return true;
    }
    if (!accessStore.accessToken) {
      // 没有访问权限，跳转登录页面
      if (to.fullPath !== LOGIN_PATH) {
        return {
          path: LOGIN_PATH,
          // 如不需要，直接删除 query
          query: to.fullPath === DEFAULT_HOME_PATH ? {} : { redirect: encodeURIComponent(to.fullPath) },
          // 携带当前跳转的页面，登录后重新跳转该页面
          replace: true,
        };
      }
      return true;
    } else {
      // 如果是项目模式
      const projectStore = useProjectStore();
      if (projectStore.isEnterprise) {
        //加载我的项目
        await projectStore.init();
        if (!projectStore.currentProject && to.path !== PROJECT_JOIN_PATH) {
          //没有项目
          return {
            path: PROJECT_JOIN_PATH,
            replace: true,
          };
        }
      }
    }
  });
}

/**
 * 项目守卫配置
 * @param router
 */
function createRouterGuard(router: Router) {
  /** 通用 */
  setupCommonGuard(router);
  /** 权限访问 */
  setupAccessGuard(router);
}

export { createRouterGuard };
