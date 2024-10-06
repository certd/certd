export const certdResources = [
  {
    title: "证书自动化",
    name: "CertdRoot",
    path: "/certd",
    redirect: "/certd/pipeline",
    meta: {
      icon: "ion:key-outline",
      auth: true
    },
    children: [
      {
        title: "证书自动化流水线",
        name: "PipelineManager",
        path: "/certd/pipeline",
        component: "/certd/pipeline/index.vue",
        meta: {
          icon: "ion:analytics-sharp"
        }
      },
      {
        title: "编辑流水线",
        name: "PipelineEdit",
        path: "/certd/pipeline/detail",
        component: "/certd/pipeline/detail.vue",
        meta: {
          isMenu: false
        }
      },
      {
        title: "执行历史记录",
        name: "PipelineHistory",
        path: "/certd/history",
        component: "/certd/history/index.vue",
        meta: {
          icon: "ion:timer-outline"
        }
      },
      {
        title: "授权管理",
        name: "AccessManager",
        path: "/certd/access",
        component: "/certd/access/index.vue",
        meta: {
          icon: "ion:disc-outline",
          auth: true
        }
      },
      {
        title: "CNAME记录管理",
        name: "CnameRecord",
        path: "/certd/cname/record",
        component: "/certd/cname/record/index.vue",
        meta: {
          icon: "ion:disc-outline",
          auth: true
        }
      },
      {
        title: "邮箱设置",
        name: "EmailSetting",
        path: "/certd/settings/email",
        component: "/certd/settings/email-setting.vue",
        meta: {
          icon: "ion:mail-outline",
          auth: true
        }
      },
      {
        title: "账号信息",
        name: "UserProfile",
        path: "/certd/mine/user-profile",
        component: "/certd/mine/user-profile.vue",
        meta: {
          icon: "ion:person-outline",
          auth: true
        }
      }
    ]
  }
];
