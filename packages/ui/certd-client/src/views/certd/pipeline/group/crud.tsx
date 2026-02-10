import { useI18n } from "/src/locales";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { pipelineGroupApi } from "./api";
import { useProjectStore } from "/@/store/project";
import { myProjectDict } from "../../dicts";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const api = pipelineGroupApi;
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

  const projectStore = useProjectStore();

  return {
    crudOptions: {
      settings: {
        plugins: {
          mobile: {
            props: {
              rowHandle: {
                width: 160,
              },
            },
          },
        },
      },
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      search: {
        initialForm: {
          ...projectStore.getSearchForm(),
        },
      },
      form: {
        labelCol: {
          //固定label宽度
          span: null,
          style: {
            width: "100px",
          },
        },
        col: {
          span: 22,
        },
        wrapper: {
          width: 600,
        },
      },
      rowHandle: {
        width: 200,
        group: {
          editable: {
            edit: {
              text: t("certd.edit"),
              order: -1,
              type: "primary",
              click({ row, index }) {
                crudExpose.openEdit({
                  index,
                  row,
                });
              },
            },
          },
        },
      },
      table: {
        editable: {
          enabled: true,
          mode: "cell",
          exclusive: true,
          //排他式激活效果，将其他行的编辑状态触发保存
          exclusiveEffect: "save", //自动保存其他行编辑状态，cancel = 自动关闭其他行编辑状态
          async updateCell(opts) {
            const { row, key, value } = opts;
            //如果是添加，需要返回{[rowKey]:xxx},比如:{id:2}
            return await api.UpdateObj({ id: row.id, [key]: value });
          },
        },
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          search: {
            show: true,
          },
          column: {
            width: 100,
            editable: {
              disabled: true,
            },
          },
          form: {
            show: false,
          },
        },
        name: {
          title: t("certd.groupName"),
          search: {
            show: true,
          },
          type: "text",
          form: {
            rules: [
              {
                required: true,
                message: t("certd.enterGroupName"),
              },
            ],
          },
          column: {
            width: 400,
          },
        },
        projectId: {
          title: t("certd.fields.projectName"),
          type: "dict-select",
          dict: myProjectDict,
        },
      },
    },
  };
}
