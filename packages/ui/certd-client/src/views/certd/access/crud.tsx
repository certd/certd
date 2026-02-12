// @ts-ignore
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { ref } from "vue";
import { myProjectDict } from "../dicts";
import { useProjectStore } from "/@/store/project";
import { getCommonColumnDefine } from "/@/views/certd/access/common";
import { useI18n } from "/src/locales";

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
  const projectStore = useProjectStore();
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      table: {
        remove: {
          confirmMessage: "授权如果已经被使用，可能会导致流水线无法正常运行，请谨慎操作",
        },
      },
      search: {
        initialForm: {
          ...projectStore.getSearchForm(),
        },
      },
      rowHandle: {
        width: 200,
        buttons: {
          copy: {
            async click(ctx: any) {
              const { row, index } = ctx;
              await crudExpose.openCopy({
                row: {
                  ...row,
                  _copyFrom: row.id,
                },
                index: index,
              });
            },
          },
        },
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 100,
            order: -999,
          },
          form: {
            show: false,
          },
        },
        name: {
          title: "名称",
          type: "text",
          search: {
            show: true,
          },
          form: {
            rules: [{ required: true, message: "必填项" }],
            order: -11,
          },
          column: {
            width: 300,
            order: -11,
          },
        },
        from: {
          title: "级别",
          type: "dict-select",
          dict: dict({
            data: [
              { label: "系统", value: "sys" },
              { label: "用户", value: "user" },
            ],
          }),
          search: {
            show: false,
          },
          form: {
            show: false,
          },
          column: {
            width: 100,
            align: "center",
            component: {
              color: "auto",
            },
            order: 10,
          },
          valueBuilder: ({ row, key, value }) => {
            row[key] = row.userId > 0 ? "user" : "sys";
          },
        },
        ...commonColumnsDefine,
        projectId: {
          title: t("certd.fields.projectName"),
          type: "dict-select",
          dict: myProjectDict,
          form: {
            show: false,
          },
        },
      },
    },
  };
}
