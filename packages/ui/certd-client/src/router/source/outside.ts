import LayoutOutside from "/src/layout/layout-outside.vue";
import Error404 from "/src/views/framework/error/404.vue";
const errorPage = [{ path: "/:pathMatch(.*)*", name: "not-found", component: Error404 }];
export const outsideResource = [
  {
    meta: {
      title: "首页",
      isMenu: false,
    },
    name: "landing",
    path: "/",
    component: "/framework/landing/index.vue",
  },
  {
    title: "outside",
    name: "outside",
    path: "/outside",
    component: LayoutOutside,
    children: [
      {
        meta: {
          title: "登录",
        },
        name: "login",
        path: "/login",
        component: "/framework/login/index.vue",
      },
      {
        meta: {
          title: "注册",
        },
        name: "register",
        path: "/register",
        component: "/framework/register/index.vue",
      },
      {
        meta: {
          title: "找回密码",
        },
        name: "forgotPassword",
        path: "/forgotPassword",
        component: "/framework/forgot-password/index.vue",
      },
      {
        meta: {
          title: "第三方登录回调",
        },
        name: "oauthCallback",
        path: "/oauth/callback/:type",
        component: "/framework/oauth/oauth-callback.vue",
      },
    ],
  },
  ...errorPage,
];
