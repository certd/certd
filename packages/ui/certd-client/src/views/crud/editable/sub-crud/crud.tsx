import * as api from "./api";
import { dict, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, UserPageQuery, UserPageRes, EditReq, DelReq, AddReq } from "@fast-crud/fast-crud";
import EditableRowSub from "/@/views/crud/editable/sub-crud/row/index.vue";
export default function (props: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { crudBinding,crudRef } = props.crudExpose;
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
          }),
          form:{
            rules: [{ required: true, message: "请选择状态" }]
          }
        },
        subTable: {
          title: "子表格",
          type: "text",
          form: {
            component: {
              name: EditableRowSub,
              id:compute(({form})=>{
                return form.id
              }),
              on:{
                async saveMain({form}){
                  //保存主表
                  const formRef = crudExpose.getFormRef()
                  const ret = await formRef.submit()
                  //将form改为编辑模式
                  let formWrapperRef = crudExpose.getFormWrapperRef();
                  formWrapperRef.setFormData(ret.res)
                  crudRef.value.formWrapperRef.formOptions.mode = "edit"
                  crudRef.value.formWrapperRef.title="编辑"
                }
              }
            },
            col: {
              span: 24
            },
          },
          column: {
            formatter: ({ row }) => {
              return "点击编辑查看子表";
            }
          }
        }
      }
    }
  };
}
