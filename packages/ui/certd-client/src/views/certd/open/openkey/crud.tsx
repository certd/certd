// @ts-ignore
import { useI18n } from "/src/locales";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { OPEN_API_DOC, openkeyApi } from "./api";
import { useModal } from "/@/use/use-modal";
import { useProjectStore } from "/@/store/project";
import { projectDict } from "../../dicts";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const api = openkeyApi;
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
  const model = useModal();
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      search: {
        show: false,
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
      actionbar: {},
      rowHandle: {
        width: 300,
        fixed: "right",
        buttons: {
          view: { show: true },
          copy: { show: false },
          edit: { show: false },
          remove: { show: true },
          gen: {
            text: t("certd.gen.text"),
            size: "mini",
            icon: "devicon-plain:vitest",
            type: "primary",
            async click({ row }) {
              const apiToken = await api.GetApiToken(row.id);

              model.success({
                title: t("certd.gen.title"),
                maskClosable: true,
                okText: t("certd.gen.okText"),
                width: 600,
                content: () => {
                  return (
                    <div>
                      <div class={"m-10 p-10"}>
                        {t("certd.gen.contentPart1")}
                        <a href={OPEN_API_DOC} target={"_blank"}>
                          {t("certd.gen.openApi")}
                        </a>
                        {t("certd.gen.contentPart2")}
                      </div>
                      <div class={"m-10 p-10"} style={{ border: "1px solid #333" }}>
                        <fs-copyable model-value={apiToken}></fs-copyable>
                      </div>
                    </div>
                  );
                },
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
          search: {
            show: false,
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
        keyId: {
          title: "KeyId",
          type: ["text", "copyable"],
          search: {
            show: true,
          },
          form: {
            show: false,
          },
          column: {
            width: 250,
            sorter: true,
          },
        },
        keySecret: {
          title: "KeySecret",
          type: ["text", "copyable"],
          form: {
            show: false,
          },
          column: {
            width: 580,
            sorter: true,
          },
        },
        scope: {
          title: t("certd.scope"),
          type: "dict-radio",
          dict: dict({
            data: [
              { label: t("certd.scopeOpenApiOnly"), value: "open", color: "blue" },
              { label: t("certd.scopeFullAccount"), value: "user", color: "red" },
            ],
          }),
          form: {
            value: "open",
            show: true,
            rules: [{ required: true, message: t("certd.required") }],
            helper: t("certd.scopeHelper"),
            component: {
              vModel: "value",
            },
          },
          column: {
            width: 120,
            align: "center",
            sorter: true,
          },
        },
        projectId: {
          title: t("certd.fields.projectName"),
          type: "dict-select",
          dict: projectDict,
        },
        createTime: {
          title: t("certd.fields.createTime"),
          type: "datetime",
          search: {
            show: false,
          },
          form: {
            show: false,
          },
        },
      },
    },
  };
}
