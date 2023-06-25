// @ts-ignore
import * as api from "./api";
import { useI18n } from "vue-i18n";
import { ref } from "vue";
import { getCommonColumnDefine } from "/@/views/certd/access/common";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
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
  const commonColumnsDefine = getCommonColumnDefine(crudExpose, typeRef);
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
          search: {
            show: true
          },
          form: {
            rules: [{ required: true, message: "必填项" }]
          }
        },
        ...commonColumnsDefine
      }
    }
  };
}
