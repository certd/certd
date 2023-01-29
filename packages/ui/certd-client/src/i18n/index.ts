import { createI18n } from "vue-i18n";
//
import enFsLocale from "@fast-crud/fast-crud/dist/locale/lang/en.js";
import zhFsLocale from "@fast-crud/fast-crud/dist/locale/lang/zh-cn.js";
import en from "./locale/en";
import zh from "./locale/zh_CN";
const messages = {
  en: {
    label: "English",
    // 定义您自己的字典，但是请不要和 `fs` 重复，这样会导致 fast-crud 内部组件的翻译失效.
    fs: enFsLocale.fs,
    ...en
  },
  "zh-cn": {
    label: "简体中文",
    // 定义您自己的字典，但是请不要和 `fs` 重复，这样会导致 fast-crud  内部组件的翻译失效.
    fs: zhFsLocale.fs,
    ...zh
  }
};

export default createI18n({
  legacy: false,
  locale: "zh-cn",
  fallbackLocale: "zh-cn",
  messages
});
