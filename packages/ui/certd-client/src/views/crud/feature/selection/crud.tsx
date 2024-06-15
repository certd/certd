import * as api from "./api";
import {
  AddReq,
  CreateCrudOptionsProps,
  CreateCrudOptionsRet,
  DelReq,
  dict,
  EditReq,
  UserPageQuery,
  UserPageRes,
  utils
} from "@fast-crud/fast-crud";
import { ref } from "vue";
export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
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

  const selectedRowKeys = ref([]);
  context.selectedRowKeys = selectedRowKeys;

  const onSelectChange = (changed: any) => {
    utils.logger.info("selection", changed);
    selectedRowKeys.value = changed;
  };
  return {
    crudOptions: {
      table: {
        rowKey: "id",
        rowSelection: {
          selectedRowKeys: selectedRowKeys,
          onChange: onSelectChange,
          getCheckboxProps: (record: any) => ({
            disabled: record.id === 1 // 此处演示第一行禁用
          })
        }
      },
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          column: {
            width: 50
          },
          form: {
            show: false
          }
        },
        text: {
          title: "Text",
          type: "text",
          search: { show: true }
        }
      }
    }
  };
}
