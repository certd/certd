import { dict } from "@fast-crud/fast-crud";

export const userDict = dict({
  url: "/sys/authority/user/getSimpleUsers",
  value: "id",
  onReady: ({ dict }) => {
    for (const item of dict.data) {
      item.label = item.nickName || item.username || item.phoneCode + item.mobile;
    }
  },
});
