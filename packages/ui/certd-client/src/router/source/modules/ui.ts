export const uiResources = [
  {
    title: "UI示例",
    name: "ui",
    path: "/ui",
    redirect: "/ui/form",
    meta: {
      icon: "ion:apps-sharp"
    },
    children: [
      {
        title: "表单组件",
        name: "UIForm",
        path: "/ui/form",
        redirect: "/ui/form/input",
        meta: {
          icon: "ion:disc-outline"
        },
        children: [
          {
            title: "input",
            name: "UIFormInput",
            path: "/ui/form/input",
            component: "/ui/form/input/index.vue"
          }
        ]
      }
    ]
  }
];
