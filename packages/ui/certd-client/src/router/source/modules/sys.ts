import LayoutPass from "/@/layout/layout-pass.vue";
import { computed } from "vue";
import { useUserStore } from "/@/store/modules/user";
import { useSettingStore } from "/@/store/modules/settings";

export const sysResources = [
  {
    title: "系统管理",
    name: "sys",
    path: "/sys",
    redirect: "/sys/settings",
    component: LayoutPass,
    meta: {
      icon: "ion:settings-outline",
      permission: "sys"
    },
    children: [
      {
        title: "权限管理",
        name: "authority",
        path: "/sys/authority",
        redirect: "/sys/authority/permission",
        meta: {
          icon: "ion:ribbon-outline",
          //需要校验权限
          permission: "sys:auth"
        },
        children: [
          {
            title: "权限资源管理",
            name: "permission",
            meta: {
              icon: "ion:list-outline",
              //需要校验权限
              permission: "sys:auth:per:view"
            },
            path: "/sys/authority/permission",
            component: "/sys/authority/permission/index.vue"
          },
          {
            title: "角色管理",
            name: "role",
            meta: {
              icon: "ion:people-outline",
              permission: "sys:auth:role:view"
            },
            path: "/sys/authority/role",
            component: "/sys/authority/role/index.vue"
          }
        ]
      },
      {
        title: "用户管理",
        name: "user",
        meta: {
          icon: "ion:person-outline",
          permission: "sys:auth:user:view"
        },
        path: "/sys/authority/user",
        component: "/sys/authority/user/index.vue"
      },
      {
        title: "账号绑定",
        name: "account",
        meta: {
          icon: "ion:golf-outline",
          permission: "sys:settings:view"
        },
        path: "/sys/account",
        component: "/sys/account/index.vue"
      },
      {
        title: "系统设置",
        name: "settings",
        meta: {
          icon: "ion:settings-outline",
          permission: "sys:settings:view"
        },
        path: "/sys/settings",
        component: "/sys/settings/index.vue"
      },
      {
        title: "站点个性化",
        name: "site",
        path: "/sys/site",
        meta: {
          show: () => {
            const settingStore = useSettingStore();
            return settingStore.isComm;
          },
          icon: "ion:document-text-outline",
          permission: "sys:settings:view"
        },
        component: "/sys/site/index.vue"
      },
      {
        title: "商业版设置",
        name: "SysCommercial",
        meta: {
          icon: "ion:document-text-outline",
          permission: "sys:settings:view",
          show: () => {
            const settingStore = useSettingStore();
            return settingStore.isComm;
          }
        },
        children: [
          {
            title: "套餐设置",
            name: "suite",
            path: "/sys/commercial/suite",
            meta: {
              icon: "ion:document-text-outline",
              permission: "sys:settings:view",
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isComm;
              }
            }
          }
        ]
      }
    ]
  }
];
