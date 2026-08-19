import { useSettingStore } from "/@/store/settings";

export default {
  mounted(el: any, binding: any, vnode: any) {
    const settingStore = useSettingStore();
    const isComm = settingStore.isComm;
    const { value } = binding;
    if ((value === false && isComm) || (value === true && !isComm)) {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
  },
};
