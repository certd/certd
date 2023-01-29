import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import Antd from "ant-design-vue";
import "ant-design-vue/dist/antd.less";
// import "virtual:windi.css";
import "./style/common.less";
import "./mock";
import i18n from "./i18n";
import store from "./store";

import plugin from "./plugin/";
import components from "./components";
// @ts-ignore
const app = createApp(App);
// 尽量
app.use(Antd);
app.use(router);
app.use(i18n);
app.use(store);
app.use(plugin, { i18n });
app.use(components);
app.mount("#app");
