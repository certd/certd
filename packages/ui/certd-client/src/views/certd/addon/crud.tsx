import { ref } from "vue";
import { getCommonColumnDefine } from "./common";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const api = context.api;
  const addonType = context.addonType;
  const type = context.type;
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    if (query.query?.body) {
      delete query.query.body;
    }

    return await api.GetList(query);
  };
  const editRequest = async (req: EditReq) => {
    const { form, row } = req;
    form.id = row.id;
    delete form.body;
    const res = await api.UpdateObj(form);
    return res;
  };
  const delRequest = async (req: DelReq) => {
    const { row } = req;
    return await api.DelObj(row.id);
  };

  const addRequest = async (req: AddReq) => {
    const { form } = req;
    delete form.body;
    const res = await api.AddObj(form);
    return res;
  };

  const typeRef = ref();
  const commonColumnsDefine = getCommonColumnDefine(crudExpose, typeRef, api, addonType);
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      search: {
        initialForm: {
          addonType: addonType,
          type: type,
        },
      },
      form: {
        labelCol: {
          //固定label宽度
          span: null,
          style: {
            width: "145px",
          },
        },
      },
      addForm: {
        initialForm: {
          addonType: addonType,
          type: type,
        },
      },
      rowHandle: {
        width: 200,
      },
      columns: {
        ...commonColumnsDefine,
      },
    },
  };
}
