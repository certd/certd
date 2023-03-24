import * as api from "./api";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes, utils } from "@fast-crud/fast-crud";
import dayjs from "dayjs";
import { computed, Ref, ref } from "vue";

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

  const options: Ref = ref([]);

  let arr = [
    {
      value: "1",
      label: "test"
    },
    {
      value: "1",
      label: "test2"
    }
  ];

  for (let i = 0; i < 10; i++) {
    arr = arr.concat(arr);
  }
  let i = 0;
  for (const item of arr) {
    i++;
    item.value = i + "";
  }
  options.value = arr;

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      form: {
        // 单列布局
        col: { span: 24 },
        labelCol: { span: 4 },
        wrapperCol: { span: 18 }
      },
      rowHandle: {
        fixed: "right"
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
        statusRemote: {
          title: "单选远程",
          search: {
            show: false
          },
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/ManyOpenStatusEnum?from=dict1"
          }),
          form: {
            component: { mode: "multiple" },
            rules: [{ required: true, message: "请选择一个选项" }]
          },
          column: {
            width: 200
          }
        }
      }
    }
  };
}
