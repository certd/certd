import { defineStore } from "pinia";
// @ts-ignore
import { frameworkMenus, headerMenus, filterMenus, findMenus } from "/src/router/resolve";
import _ from "lodash-es";
import { mitter } from "/src/utils/util.mitt";
//监听注销事件
mitter.on("app.logout", () => {
  const resourceStore = useResourceStore();
  resourceStore.clear();
});
//
// mitter.on("app.login", () => {
//   const resourceStore = useResourceStore();
//   resourceStore.clear();
//   resourceStore.init();
// });

interface ResourceState {
  topMenus: Array<any>;
  authedTopMenus: Array<any>;
  headerMenus: Array<any>;
  asideMenus: Array<any>;
  fixedAsideMenus: Array<any>;
  inited: boolean;
  currentTopMenu?: string;
  currentAsidePath?: string;
}

export const useResourceStore = defineStore({
  id: "app.resource",
  state: (): ResourceState => ({
    // user info
    topMenus: [],
    authedTopMenus: [],
    headerMenus: [],
    fixedAsideMenus: [],
    inited: false,
    currentTopMenu: undefined,
    currentAsidePath: undefined
  }),
  getters: {
    getAsideMenus() {
      let topMenu = this.currentTopMenu;
      if (!topMenu && this.authedTopMenus.length > 0) {
        topMenu = this.authedTopMenus[0];
      }
      let asideMenus = topMenu?.children || [];
      asideMenus = [...this.fixedAsideMenus, ...asideMenus];
      return asideMenus;
    },
    getHeaderMenus() {
      return this.headerMenus;
    },
    getFrameworkMenus() {
      return this.authedTopMenus;
      // const menus = _.cloneDeep(this.authedTopMenus);
      // for (const menu of menus) {
      //   delete menu.children;
      // }
      // return menus;
    }
  } as any,
  actions: {
    clear() {
      this.inited = false;
      this.currentTopMenu = undefined;
    },
    /**
     * 初始化资源
     */
    init() {
      if (this.inited) {
        return;
      }
      this.inited = true;

      const allMenus = _.cloneDeep(frameworkMenus[0].children);
      this.topMenus = filterMenus(allMenus, (item: any) => {
        return item?.meta?.showOnHeader !== false;
      });

      this.fixedAsideMenus = findMenus(allMenus, (item: any) => {
        return item?.meta?.fixedAside === true;
      });
      this.headerMenus = headerMenus;
    },
    setCurrentTopMenu(topMenu?: any) {
      if (this.topMenus.length === 0) {
        return;
      }
      if (topMenu == null) {
        topMenu = this.topMenus[0];
      }
      this.currentTopMenu = topMenu;
    },
    setCurrentTopMenuByCurrentRoute(matched: any) {
      const menuHeader = this.authedTopMenus;
      if (matched?.length <= 1) {
        return;
      }

      function findFromTree(tree: any, find: any) {
        tree = tree || [];
        const results: Array<any> = [];
        for (const item of tree) {
          if (find(item)) {
            results.push(item);
            return results;
          }
          if (item.children && item.children.length > 0) {
            const found: any = findFromTree(item.children, find);
            if (found) {
              results.push(item);
              return results.concat(found);
            }
          }
        }
      }
      const matchedPath = matched[1].path;
      const _side = findFromTree(menuHeader, (menu: any) => menu.path === matchedPath);
      if (_side?.length > 0) {
        if (this.currentAsidePath === _side[0]) {
          return;
        }
        this.currentAsidePath = _side[0];
        this.setCurrentTopMenu(_side[0]);
      }
    },
    filterByPermission(permissions: any) {
      this.authedTopMenus = this.filterChildrenByPermission(this.topMenus, permissions);
    },
    filterChildrenByPermission(list: any, permissions: any) {
      const menus = list.filter((item: any) => {
        if (item?.meta?.permission) {
          return permissions.includes(item.meta.permission);
        }
        return true;
      });
      for (const menu of menus) {
        if (menu.children && menu.children.length > 0) {
          menu.children = this.filterChildrenByPermission(menu.children, permissions);
        }
      }
      return menus;
    }
  }
});
