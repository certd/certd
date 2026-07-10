export const AuditType = {
  pipeline: "pipeline",
  access: "access",
  monitor: "monitor",
  notification: "notification",
  openKey: "openKey",
  user: "user",
  role: "role",
  permission: "permission",
  project: "project",
  settings: "settings",
} as const;

export const AuditTypeMap = {
  pipeline: "流水线",
  access: "授权管理",
  monitor: "站点监控",
  notification: "通知设置",
  openKey: "API密钥",
  user: "用户管理",
  role: "角色管理",
  permission: "权限管理",
  project: "项目管理",
  settings: "系统设置",
} as const;

export const AuditAction = {
  add: "add",
  update: "update",
  delete: "delete",
  execute: "execute",
  cancel: "cancel",
  batchDelete: "batchDelete",
  batchUpdate: "batchUpdate",
  disable: "disable",
} as const;

export const AuditActionMap = {
  add: "新增",
  update: "修改",
  delete: "删除",
  execute: "执行",
  cancel: "取消",
  batchDelete: "批量删除",
  batchUpdate: "批量修改",
  disable: "禁用",
} as const;

export const AuditTypeColorMap: Record<string, string> = {
  pipeline: "blue",
  access: "orange",
  monitor: "green",
  notification: "purple",
  openKey: "red",
  user: "cyan",
  role: "geekblue",
  permission: "lime",
  project: "gold",
  settings: "magenta",
};

export const AuditActionColorMap: Record<string, string> = {
  add: "green",
  update: "blue",
  delete: "red",
  execute: "orange",
  cancel: "default",
  batchDelete: "volcano",
  batchUpdate: "purple",
  disable: "default",
};

export function buildAuditTypeDict() {
  return Object.entries(AuditTypeMap).map(([value, label]) => ({
    value,
    label,
    color: AuditTypeColorMap[value],
  }));
}

export function buildAuditActionDict() {
  return Object.entries(AuditActionMap).map(([value, label]) => ({
    value,
    label,
    color: AuditActionColorMap[value],
  }));
}
