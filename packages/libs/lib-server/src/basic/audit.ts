export type AuditLogOptions = {
  type?: string;
  action?: string;
  content?: string;
  template?: string;
  disabled?: boolean;
};

export type AuditLogContext = {
  type?: string;
  action?: string;
  append?: string | string[];
  content?: string;
  projectId?: number;
  enabled?: boolean;
  scope?: string;
  userId?: number;
  username?: string;
  success?: boolean;
};

/** 审计日志方法的参数类型 */
export type AuditLogParam = {
  type?: string;
  action?: string;
  content?: string;
  append?: string | string[];
  projectId?: number;
  userId?: number;
  username?: string;
};

/** AuditService.log() 参数类型 */
export type AuditLogWriteParam = {
  userId: number;
  type: string;
  action: string;
  content: string;
  username?: string;
  projectId?: number;
  ipAddress?: string;
  scope?: string;
  success?: boolean;
};
