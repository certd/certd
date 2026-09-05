import { useProjectStore } from "/@/store/project";
import { useSettingStore } from "/@/store/settings";

export const certdResources = [
  {
    title: "certd.title",
    name: "CertdRoot",
    path: "/cert",
    redirect: "/cert/pipeline",
    meta: {
      icon: "ion:key-outline",
      auth: true,
      order: 0,
    },
    children: [
      {
        title: "certd.sysResources.myProjectManager",
        name: "MyProjectManager",
        path: "/cert/project",
        component: "/certd/project/index.vue",
        meta: {
          show: () => {
            const projectStore = useProjectStore();
            return projectStore.isEnterprise;
          },
          isMenu: false,
          icon: "ion:apps",
          keepAlive: true,
          auth: true,
        },
      },
      {
        title: "certd.sysResources.projectJoin",
        name: "ProjectJoin",
        path: "/cert/project/join",
        component: "/certd/project/join.vue",
        meta: {
          isMenu: false,
          show: true,
          icon: "ion:apps",
          auth: true,
        },
      },
      {
        title: "certd.pipeline",
        name: "PipelineManager",
        path: "/cert/pipeline",
        component: "/certd/pipeline/index.vue",
        meta: {
          icon: "ion:analytics-sharp",
          keepAlive: true,
          auth: true,
        },
      },
      {
        title: "certd.pipelineEdit",
        name: "PipelineEdit",
        path: "/cert/pipeline/detail",
        component: "/certd/pipeline/detail.vue",
        meta: {
          isMenu: false,
          auth: true,
        },
      },
      {
        title: "certd.history",
        name: "PipelineHistory",
        path: "/cert/history",
        component: "/certd/history/index.vue",
        meta: {
          icon: "ion:timer-outline",
          keepAlive: true,
          auth: true,
        },
      },
      {
        title: "certd.template.title",
        name: "PipelineTemplate",
        path: "/cert/pipeline/template",
        component: "/certd/pipeline/template/index.vue",
        meta: {
          isMenu: true,
          icon: "ion:duplicate-outline",
          auth: true,
          keepAlive: true,
        },
      },
      {
        title: "certd.template.edit",
        name: "PipelineTemplateEdit",
        path: "/cert/pipeline/template/edit",
        component: "/certd/pipeline/template/edit.vue",
        meta: {
          isMenu: false,
          auth: true,
        },
      },
      {
        title: "certd.template.importCreate",
        name: "PipelineTemplateImport",
        path: "/cert/pipeline/template/import",
        component: "/certd/pipeline/template/import/index.vue",
        meta: {
          isMenu: false,
          auth: true,
        },
      },
      {
        title: "certd.certStore",
        name: "CertStore",
        path: "/cert/monitor/cert",
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
        path: "/cert/monitor/site",
        component: "/certd/monitor/site/index.vue",
        meta: {
          icon: "ion:videocam-outline",
          auth: true,
          keepAlive: true,
        },
      },
      {
        title: "certd.sysResources.currentProject",
        name: "ProjectMemberManager",
        path: "/cert/project/detail",
        component: "/certd/project/detail/index.vue",
        meta: {
          show: () => {
            const projectStore = useProjectStore();
            return projectStore.isEnterprise;
          },
          isMenu: true,
          icon: "ion:apps",
          auth: true,
        },
      },
      {
        title: "certd.settings",
        name: "MineSetting",
        path: "/cert/setting",
        redirect: "/cert/access",
        meta: {
          icon: "ion:settings-outline",
          auth: true,
          keepAlive: true,
        },
        children: [
          {
            title: "certd.accessManager",
            name: "AccessManager",
            path: "/cert/access",
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
            path: "/cert/cert/domain",
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
            path: "/cert/cname/record",
            component: "/certd/cname/record/index.vue",
            meta: {
              icon: "ion:link-outline",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.dnsPersistRecord",
            name: "DnsPersistRecord",
            path: "/cert/cert/dns-persist",
            component: "/certd/cert/dns-persist/index.vue",
            meta: {
              icon: "ion:shield-half-outline",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.certApplyTemplate",
            name: "CertApplyTemplate",
            path: "/cert/cert/apply-template",
            component: "/certd/cert/apply-template/index.vue",
            meta: {
              icon: "ion:list-circle-outline",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.subDomain",
            name: "SubDomain",
            path: "/cert/pipeline/subDomain",
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
            path: "/cert/pipeline/group",
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
            path: "/cert/open/openkey",
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
            path: "/cert/notification",
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
            path: "/cert/monitor/setting",
            component: "/certd/monitor/site/setting/index.vue",
            meta: {
              icon: "ion:videocam-outline",
              auth: true,
              isMenu: true,
            },
          },
          {
            title: "certd.sysResources.domainMonitorSetting",
            name: "DomainMonitorSetting",
            path: "/cert/cert/domain/setting",
            component: "/certd/cert/domain/setting/index.vue",
            meta: {
              icon: "ion:stopwatch-outline",
              auth: true,
              isMenu: true,
            },
          },
          {
            title: "certd.sysResources.jobHistory",
            name: "JobHistory",
            path: "/cert/monitor/history",
            component: "/certd/monitor/history/index.vue",
            meta: {
              icon: "ion:barcode-outline",
              auth: true,
              keepAlive: true,
              isMenu: true,
            },
          },
          {
            title: "certd.auditLog",
            name: "AuditLog",
            path: "/cert/audit",
            component: "/certd/audit/index.vue",
            meta: {
              icon: "ion:document-text-outline",
              auth: true,
              keepAlive: true,
              isMenu: true,
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isPlus;
              },
            },
          },
          {
            title: "certd.userSecurity",
            name: "UserSecurity",
            path: "/cert/mine/security",
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
            path: "/cert/mine/grant",
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
            path: "/cert/mine/user-profile",
            component: "/certd/mine/user-profile.vue",
            meta: {
              icon: "ion:person-outline",
              auth: true,
              isMenu: true,
            },
          },
        ],
      },
      {
        title: "certd.suite",
        name: "SuiteProduct",
        path: "/cert/suite",
        redirect: "/cert/suite/mine",
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
            path: "/cert/suite/mine",
            component: "/certd/suite/mine/index.vue",
            meta: {
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isInviteCommissionEnabled;
              },
              icon: "ion:gift-outline",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.suiteBuy",
            name: "SuiteProductBuy",
            path: "/cert/suite/buy",
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
            path: "/cert/trade",
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
            title: "certd.inviteCommission",
            name: "InviteCommission",
            path: "/cert/invite",
            component: "/certd/invite/index.vue",
            meta: {
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isInviteCommissionEnabled;
              },
              icon: "ion:gift-outline",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.myWallet",
            name: "MyWallet",
            path: "/cert/wallet",
            component: "/certd/wallet/index.vue",
            meta: {
              show: () => {
                const settingStore = useSettingStore();
                return settingStore.isComm;
              },
              icon: "ion:wallet-outline",
              auth: true,
              keepAlive: true,
            },
          },
          {
            title: "certd.paymentReturn",
            name: "PaymentReturn",
            path: "/cert/payment/return/:type",
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
