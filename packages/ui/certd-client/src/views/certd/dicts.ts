import { dict } from "@fast-crud/fast-crud";

export const projectPermissionDict = dict({
  data: [
    {
      label: "read",
      value: "只读",
    },
    {
      label: "write",
      value: "读写",
    },
    {
      label: "admin",
      value: "管理员",
    },
  ],
});

export const myProjectDict = dict({
  url: "/enterprise/project/list",
  value: "id",
  label: "name",
});

export const userDict = dict({
  url: "/sys/authority/user/getSimpleUsers",
  value: "id",
  onReady: ({ dict }) => {
    for (const item of dict.data) {
      item.label = item.nickName || item.username || item.phoneCode + item.mobile;
    }
  },
});
