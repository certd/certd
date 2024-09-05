import { message, notification } from "ant-design-vue";
import { useUserStore } from "/@/store/modules/user";
export default {
  mounted(el: any, binding: any, vnode: any) {
    const { value } = binding;
    const userStore = useUserStore();
    el.className = el.className + " need-plus";
    if (!userStore.isPlus) {
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
