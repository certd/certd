import LayoutOutside from "/src/layout/layout-outside.vue";
import Error404 from "/src/views/framework/error/404.vue";
const errorPage = [{ path: "/:pathMatch(.*)*", name: "not-found", component: Error404 }];
export const outsideResource = [
  {
    meta: {
      title: "Home",
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
          title: "Login",
        },
        name: "login",
        path: "/login",
        component: "/framework/login/index.vue",
      },
      {
        meta: {
          title: "Register",
        },
        name: "register",
        path: "/register",
        component: "/framework/register/index.vue",
      },
      {
        meta: {
          title: "Forgot password",
        },
        name: "forgotPassword",
        path: "/forgotPassword",
        component: "/framework/forgot-password/index.vue",
      },
      {
        meta: {
          title: "Third-party login callback",
        },
        name: "oauthCallback",
        path: "/oauth/callback/:type",
        component: "/framework/oauth/oauth-callback.vue",
      },
    ],
  },
  ...errorPage,
];
