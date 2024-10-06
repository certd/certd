import PiContainer from "./container.vue";
import TextEditable from "./editable.vue";
import vip from "./vip-button/install.js";
import { CheckCircleOutlined, InfoCircleOutlined, UndoOutlined } from "@ant-design/icons-vue";
import CronEditor from "./cron-editor/index.vue";
import { CronLight } from "@vue-js-cron/light";
import "@vue-js-cron/light/dist/light.css";
import Plugins from "./plugins/index";

export default {
  install(app: any) {
    app.component("PiContainer", PiContainer);
    app.component("TextEditable", TextEditable);

    app.component("CronLight", CronLight);
    app.component("CronEditor", CronEditor);

    app.component("CheckCircleOutlined", CheckCircleOutlined);
    app.component("InfoCircleOutlined", InfoCircleOutlined);
    app.component("UndoOutlined", UndoOutlined);

    app.use(vip);
    app.use(Plugins);
  }
};
