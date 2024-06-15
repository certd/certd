import LayoutPass from "/src/layout/layout-pass.vue";
import _ from "lodash-es";
import { outsideResource } from "./source/outside";
import { headerResource } from "./source/header";
import { frameworkResource } from "./source/framework";
const modules = import.meta.glob("/src/views/**/*.vue");

let index = 0;
function transformOneResource(resource: any, parent: any) {
  let menu: any = null;
  if (resource.meta == null) {
    resource.meta = {};
  }
  const meta = resource.meta;
  meta.title = meta.title ?? resource.title ?? "未命名";
  if (resource.title == null) {
    resource.title = meta.title;
  }
  if (meta.isMenu === false) {
    menu = null;
  } else {
    menu = _.cloneDeep(resource);
    delete menu.component;
    if (menu.path?.startsWith("/")) {
      menu.fullPath = menu.path;
    } else {
      menu.fullPath = (parent?.fullPath || "") + "/" + menu.path;
    }
  }
  let route;
  if (meta.isRoute === false || resource.path == null || resource.path.startsWith("https://") || resource.path.startsWith("http://")) {
    //没有route
    route = null;
  } else {
    route = _.cloneDeep(resource);
    if (route.component && typeof route.component === "string") {
      const path = "/src/views" + route.component;
      route.component = modules[path];
    }
    if (route.component == null) {
      route.component = LayoutPass;
    }
    if (route?.meta?.cache !== false) {
      if (route.meta == null) {
        route.meta = {};
      }
      route.meta.cache = true;
    }
  }
  if (resource.children) {
    const { menus, routes } = buildMenusAndRouters(resource.children, resource);
    if (menu) {
      menu.children = menus;
    }
    if (route) {
      route.children = routes;
    }
  }
  return {
    menu,
    route
  };
}

export const buildMenusAndRouters = (resources: any, parent: any = null) => {
  const routes: Array<any> = [];
  const menus: Array<any> = [];
  for (const item of resources) {
    const { menu, route } = transformOneResource(item, parent);

    if (menu) {
      menus.push(menu);
    }
    if (route) {
      routes.push(route);
    }
  }

  setIndex(menus);
  return {
    routes,
    menus
  };
};

function setIndex(menus: any) {
  for (const menu of menus) {
    menu.index = "index_" + index;
    index++;
    if (menu.children && menu.children.length > 0) {
      setIndex(menu.children);
    }
  }
}

function findMenus(menus: any, condition: any) {
  const list: any = [];
  for (const menu of menus) {
    if (condition(menu)) {
      list.push(menu);
    }
    if (menu.children && menu.children.length > 0) {
      const subList = findMenus(menu.children, condition);
      for (const item of subList) {
        list.push(item);
      }
    }
  }
  return list;
}

function filterMenus(menus: any, condition: any) {
  const list = menus.filter((item: any) => {
    return condition(item);
  });

  for (const item of list) {
    if (item.children && item.children.length > 0) {
      item.children = filterMenus(item.children, condition);
    }
  }
  return list;
}

function flatChildren(list: any, children: any) {
  for (const child of children) {
    list.push(child);
    if (child.children && child.children.length > 0) {
      flatChildren(list, child.children);
    }
    child.children = null;
  }
}
function flatSubRouters(routers: any) {
  for (const router of routers) {
    const children: Array<any> = [];
    if (router.children && router.children.length > 0) {
      flatChildren(children, router.children);
    }
    router.children = children;
  }
  return routers;
}

const frameworkRet = buildMenusAndRouters(frameworkResource);
const outsideRet = buildMenusAndRouters(outsideResource);
const headerRet = buildMenusAndRouters(headerResource);

const outsideRoutes = outsideRet.routes;
const frameworkRoutes = frameworkRet.routes;
const routes = [...outsideRoutes, ...frameworkRoutes];
const frameworkMenus = frameworkRet.menus;
const headerMenus = headerRet.menus;
export { routes, outsideRoutes, frameworkRoutes, frameworkMenus, headerMenus, findMenus, filterMenus };

