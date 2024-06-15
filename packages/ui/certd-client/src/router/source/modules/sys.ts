import LayoutPass from "/@/layout/layout-pass.vue";

export const sysResources = [
  {
    title: "系统管理",
    name: "sys",
    path: "/sys",
    redirect: "/sys/authority",
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
        title: "系统设置",
        name: "settings",
        meta: {
          icon: "ion:settings-outline",
          permission: "sys:settings:view"
        },
        path: "/sys/settings",
        component: "/sys/settings/index.vue"
      }
    ]
  }
];
