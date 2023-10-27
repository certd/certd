import "./iconify";
import "./iconfont";
import FastCrud from "./fast-crud";
import permission from "./permission";
import { App } from "vue";
function install(app: App, options: any = {}) {
  app.use(FastCrud, options);
  app.use(permission);
}

export default {
  install
};
