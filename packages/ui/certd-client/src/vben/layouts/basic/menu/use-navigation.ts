import type { RouteRecordNormalized } from "vue-router";

import { useRoute, useRouter } from "vue-router";

import { isHttpUrl, openRouteInNewWindow, openWindow } from "../../../utils";

function useNavigation() {
  const router = useRouter();
  const route1 = useRoute();
  const routes = router.getRoutes();

  const routeMetaMap = new Map<string, RouteRecordNormalized>();

  routes.forEach(route => {
    routeMetaMap.set(route.path, route);
  });

  const navigation = async (path: string) => {
    if (route1.path === path) {
      return;
    }
    const route = routeMetaMap.get(path);
    const { openInNewWindow = false, query = {} as any } = route?.meta ?? {};
    if (isHttpUrl(path)) {
      openWindow(path, { target: "_blank" });
    } else if (openInNewWindow) {
      openRouteInNewWindow(path);
    } else {
      await router.push({
        path,
        query,
      });
    }
  };

  return { navigation };
}

export { useNavigation };
