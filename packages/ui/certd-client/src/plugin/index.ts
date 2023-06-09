import "./iconify";
import "./iconfont";
import FastCrud from "./fast-crud";
import permission from "./permission";

function install(app: any, options: any = {}) {
  app.use(FastCrud, options);
  app.use(permission);
}

export default {
  install
};
