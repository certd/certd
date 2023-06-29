import { createI18n } from "vue-i18n";
import en from "./locale/en";
import zh from "./locale/zh_CN";
const messages = {
  en: {
    label: "English",
    ...en
  },
  "zh-cn": {
    label: "简体中文",
    ...zh
  }
};

export default createI18n({
  legacy: false,
  locale: "zh-cn",
  fallbackLocale: "zh-cn",
  messages
});
