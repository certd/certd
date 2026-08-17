export const AuditType = {
  pipeline: { value: "pipeline", label: "流水线", color: "blue" },
  access: { value: "access", label: "授权管理", color: "orange" },
  monitor: { value: "monitor", label: "站点监控", color: "green" },
  notification: { value: "notification", label: "通知设置", color: "purple" },
  openKey: { value: "openKey", label: "API密钥", color: "red" },
  cname: { value: "cname", label: "CNAME记录", color: "cyan" },
  user: { value: "user", label: "用户管理", color: "cyan" },
  role: { value: "role", label: "角色管理", color: "geekblue" },
  permission: { value: "permission", label: "权限管理", color: "lime" },
  project: { value: "project", label: "项目管理", color: "gold" },
  settings: { value: "settings", label: "系统设置", color: "magenta" },
  domain: { value: "domain", label: "域名管理", color: "blue" },
  dnsPersist: { value: "dnsPersist", label: "持久验证记录", color: "purple" },
  certTemplate: { value: "certTemplate", label: "证书参数模版", color: "orange" },
  pipelineGroup: { value: "pipelineGroup", label: "流水线分组", color: "cyan" },
  subDomain: { value: "subDomain", label: "子域名托管", color: "geekblue" },
  template: { value: "template", label: "流水线模版", color: "blue" },
  mine: { value: "mine", label: "个人设置", color: "default" },
  login: { value: "login", label: "登录日志", color: "red" },
  addon: { value: "addon", label: "扩展插件", color: "orange" },
  enterprise: { value: "enterprise", label: "企业管理", color: "gold" },
  plugin: { value: "plugin", label: "插件管理", color: "magenta" },
  siteIp: { value: "siteIp", label: "站点IP", color: "green" },
  jobHistory: { value: "jobHistory", label: "监控历史", color: "default" },
  account: { value: "account", label: "账号管理", color: "geekblue" },
  plus: { value: "plus", label: "Plus许可", color: "volcano" },
} as const;

export const AuditAction = {
  add: { value: "add", label: "新增", color: "green" },
  update: { value: "update", label: "修改", color: "blue" },
  delete: { value: "delete", label: "删除", color: "red" },
  execute: { value: "execute", label: "执行", color: "orange" },
  cancel: { value: "cancel", label: "取消", color: "default" },
  batchDelete: { value: "batchDelete", label: "批量删除", color: "volcano" },
  batchUpdate: { value: "batchUpdate", label: "批量修改", color: "purple" },
  disable: { value: "disable", label: "禁用", color: "default" },
  import: { value: "import", label: "导入", color: "cyan" },
  bind: { value: "bind", label: "绑定", color: "green" },
  unbind: { value: "unbind", label: "解绑", color: "red" },
  register: { value: "register", label: "注册", color: "green" },
  login: { value: "login", label: "登录", color: "blue" },
  resetStatus: { value: "resetStatus", label: "重置状态", color: "orange" },
  setDefault: { value: "setDefault", label: "设置默认", color: "cyan" },
  save: { value: "save", label: "保存", color: "purple" },
  trigger: { value: "trigger", label: "触发", color: "orange" },
  active: { value: "active", label: "激活", color: "green" },
} as const;

export function buildAuditTypeDict() {
  return Object.values(AuditType).map(item => ({
    value: item.value,
    label: item.label,
    color: item.color,
  }));
}

export function buildAuditActionDict() {
  return Object.values(AuditAction).map(item => ({
    value: item.value,
    label: item.label,
    color: item.color,
  }));
}
