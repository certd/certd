import PiContainer from "./container.vue";
import TextEditable from "./editable.vue";
import vip from "./vip-button/install.js";
import { CheckCircleOutlined, InfoCircleOutlined, UndoOutlined } from "@ant-design/icons-vue";
import CronEditor from "./cron-editor/index.vue";
import FoldBox from "./fold-box.vue";
import { CronLight } from "@certd/vue-js-cron-light";
import "@certd/vue-js-cron-light/dist/light.css";
import Plugins from "./plugins/index";
import LoadingButton from "./loading-button.vue";
import IconSelect from "./icon-select.vue";
import ExpiresTimeText from "./expires-time-text.vue";
import FileInput from "./file-input.vue";
import PemInput from "./pem-input.vue";
import { defineAsyncComponent } from "vue";
import NotificationSelector from "../views/certd/notification/notification-selector/index.vue";
import EmailSelector from "./email-selector/index.vue";
import ValidTimeFormat from "./valid-time-format.vue";
import ProjectSelector from "./project-selector/index.vue";
import ProjectCurrent from "./project-selector/project-current.vue";

export default {
  install(app: any) {
    app.component(
      "CodeEditor",
      defineAsyncComponent(() => import("./code-editor/index.vue"))
    );
    app.component("EmailSelector", EmailSelector);
    app.component("NotificationSelector", NotificationSelector);
    app.component("PiContainer", PiContainer);
    app.component("TextEditable", TextEditable);
    app.component("FileInput", FileInput);
    app.component("PemInput", PemInput);
    app.component("ValidTimeFormat", ValidTimeFormat);
    // app.component("CodeEditor", CodeEditor);

    app.component("CronLight", CronLight);
    app.component("CronEditor", CronEditor);

    app.component("FoldBox", FoldBox);

    app.component("CheckCircleOutlined", CheckCircleOutlined);
    app.component("InfoCircleOutlined", InfoCircleOutlined);
    app.component("UndoOutlined", UndoOutlined);

    app.component("LoadingButton", LoadingButton);
    app.component("IconSelect", IconSelect);
    app.component("ExpiresTimeText", ExpiresTimeText);
    app.use(vip);
    app.use(Plugins);
    app.component("ProjectSelector", ProjectSelector);
    app.component("ProjectCurrent", ProjectCurrent);
  },
};
