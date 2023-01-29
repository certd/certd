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

interface ResourceState {
  frameworkMenus: Array<any>;
  headerMenus: Array<any>;
  asideMenus: Array<any>;
  fixedAsideMenus: Array<any>;
  inited: boolean;
  currentAsidePath: string;
}

export const useResourceStore = defineStore({
  id: "app.resource",
  state: (): ResourceState => ({
    // user info
    frameworkMenus: [],
    headerMenus: [],
    asideMenus: [],
    fixedAsideMenus: [],
    inited: false,
    currentAsidePath: ""
  }),
  getters: {
    getAsideMenus() {
      return this.asideMenus;
    },
    getHeaderMenus() {
      return this.headerMenus;
    },
    getFrameworkMenus() {
      return this.frameworkMenus;
    }
  },
  actions: {
    clear() {
      this.inited = false;
    },
    /**
     * 初始化资源
     */
    init() {
      if (this.inited) {
        return;
      }
      this.inited = true;

      const showMenus = _.cloneDeep(frameworkMenus[0].children);
      this.frameworkMenus = filterMenus(showMenus, (item) => {
        return item?.meta?.showOnHeader !== false;
      });

      this.fixedAsideMenus = findMenus(showMenus, (item) => {
        return item?.meta?.fixedAside === true;
      });
      this.headerMenus = headerMenus;
      this.setAsideMenu();
    },
    setAsideMenu(topMenu?) {
      if (this.frameworkMenus.length === 0) {
        return;
      }
      if (topMenu == null) {
        topMenu = this.frameworkMenus[0];
      }
      const asideMenus = topMenu?.children || [];
      this.asideMenus = [...this.fixedAsideMenus, ...asideMenus];
    },
    setAsideMenuByCurrentRoute(matched) {
      const menuHeader = this.frameworkMenus;
      if (matched?.length <= 1) {
        return;
      }

      function findFromTree(tree, find) {
        const results: Array<any> = [];
        for (const item of tree) {
          if (find(item)) {
            results.push(item);
            return results;
          }
          if (item.children && item.children.length > 0) {
            const found = findFromTree(item.children, find);
            if (found) {
              results.push(item);
              return results.concat(found);
            }
          }
        }
      }
      const matchedPath = matched[1].path;
      const _side = findFromTree(menuHeader, (menu) => menu.path === matchedPath);
      if (_side?.length > 0) {
        if (this.currentAsidePath === _side[0]) {
          return;
        }
        this.currentAsidePath = _side[0];
        this.setAsideMenu(_side[0]);
      }
    },
    filterByPermission(permissions) {
      this.frameworkMenus = this.filterChildrenByPermission(this.frameworkMenus, permissions);
    },
    filterChildrenByPermission(list, permissions) {
      const menus = list.filter((item) => {
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
