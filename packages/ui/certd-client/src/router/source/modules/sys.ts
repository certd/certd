import { useSettingStore } from "/@/store/settings";

function isInviteLevelEnabled() {
  const settingStore = useSettingStore();
  const levelEnabled = settingStore.inviteSetting?.levelEnabled;
  return settingStore.isComm && levelEnabled === true;
}

export const sysResources = [
  {
    title: "certd.sysResources.sysRoot",
    name: "SysRoot",
    path: "/sys",
    redirect: "/sys/settings",
    meta: {
      icon: "ion:settings-outline",
      permission: "sys:settings:view",
      order: 10,
      auth: true,
    },
    children: [
      {
        title: "certd.sysResources.sysConsole",
        name: "SysConsole",
        path: "/sys/console",
        component: "/sys/console/index.vue",
        meta: {
          show: () => {
            const settingStore = useSettingStore();
            return settingStore.isComm;
          },
          icon: "ion:speedometer-outline",
          permission: "sys:auth:user:view",
          auth: true,
        },
      },

      {
        title: "certd.sysResources.sysSettings",
        name: "SysSettings",
        path: "/sys/settings",
        component: "/sys/settings/index.vue",
        meta: {
          icon: "ion:settings-outline",
          permission: "sys:settings:view",
          auth: true,
        },
      },
      {
        title: "certd.sysResources.projectManager",
        name: "ProjectManager",
        path: "/sys/enterprise/project",
        component: "/sys/enterprise/project/index.vue",
        meta: {
          show: true,
          auth: true,
          icon: "ion:apps",
          permission: "sys:settings:edit",
          keepAlive: true,
        },
      },
      {
        title: "certd.sysResources.projectDetail",
        name: "ProjectDetail",
        path: "/sys/enterprise/project/detail",
        component: "/sys/enterprise/project/detail/index.vue",
        meta: {
          isMenu: false,
          show: true,
          auth: true,
          icon: "ion:apps",
          permission: "sys:settings:edit",
        },
      },
      {
        title: "certd.sysResources.cnameSetting",
        name: "CnameSetting",
        path: "/sys/cname/provider",
        component: "/sys/cname/provider/index.vue",
        meta: {
          icon: "ion:earth-outline",
          permission: "sys:settings:view",
          keepAlive: true,
          auth: true,
        },
      },
      {
        title: "certd.sysResources.emailSetting",
        name: "EmailSetting",
        path: "/sys/settings/email",
        component: "/sys/settings/email/index.vue",
        meta: {
          permission: "sys:settings:view",
          icon: "ion:mail-outline",
          auth: true,
        },
      },
      {
        title: "certd.sysResources.siteSetting",
        name: "SiteSetting",
        path: "/sys/site",
        component: "/sys/site/index.vue",
        meta: {
          show: () => {
            const settingStore = useSettingStore();
            return settingStore.isComm;
          },
          auth: true,
          icon: "ion:document-text-outline",
          permission: "sys:settings:view",
        },
      },
      {
        title: "certd.sysResources.headerMenus",
        name: "SettingsHeaderMenus",
        path: "/sys/settings/header-menus",
        component: "/sys/settings/header-menus/index.vue",
        meta: {
          show: () => {
            const settingStore = useSettingStore();
            return settingStore.isComm;
          },
          auth: true,
          icon: "ion:menu",
          permission: "sys:settings:view",
          keepAlive: true,
        },
      },
      {
        title: "certd.sysResources.sysAccess",
        name: "SysAccessManager",
        path: "/sys/access",
        component: "/sys/access/index.vue",
        meta: {
          show: () => {
            const settingStore = useSettingStore();
            return settingStore.isComm;
          },
          auth: true,
          icon: "ion:disc-outline",
          permission: "sys:settings:view",
          keepAlive: true,
        },
      },
      {
        title: "certd.sysResources.sysPlugin",
        name: "SysPlugin",
        path: "/sys/plugin",
        component: "/sys/plugin/index.vue",
        meta: {
          icon: "ion:extension-puzzle-outline",
          permission: "sys:settings:view",
          keepAlive: true,
          auth: true,
        },
      },
      {
        title: "certd.sysResources.sysPluginEdit",
        name: "SysPluginEdit",
        path: "/sys/plugin/edit",
        component: "/sys/plugin/edit.vue",
        meta: {
          isMenu: false,
          icon: "ion:extension-puzzle",
          permission: "sys:settings:view",
          keepAlive: true,
          auth: true,
        },
      },
      {
        title: "certd.sysResources.sysPluginConfig",
        name: "SysPluginConfig",
        path: "/sys/plugin/config",
        component: "/sys/plugin/config-common.vue",
        meta: {
          show: () => {
            const settingStore = useSettingStore();
            return settingStore.isComm;
          },
          icon: "ion:extension-puzzle",
          permission: "sys:settings:view",
          auth: true,
        },
      },
      {
        title: "certd.sysResources.accountBind",
        name: "AccountBind",
        path: "/sys/account",
        component: "/sys/account/index.vue",
        meta: {
          icon: "ion:golf-outline",
          permission: "sys:settings:view",
          keepAlive: true,
          auth: true,
        },
      },
      {
        title: "certd.sysResources.permissionManager",
        name: "PermissionManager",
        path: "/sys/authority/permission",
        component: "/sys/authority/permission/index.vue",
        meta: {
          icon: "ion:list-outline",
          permission: "sys:auth:per:view",
          keepAlive: true,
          auth: true,
        },
      },
      {
        title: "certd.sysResources.roleManager",
        name: "RoleManager",
        path: "/sys/authority/role",
        component: "/sys/authority/role/index.vue",
        meta: {
          icon: "ion:people-outline",
          permission: "sys:auth:role:view",
          keepAlive: true,
          auth: true,
        },
      },
      {
        title: "certd.sysResources.userManager",
        name: "UserManager",
        path: "/sys/authority/user",
        component: "/sys/authority/user/index.vue",
        meta: {
          icon: "ion:person-outline",
          permission: "sys:auth:user:view",
          keepAlive: true,
          auth: true,
        },
      },
      {
        title: "certd.sysResources.userDataManager",
        name: "UserDataManager",
        path: "/sys/user-data",
        redirect: "/sys/pipeline",
        meta: {
          icon: "ion:folder-open-outline",
          permission: "sys:settings:view",
          keepAlive: true,
          auth: true,
        },
        children: [
          {
            title: "certd.sysResources.pipelineManager",
            name: "SysPipelineManager",
            path: "/sys/pipeline",
            component: "/sys/pipeline/index.vue",
            meta: {
              icon: "ion:analytics-sharp",
              permission: "sys:settings:view",
              keepAlive: true,
              auth: true,
            },
          },
          {
            title: "certd.sysResources.siteMonitorManager",
            name: "SysSiteMonitorManager",
            path: "/sys/monitor/site",
            component: "/sys/monitor/site/index.vue",
            meta: {
              icon: "ion:videocam-outline",
              permission: "sys:settings:view",
              keepAlive: true,
              auth: true,
            },
          },
        ],
      },
      {
        title: "certd.sysResources.suiteManager",
        name: "SuiteManager",
        path: "/sys/suite",
        redirect: "/sys/suite/setting",
        meta: {
          icon: "ion:cart-outline",
          permission: "sys:settings:edit",
          show: () => {
            const settingStore = useSettingStore();
            return settingStore.isComm;
          },
          keepAlive: true,
          auth: true,
        },
        children: [
          {
            title: "certd.sysResources.suiteSetting",
            name: "SuiteSetting",
            path: "/sys/suite/setting",
            component: "/sys/suite/setting/index.vue",
            meta: {
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isComm;
              },
              icon: "ion:cart",
              permission: "sys:settings:edit",
              auth: true,
            },
          },
          {
            title: "certd.sysResources.orderManager",
            name: "OrderManager",
            path: "/sys/suite/trade",
            component: "/sys/suite/trade/index.vue",
            meta: {
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isComm;
              },
              icon: "ion:bag-check",
              permission: "sys:settings:edit",
              keepAlive: true,
              auth: true,
            },
          },
          {
            title: "certd.sysResources.userSuites",
            name: "UserSuites",
            path: "/sys/suite/user-suite",
            component: "/sys/suite/user-suite/index.vue",
            meta: {
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isComm;
              },
              icon: "ion:gift-outline",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.sysResources.inviteCommissionSetting",
            name: "SysInviteCommissionSetting",
            path: "/sys/suite/invite/setting",
            component: "/sys/suite/invite/setting.vue",
            meta: {
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isComm;
              },
              icon: "ion:gift-outline",
              permission: "sys:settings:edit",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.sysResources.inviteLevel",
            name: "SysInviteLevel",
            path: "/sys/suite/invite/level",
            component: "/sys/suite/invite/level.vue",
            meta: {
              show: () => {
                return isInviteLevelEnabled();
              },
              icon: "ion:ribbon-outline",
              permission: "sys:settings:edit",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.sysResources.inviteUserLevel",
            name: "SysInviteUserLevel",
            path: "/sys/suite/invite/user-level",
            component: "/sys/suite/invite/user-level.vue",
            meta: {
              show: () => {
                return isInviteLevelEnabled();
              },
              icon: "ion:people-outline",
              permission: "sys:settings:edit",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.sysResources.inviteWithdraw",
            name: "SysInviteWithdraw",
            path: "/sys/suite/invite/withdraw",
            component: "/sys/suite/invite/withdraw.vue",
            meta: {
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isComm;
              },
              icon: "ion:cash-outline",
              permission: "sys:settings:edit",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.sysResources.activationCodeManager",
            name: "SysProductActivationCode",
            path: "/sys/suite/activation-code",
            component: "/sys/suite/activation-code/index.vue",
            meta: {
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isComm;
              },
              icon: "ion:key-outline",
              permission: "sys:settings:edit",
              auth: true,
              keepAlive: true,
            },
          },
        ],
      },
      {
        title: "certd.sysResources.netTest",
        name: "NetTest",
        path: "/sys/nettest",
        component: "/sys/nettest/index.vue",
        meta: {
          icon: "ion:build-outline",
          auth: true,
          keepAlive: true,
        },
      },
    ],
  },
];

export default sysResources;
