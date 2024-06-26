export type StatusEnumItem = {
  value: string;
  label: string;
  color: string;
  icon: string;
  spin?: boolean;
};
export type StatusEnumType = {
  [key: string]: StatusEnumItem;
};

const StatusEnum: StatusEnumType = {
  success: {
    value: "success",
    label: "成功",
    color: "green",
    spin: false,
    icon: "ant-design:check-circle-outlined"
  },
  error: {
    value: "error",
    label: "错误",
    color: "red",
    icon: "ant-design:info-circle-outlined"
  },
  skip: {
    value: "skip",
    label: "跳过",
    color: "blue",
    icon: "fluent:arrow-step-over-20-filled"
  },
  start: {
    value: "start",
    label: "运行中",
    color: "blue",
    spin: true,
    icon: "ant-design:sync-outlined"
  },
  canceled: {
    value: "canceled",
    label: "已取消",
    color: "yellow",
    spin: true,
    icon: "ant-design:minus-circle-twotone"
  },
  none: {
    value: "none",
    label: "未运行",
    color: "blue",
    icon: "ant-design:minus-circle-twotone"
  }
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
  }
};
