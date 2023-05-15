import "./iconify";
import "./iconfont";
import FastCrud from "./fast-crud";
import permission from "./permission";
// import FsBpmn from "./bpmn";

function install(app: any, options: any = {}) {
  app.use(FastCrud, options);
  app.use(permission);
  // app.use(FsBpmn, options.i18n);
}

export default {
  install
};
