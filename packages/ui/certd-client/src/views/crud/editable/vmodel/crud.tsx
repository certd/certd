import * as api from "./api";
import { dict, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, UserPageQuery, UserPageRes, EditReq, DelReq, AddReq } from "@fast-crud/fast-crud";
import EditableFreeSub from "./free/index.vue";
export default function (props: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { crudBinding } = props.crudExpose;
  const { crudExpose } = props;
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    if (form.id == null) {
      form.id = row.id;
    }
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
      form: {
        wrapper: {
          width: "80%"
        },
        async beforeSubmit() {
          const validate = await crudExpose.getFormComponentRef("subTable")?.validate();
          if (validate !== true) {
            return false;
          }
        }
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          form: {
            show: false
          },
          column: { width: 80, align: "center" }
        },
        radio: {
          title: "状态",
          search: { show: true },
          type: "dict-radio",
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum?single"
          })
        },
        subTable: {
          title: "子表格",
          type: "text",
          form: {
            component: {
              name: EditableFreeSub,
              vModel: "modelValue"
            },
            col: {
              span: 24
            }
          },
          column: {
            formatter: ({ row }) => {
              return row.subTable?.length + "条数据";
            }
          }
        }
      }
    }
  };
}
