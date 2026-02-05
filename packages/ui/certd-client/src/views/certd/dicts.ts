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

export const projectDict = dict({
  url: "/sys/enterprise/project/list",
});
