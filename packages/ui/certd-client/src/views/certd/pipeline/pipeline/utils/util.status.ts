export type StatusEnumItem = {
  value: string;
  label: string;
  color: string;
  icon: string;
  spin?: boolean;
  iconSpin?: boolean;
  iconColor?: string;
};
export type StatusEnumType = {
  [key: string]: StatusEnumItem;
};

const StatusEnum: StatusEnumType = {
  success: {
    value: "success",
    label: "statusSuccess",
    color: "green",
    spin: false,
    icon: "ant-design:check-circle-outlined",
  },
  error: {
    value: "error",
    label: "statusError",
    color: "red",
    icon: "ant-design:info-circle-outlined",
  },
  skip: {
    value: "skip",
    label: "statusSkip",
    color: "blue",
    icon: "fluent:arrow-step-over-20-filled",
  },
  start: {
    value: "start",
    label: "statusStart",
    color: "blue",
    spin: true,
    iconSpin: true,
    icon: "ant-design:sync-outlined",
  },
  canceled: {
    value: "canceled",
    label: "statusCanceled",
    color: "yellow",
    iconColor: "#d4b106",
    icon: "ant-design:minus-circle-twotone",
  },
  none: {
    value: "none",
    label: "statusNone",
    color: "blue",
    icon: "ant-design:minus-circle-twotone",
  },
  disabled: {
    value: "disabled",
    label: "statusDisabled",
    color: "gray",
    icon: "ant-design:stop-outlined",
  },
  no_deploy_count: {
    value: "no_deploy_count",
    label: "statusNoDeployCount",
    color: "gray",
    icon: "ant-design:stop-outlined",
  },
};
export const statusUtil = {
  getColor(status = "none") {
    return StatusEnum[status].color;
  },
  get(status = "none") {
    return StatusEnum[status];
  },

  getOptions() {
    const options: any[] = [];
    for (const key of Object.keys(StatusEnum)) {
      options.push(StatusEnum[key]);
    }
    return options;
  },
};
