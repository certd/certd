import LayoutPass from "/src/layout/layout-pass.vue";
import _ from "lodash-es";
import { outsideResource } from "./source/outside";
import { headerResource } from "./source/header";
import { frameworkResource } from "./source/framework";
// @ts-ignore
const modules = import.meta.glob("/src/views/**/*.vue");

let index = 0;
function transformOneResource(resource) {
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
  }
  let route;
  if (resource.type !== "menu") {
    if (resource.path == null || resource.path.startsWith("https://") || resource.path.startsWith("http://")) {
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
    }
  }

  return {
    menu,
    route
  };
}

export const buildMenusAndRouters = (resources) => {
  const routes: Array<any> = [];
  const menus: Array<any> = [];
  for (const item of resources) {
    const { menu, route } = transformOneResource(item);
    let menuChildren;
    let routeChildren;
    if (item.children) {
      if (item.children.length > 0) {
        const ret = buildMenusAndRouters(item.children);
        menuChildren = ret.menus;
        routeChildren = ret.routes;
      }
    }

    if (menu) {
      menus.push(menu);
      menu.children = menuChildren;
    }
    if (route) {
      if (route?.meta?.cache !== false) {
        if (route.meta == null) {
          route.meta = {};
        }
        route.meta.cache = true;
      }
      routes.push(route);
      route.children = routeChildren;
    }
  }

  setIndex(menus);
  return {
    routes,
    menus
  };
};

function setIndex(menus) {
  for (const menu of menus) {
    menu.index = "index_" + index;
    index++;
    if (menu.children && menu.children.length > 0) {
      setIndex(menu.children);
    }
  }
}

function findMenus(menus, condition) {
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

function filterMenus(menus, condition) {
  const list = menus.filter((item) => {
    return condition(item);
  });

  for (const item of list) {
    if (item.children && item.children.length > 0) {
      item.children = filterMenus(item.children, condition);
    }
  }
  return list;
}

function flatChildren(list, children) {
  for (const child of children) {
    list.push(child);
    if (child.children && child.children.length > 0) {
      flatChildren(list, child.children);
    }
    child.children = null;
  }
}
function flatSubRouters(routers) {
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
const frameworkRoutes = flatSubRouters(frameworkRet.routes);
const routes = [...outsideRoutes, ...frameworkRoutes];
const frameworkMenus = frameworkRet.menus;
const headerMenus = headerRet.menus;
export { routes, outsideRoutes, frameworkRoutes, frameworkMenus, headerMenus, findMenus, filterMenus };
