import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import dayjs from "dayjs";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
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
      toolbar: {
        export: {
          columnBuilder: ({ col }) => {
            // https://docs.sheetjs.com/docs/csf/features/#row-and-column-properties
            if (col.key === "multi") {
              col.width = 40;
            } else {
              col.width = 20;
            }
          },
          dataFormatter: ({ row, originalRow, col }) => {
            //格式化日期
            if (col.key === "date" && originalRow.date) {
              row.date = dayjs(originalRow.date).format("YYYY-MM-DD HH:mm:ss");
            }
          },
          fileType: context.fileType, //导出类型为excel
          dataFrom: context.dataFrom, //search查询获取， local 当前页数据
          //仅导出显示的列
          onlyShow: true,
          searchParams: {
            //查询条件
            page: {
              currentPage: 1,
              pageSize: 99999999
            }
            //以下不传，以当前查询条件为准
            // form: {},
            // sort: {}
          }
        }
      },
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
        text: {
          title: "文本",
          search: { show: true },
          type: "text"
        },
        radio: {
          title: "状态",
          search: { show: true },
          type: "dict-radio",
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum?single"
          })
        },
        multi: {
          title: "多选",
          search: { show: true },
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum?single"
          }),
          form: {
            component: {
              mode: "multiple"
            }
          }
        },
        date: {
          title: "日期",
          search: { show: true },
          type: "datetime",
          valueBuilder({ row, value, key }) {
            if (value) {
              row[key] = dayjs(value);
            }
          },
          valueResolve({ form, value, key }) {
            if (value) {
              form[key] = dayjs(value).unix();
            }
          }
        }
      }
    }
  };
}
