import * as api from "./api";
import { useI18n } from "vue-i18n";
import { ref } from "vue";
import { getCommonColumnDefine } from "/@/views/certd/access/common";

export default function ({ expose }) {
  const { t } = useI18n();
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
  const typeRef = ref();
  const { crudBinding } = expose;
  const commonColumnsDefine = getCommonColumnDefine(crudBinding, typeRef);
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
        name: {
          title: "名称",
          type: "text",
          form: {
            rules: [{ required: true, message: "必填项" }]
          }
        },
        ...commonColumnsDefine
      }
    }
  };
}
