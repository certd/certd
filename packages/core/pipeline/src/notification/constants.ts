/** 流水线核心使用的通知类型。业务层通知类型由 @certd/lib-server 扩展。 */
export const PipelineNotificationTypes = {
  PipelineResult: "pipelineResult",
} as const;

export type PipelineNotificationType = (typeof PipelineNotificationTypes)[keyof typeof PipelineNotificationTypes];
