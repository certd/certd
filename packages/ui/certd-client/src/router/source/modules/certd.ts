import { useProjectStore } from "/@/store/project";
import { useSettingStore } from "/@/store/settings";

export const certdResources = [
  {
    title: "certd.title",
    name: "CertdRoot",
    path: "/certd",
    redirect: "/certd/pipeline",
    meta: {
      icon: "ion:key-outline",
      auth: true,
      order: 0,
    },
    children: [
      {
        title: "certd.sysResources.myProjectManager",
        name: "MyProjectManager",
        path: "/certd/project",
        component: "/certd/project/index.vue",
        meta: {
          show: () => {
            const projectStore = useProjectStore();
            return projectStore.isEnterprise;
          },
          isMenu: false,
          icon: "ion:apps",
          keepAlive: true,
        },
      },
      {
        title: "certd.sysResources.currentProject",
        name: "CurrentProject",
        path: "/certd/project/detail",
        component: "/certd/project/detail/index.vue",
        meta: {
          show: () => {
            const projectStore = useProjectStore();
            return projectStore.isEnterprise;
          },
          isMenu: true,
          icon: "ion:apps",
        },
      },
      {
        title: "certd.sysResources.projectJoin",
        name: "ProjectJoin",
        path: "/certd/project/join",
        component: "/certd/project/join.vue",
        meta: {
          isMenu: false,
          show: true,
          icon: "ion:apps",
        },
      },
      {
        title: "certd.pipeline",
        name: "PipelineManager",
        path: "/certd/pipeline",
        component: "/certd/pipeline/index.vue",
        meta: {
          icon: "ion:analytics-sharp",
          keepAlive: true,
        },
      },
      {
        title: "certd.pipelineEdit",
        name: "PipelineEdit",
        path: "/certd/pipeline/detail",
        component: "/certd/pipeline/detail.vue",
        meta: {
          isMenu: false,
        },
      },
      {
        title: "certd.history",
        name: "PipelineHistory",
        path: "/certd/history",
        component: "/certd/history/index.vue",
        meta: {
          icon: "ion:timer-outline",
          keepAlive: true,
        },
      },
      {
        title: "certd.template.title",
        name: "PipelineTemplate",
        path: "/certd/pipeline/template",
        component: "/certd/pipeline/template/index.vue",
        meta: {
          isMenu: true,
          icon: "ion:duplicate-outline",
        },
      },
      {
        title: "certd.template.edit",
        name: "PipelineTemplateEdit",
        path: "/certd/pipeline/template/edit",
        component: "/certd/pipeline/template/edit.vue",
        meta: {
          isMenu: false,
        },
      },
      {
        title: "certd.template.importCreate",
        name: "PipelineTemplateImport",
        path: "/certd/pipeline/template/import",
        component: "/certd/pipeline/template/import/index.vue",
        meta: {
          isMenu: false,
        },
      },
      {
        title: "certd.certStore",
        name: "CertStore",
        path: "/certd/monitor/cert",
        component: "/certd/monitor/cert/index.vue",
        meta: {
          icon: "ion:shield-checkmark-outline",
          auth: true,
          isMenu: true,
          keepAlive: true,
        },
      },
      {
        title: "certd.siteMonitor",
        name: "SiteCertMonitor",
        path: "/certd/monitor/site",
        component: "/certd/monitor/site/index.vue",
        meta: {
          icon: "ion:videocam-outline",
          auth: true,
          keepAlive: true,
        },
      },
      {
        title: "certd.settings",
        name: "MineSetting",
        path: "/certd/setting",
        redirect: "/certd/access",
        meta: {
          icon: "ion:settings-outline",
          auth: true,
          keepAlive: true,
        },
        children: [
          {
            title: "certd.accessManager",
            name: "AccessManager",
            path: "/certd/access",
            component: "/certd/access/index.vue",
            meta: {
              icon: "ion:disc-outline",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.domain.domainManager",
            name: "DomainManager",
            path: "/certd/cert/domain",
            component: "/certd/cert/domain/index.vue",
            meta: {
              icon: "ion:globe-outline",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.cnameRecord",
            name: "CnameRecord",
            path: "/certd/cname/record",
            component: "/certd/cname/record/index.vue",
            meta: {
              icon: "ion:link-outline",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.subDomain",
            name: "SubDomain",
            path: "/certd/pipeline/subDomain",
            component: "/certd/pipeline/sub-domain/index.vue",
            meta: {
              icon: "material-symbols:approval-delegation-outline",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.pipelineGroup",
            name: "PipelineGroupManager",
            path: "/certd/pipeline/group",
            component: "/certd/pipeline/group/index.vue",
            meta: {
              icon: "mdi:format-list-group",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.openKey",
            name: "OpenKey",
            path: "/certd/open/openkey",
            component: "/certd/open/openkey/index.vue",
            meta: {
              icon: "hugeicons:api",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.notification",
            name: "NotificationManager",
            path: "/certd/notification",
            component: "/certd/notification/index.vue",
            meta: {
              icon: "ion:megaphone-outline",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.siteMonitorSetting",
            name: "SiteMonitorSetting",
            path: "/certd/monitor/setting",
            component: "/certd/monitor/site/setting/index.vue",
            meta: {
              icon: "ion:videocam-outline",
              auth: true,
              isMenu: true,
            },
          },
          {
            title: "certd.userSecurity",
            name: "UserSecurity",
            path: "/certd/mine/security",
            component: "/certd/mine/security/index.vue",
            meta: {
              icon: "fluent:shield-keyhole-16-regular",
              auth: true,
              isMenu: true,
            },
          },
          {
            title: "certd.userGrant",
            name: "UserGrantSetting",
            path: "/certd/mine/grant",
            component: "/certd/mine/grant/index.vue",
            meta: {
              icon: "mi:user-check",
              auth: true,
              isMenu: true,
              show: () => {
                const projectStore = useProjectStore();
                return !projectStore.isEnterprise;
              },
            },
          },
          {
            title: "certd.userProfile",
            name: "UserProfile",
            path: "/certd/mine/user-profile",
            component: "/certd/mine/user-profile.vue",
            meta: {
              icon: "ion:person-outline",
              auth: true,
              isMenu: false,
            },
          },
        ],
      },
      {
        title: "certd.suite",
        name: "SuiteProduct",
        path: "/certd/suite",
        redirect: "/certd/suite/mine",
        meta: {
          show: () => {
            const settingStore = useSettingStore();
            return settingStore.isComm && settingStore.isSuiteEnabled;
          },
          icon: "ion:cart-outline",
          auth: true,
        },
        children: [
          {
            title: "certd.mySuite",
            name: "MySuite",
            path: "/certd/suite/mine",
            component: "/certd/suite/mine/index.vue",
            meta: {
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isComm;
              },
              icon: "ion:gift-outline",
              auth: true,
            },
          },
          {
            title: "certd.suiteBuy",
            name: "SuiteProductBuy",
            path: "/certd/suite/buy",
            component: "/certd/suite/buy.vue",
            meta: {
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isComm;
              },
              icon: "ion:cart-outline",
              auth: true,
            },
          },
          {
            title: "certd.myTrade",
            name: "MyTrade",
            path: "/certd/trade",
            component: "/certd/trade/index.vue",
            meta: {
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isComm;
              },
              icon: "ion:bag-check-outline",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.paymentReturn",
            name: "PaymentReturn",
            path: "/certd/payment/return/:type",
            component: "/certd/payment/return.vue",
            meta: {
              icon: "ant-design:pay-circle-outlined",
              auth: false,
              isMenu: false,
            },
          },
        ],
      },
    ],
  },
];

export default certdResources;
