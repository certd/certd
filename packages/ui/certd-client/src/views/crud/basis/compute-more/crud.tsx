import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { computed, ref } from "vue";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
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

  //普通的ref引用，可以动态切换配置
  const defValueRef = ref("我是动态的默认值");
  const defValueComputed = computed(() => {
    return defValueRef.value;
  });
  return {
    output: {
      defValueRef,
      defValueComputed
    },
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      table: {
        scroll: {
          x: 1500
        }
      },
      form: {
        labelCol: { span: 8 },
        wrapperCol: { span: 14 }
      },
      rowHandle: {
        fixed: "right",
        align: "center"
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
        defValue: {
          title: "默认值",
          type: "text",
          search: { show: true, value: null },
          form: {
            // form.value不支持asyncCompute
            // 假如你的默认值异步获取的，那么你自己必须保证先异步计算完成之后，才能打开对话框。
            // 因为在打开对话框时，默认值就必须得设置好。
            value: defValueRef
          }
        }
      }
    }
  };
}
