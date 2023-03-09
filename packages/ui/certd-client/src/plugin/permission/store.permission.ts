import { defineStore } from "pinia";
import { useResourceStore } from "/src/store/modules/resource";
import { getPermissions } from "./api";
import { mitter } from "/@/utils/util.mitt";
import { env } from "/@/utils/util.env";

//监听注销事件
mitter.on("app.logout", () => {
  const permissionStore = usePermissionStore();
  permissionStore.clear();
});

interface PermissionState {
  permissions: [];
  inited: boolean;
}

/**
 * 构建权限码列表
 * @param menuTree
 * @param permissionList
 * @returns {*}
 */
function formatPermissions(menuTree: Array<any>, permissionList: any[] = []) {
  if (menuTree == null) {
    menuTree = [];
  }
  menuTree.forEach((item: any) => {
    if (item.permission) {
      // @ts-ignore
      permissionList.push(item.permission);
    }
    if (item.children != null && item.children.length > 0) {
      formatPermissions(item.children, permissionList);
    }
  });
  return permissionList;
}

export const usePermissionStore = defineStore({
  id: "app.permission",
  state: (): PermissionState => ({
    permissions: [],
    inited: false
  }),
  getters: {
    // @ts-ignore
    getPermissions() {
      // @ts-ignore
      return this.permissions;
    },
    // @ts-ignore
    isInited() {
      // @ts-ignore
      return this.inited;
    }
  },
  actions: {
    init({ permissions }: any) {
      this.permissions = permissions;
      this.inited = true;
    },
    clear() {
      this.permissions = [];
      this.inited = false;
    },
    resolve(resourceTree: any) {
      const permissions = formatPermissions(resourceTree);
      this.init({ permissions });

      //过滤没有权限的菜单
      const resourceStore = useResourceStore();
      resourceStore.filterByPermission(permissions);
    },
    async loadFromRemote() {
      let permissionTree = [];
      if (env.PM_ENABLED === "false") {
        console.warn("当前权限模块未开启，权限列表为空");
      } else {
        //开启了权限模块，向后台请求权限列表
        const data = await getPermissions();
        if (data != null) {
          permissionTree = data;
        } else {
          console.warn("当前获取到的权限列表为空");
        }
      }
      this.resolve(permissionTree);
    }
  }
});
