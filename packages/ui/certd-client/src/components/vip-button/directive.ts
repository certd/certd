import { notification } from "ant-design-vue";
import { useSettingStore } from "/@/store/modules/settings";

export default {
  mounted(el: any, binding: any, vnode: any) {
    const { value } = binding;
    const settingStore = useSettingStore();
    el.className = el.className + " need-plus";
    if (!settingStore.isPlus) {
      function checkPlus() {
        // 事件处理代码
        notification.warn({
          message: "此为专业版功能，请升级到专业版"
        });
      }
      el.addEventListener("click", function (event: any) {
        checkPlus();
      });
      el.addEventListener("move", function (event: any) {
        checkPlus();
      });
    }
  }
};
