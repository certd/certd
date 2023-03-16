import { defineAsyncComponent } from "vue";
const AsyncHighLight = defineAsyncComponent(() => import("./highlight/index.vue"));
export default {
  install(app: any) {
    app.component("FsHighlight", AsyncHighLight);
  }
};
