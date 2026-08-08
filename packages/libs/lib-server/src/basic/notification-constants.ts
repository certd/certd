import { PipelineNotificationTypes } from "@certd/pipeline";

/** 服务端业务通知类型，包含流水线核心通知类型。 */
export const NotificationTypes = {
  ...PipelineNotificationTypes,
  Common: "common",
  CertApplySuccess: "certApplySuccess",
  CertPullError: "certPullError",
  CertDeployError: "certDeployError",
  SiteCheckError: "siteCheckError",
  SiteCertExpireRemind: "siteCertExpireRemind",
  DomainExpirationCheck: "domainExpirationCheck",
  VipExpireRemind: "vipExpireRemind",
  UserExpireRemind: "userExpireRemind",
  RegisterCode: "registerCode",
  ForgotPassword: "forgotPassword",
  GithubReleaseCheck: "githubReleaseCheck",
} as const;

export type NotificationTypeValue = (typeof NotificationTypes)[keyof typeof NotificationTypes];

export function isNotificationType(value: string): value is NotificationTypeValue {
  return Object.values(NotificationTypes).includes(value as NotificationTypeValue);
}
