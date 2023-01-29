import * as api from "./api";
import { utils } from "@fast-crud/fast-crud";
import dayjs from "dayjs";

console.log("utils", utils);
export default function ({ expose }) {
  const pageRequest = async (query) => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }) => {
    form.id = row.id;
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }) => {
    return await api.AddObj(form);
  };
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      table: {
        scroll: { x: 2000 }
      },
      rowHandle: { fixed: "right" },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 50
          },
          form: {
            show: false
          }
        },
        timestamp: {
          title: "时间戳",
          type: "datetime",
          search: {
            show: true,
            width: 185,
            component: {}
          },
          valueBuilder({ value, row, key }) {
            console.log("value builder:", key, value, row);
            if (value != null) {
              row[key] = dayjs(value);
            }
          },
          valueResolve({ value, row, key }) {
            if (value != null) {
              row[key] = value.unix();
            }
          }
        },
        humanize: {
          type: ["datetime", "time-humanize"],
          title: "人性化时间",
          column: {
            component: {
              options: {
                largest: 2
              }
            }
          }
        },
        datetime: {
          title: "日期时间",
          type: "datetime",
          form: {
            component: {
              valueFormat: "YYYY-MM-DD HH:mm:ss" //输入值的格式
            }
          }
        },
        format: {
          title: "格式化",
          type: "datetime",
          form: {
            component: {
              format: "YYYY年MM月DD日 HH:mm",
              valueFormat: "YYYY-MM-DD HH:mm:ss" //输入值的格式
            }
          },
          column: {
            width: 180,
            component: {
              // 行展示组件使用的dayjs，
              format: "YYYY年MM月DD日 HH:mm"
            }
          }
        },
        date: {
          title: "仅日期",
          type: "date",
          form: {
            component: {
              valueFormat: "YYYY-MM-DD HH:mm:ss", //输入值的格式
              events: {
                onChange(context) {
                  console.log("change", context);
                }
              }
            }
          }
        },
        time: {
          title: "仅时间",
          type: "time",
          form: {
            component: {
              valueFormat: "YYYY-MM-DD HH:mm:ss" //输入值的格式
            }
          }
        },
        disabledDate: {
          title: "禁用日期",
          type: "date",
          form: {
            component: {
              valueFormat: "YYYY-MM-DD HH:mm:ss", //输入值的格式
              disabledDate(current) {
                return current && current < dayjs().endOf("day");
              }
            }
          }
        },
        daterange: {
          title: "日期范围",
          type: "daterange",
          search: { show: true, width: 300 },
          valueBuilder({ row, key }) {
            if (!utils.strings.hasEmpty(row.daterangeStart, row.daterangeEnd)) {
              row[key] = [dayjs(row.daterangeStart), dayjs(row.daterangeEnd)];
            }
          }
        },
        datetimerange: {
          title: "日期时间范围",
          type: "datetimerange",
          search: { show: true, width: 300 },
          valueBuilder({ row, key }) {
            if (!utils.strings.hasEmpty(row.datetimerangeStart, row.datetimerangeEnd)) {
              row[key] = [dayjs(row.datetimerangeStart), dayjs(row.datetimerangeEnd)];
            }
          },
          valueResolve({ form, key }) {
            const row = form;
            if (row[key] != null && !utils.strings.hasEmpty(row[key])) {
              row.datetimerangeStart = row[key][0];
              row.datetimerangeEnd = row[key][1];
            } else {
              row.datetimerangeStart = null;
              row.datetimerangeEnd = null;
            }
          }
        },
        customType: {
          title: "自定义字段类型",
          type: "time2"
        }
      }
    }
  };
}
