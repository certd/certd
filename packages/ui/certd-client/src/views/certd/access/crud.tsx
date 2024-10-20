// @ts-ignore
import { useI18n } from "vue-i18n";
import { ref } from "vue";
import { getCommonColumnDefine } from "/@/views/certd/access/common";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const api = context.api;
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async (req: EditReq) => {
    const { form, row } = req;
    form.id = row.id;
    const res = await api.UpdateObj(form);
    return res;
  };
  const delRequest = async (req: DelReq) => {
    const { row } = req;
    return await api.DelObj(row.id);
  };

  const addRequest = async (req: AddReq) => {
    const { form } = req;
    const res = await api.AddObj(form);
    return res;
  };

  const typeRef = ref();
  const commonColumnsDefine = getCommonColumnDefine(crudExpose, typeRef, api);
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      form: {
        labelCol: {
          span: 6
        }
      },
      rowHandle: {
        width: 200
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 100
          },
          form: {
            show: false
          }
        },
        name: {
          title: "名称",
          type: "text",
          search: {
            show: true
          },
          form: {
            rules: [{ required: true, message: "必填项" }]
          },
          column: {
            width: 300
          }
        },
        from: {
          title: "级别",
          type: "dict-select",
          dict: dict({
            data: [
              { label: "系统", value: "sys" },
              { label: "用户", value: "user" }
            ]
          }),
          search: {
            show: false
          },
          form: {
            show: false
          },
          column: {
            width: 100,
            align: "center",
            component: {
              color: "auto"
            },
            order: 10
          },
          valueBuilder: ({ row, key, value }) => {
            row[key] = row.userId > 0 ? "user" : "sys";
          }
        },
        ...commonColumnsDefine
      }
    }
  };
}
