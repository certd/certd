import LayoutOutside from "/src/layout/layout-outside.vue";
import Error404 from "/src/views/framework/error/404.vue";
const errorPage = [{ path: "/:pathMatch(.*)*", name: "not-found", component: Error404 }];
export const outsideResource = [
  {
    meta: {
      title: "certd.navigation.home",
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
          title: "certd.navigation.login",
        },
        name: "login",
        path: "/login",
        component: "/framework/login/index.vue",
      },
      {
        meta: {
          title: "certd.navigation.register",
        },
        name: "register",
        path: "/register",
        component: "/framework/register/index.vue",
      },
      {
        meta: {
          title: "certd.navigation.forgotPassword",
        },
        name: "forgotPassword",
        path: "/forgotPassword",
        component: "/framework/forgot-password/index.vue",
      },
      {
        meta: {
          title: "certd.navigation.oauthCallback",
        },
        name: "oauthCallback",
        path: "/oauth/callback/:type",
        component: "/framework/oauth/oauth-callback.vue",
      },
    ],
  },
  ...errorPage,
];
