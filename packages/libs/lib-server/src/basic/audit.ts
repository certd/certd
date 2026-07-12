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
  projectName?: string;
  enabled?: boolean;
  allowAnonymous?: boolean;
  scope?: string;
  userId?: number;
  username?: string;
  success?: boolean;
};
