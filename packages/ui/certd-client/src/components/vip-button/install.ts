import VipButton from "./index.vue";
import plus from "./directive.js";
export default function (app: any) {
  app.component("VipButton", VipButton);
  app.directive("plus", plus);
}
