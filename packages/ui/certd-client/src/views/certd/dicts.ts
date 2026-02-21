import { dict } from "@fast-crud/fast-crud";
import { GetMyProjectList } from "./project/api";

const projectPermissionDict = dict({
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

const myProjectDict = dict({
  url: "/enterprise/project/list",
  getData: async () => {
    const res = await GetMyProjectList();
    return res;
  },
  value: "id",
  label: "name",
  immediate: false,
  onReady: ({ dict }) => {
    for (const item of dict.data) {
      item.label = item.name;
      item.value = item.id;
    }
  },
});

const userDict = dict({
  url: "/sys/authority/user/getSimpleUsers",
  value: "id",
  onReady: ({ dict }) => {
    for (const item of dict.data) {
      item.label = item.nickName || item.username || item.phoneCode + item.mobile;
    }
  },
});

export function useDicts() {
  return {
    projectPermissionDict,
    myProjectDict,
    userDict,
  };
}
