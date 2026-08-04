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
    label: "Success",
    color: "green",
    spin: false,
    icon: "ant-design:check-circle-outlined",
  },
  error: {
    value: "error",
    label: "Error",
    color: "red",
    icon: "ant-design:info-circle-outlined",
  },
  skip: {
    value: "skip",
    label: "Skipped",
    color: "blue",
    icon: "fluent:arrow-step-over-20-filled",
  },
  start: {
    value: "start",
    label: "Running",
    color: "blue",
    spin: true,
    iconSpin: true,
    icon: "ant-design:sync-outlined",
  },
  canceled: {
    value: "canceled",
    label: "Canceled",
    color: "yellow",
    iconColor: "#d4b106",
    icon: "ant-design:minus-circle-twotone",
  },
  none: {
    value: "none",
    label: "Not Run",
    color: "blue",
    icon: "ant-design:minus-circle-twotone",
  },
  disabled: {
    value: "disabled",
    label: "Disabled",
    color: "gray",
    icon: "ant-design:stop-outlined",
  },
  no_deploy_count: {
    value: "no_deploy_count",
    label: "Insufficient Runs",
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
