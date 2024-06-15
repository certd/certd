import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import Antd from "ant-design-vue";
import "./style/common.less";

import i18n from "./i18n";
import store from "./store";
import components from "./components";
import plugin from "./plugin/";
// 正式项目请删除mock，避免影响性能
//import "./mock";

// @ts-ignore
const app = createApp(App);
app.use(Antd);
app.use(router);
app.use(i18n);
app.use(store);
app.use(components);
app.use(plugin, { i18n });
app.mount("#app");
