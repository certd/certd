import { dict } from "@fast-crud/fast-crud";
import { GetMyProjectList } from "./project/api";

const projectPermissionDict = dict({
  data: [
    {
      value: "read",
      label: "只读",
      color: "cyan",
      icon: "material-symbols:folder-eye-outline-sharp",
    },
    {
      value: "write",
      label: "读写",
      color: "green",
      icon: "material-symbols:edit-square-outline-rounded",
    },
    {
      value: "admin",
      label: "管理员",
      color: "orange",
      icon: "material-symbols:manage-accounts-rounded",
    },
  ],
});

const projectMemberStatusDict = dict({
  data: [
    {
      value: "pending",
      label: "待审核",
      color: "orange",
      icon: "material-symbols:hourglass-top",
    },
    {
      value: "approved",
      label: "已加入",
      color: "green",
      icon: "material-symbols:done-all",
    },
    {
      value: "rejected",
      label: "已拒绝",
      color: "red",
      icon: "material-symbols:close",
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
    projectMemberStatusDict,
  };
}
