import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, useFormWrapper, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { templateApi } from "./api";
import { useRouter } from "vue-router";
import { useModal } from "/@/use/use-modal";
import createCrudOptionsPipeline from "../crud";
import * as pipelineApi from "../api";
import { useTemplate } from "/@/views/certd/pipeline/template/use";
import { useI18n } from "/@/locales";
import { useProjectStore } from "/@/store/project";
import { useDicts } from "../../dicts";
export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const api = templateApi;
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

  const projectStore = useProjectStore();
  const { openCrudFormDialog } = useFormWrapper();
  const router = useRouter();

  const model = useModal();
  const { myProjectDict } = useDicts();
  const { openCreateFromTemplateDialog } = useTemplate();

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      addForm: {
        onSuccess: ({ res }) => {
          router.push({ path: "/certd/pipeline/template/edit", query: { templateId: res.id, editMode: "true" } });
        },
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
      actionbar: {
        show: true,
        buttons: {
          add: {
            text: t("certd.template.createTemplate"),
            type: "primary",
            show: true,
          },
        },
      },
      rowHandle: {
        // width: 100,
        fixed: "right",
        buttons: {
          edit: { show: false },
          copy: { show: false },
          // use: {
          //   text: null,
          //   title: "使用此模版创建流水线",
          //   icon: "ion:duplicate-outline",
          //   click({ row }) {
          //     openCreateFromTemplateDialog({
          //       templateId: row.id,
          //       onCreated: ({ id }) => {
          //         router.push({ path: "/certd/pipeline/detail", query: { id, editMode: "true" } });
          //       },
          //     });
          //   },
          // },
          // import: {
          //   text: null,
          //   title: "批量导入创建",
          //   icon: "ion:duplicate",
          //   click({ row }) {
          //     router.push({ path: "/certd/pipeline/template/import", query: { templateId: row.id } });
          //   },
          // },
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
        title: {
          title: t("certd.template.templateName"),
          type: "text",
          search: {
            show: true,
          },
          form: {
            rules: [{ required: true, message: t("certd.template.enterTemplateName") }],
          },
          column: {
            width: 400,
            sorter: true,
            cellRender({ row, value }) {
              return (
                <router-link class={"flex items-center"} to={{ path: "/certd/pipeline/template/edit", query: { templateId: row.id } }}>
                  <fs-icon icon={"ion:create-outline"}></fs-icon>
                  <span class={"ml-5"}> {value}</span>
                </router-link>
              );
            },
          },
        },
        pipelineId: {
          title: t("certd.template.pipeline"),
          type: "table-select",
          search: { show: true },
          dict: dict({
            value: "id",
            label: "title",
            //重要，根据value懒加载数据
            getNodesByValues: async (values: any[]) => {
              return await pipelineApi.GetSimpleByIds(values);
            },
          }),
          editForm: {
            show: false,
          },
          column: {
            show: false,
          },
          form: {
            show: true,
            helper: t("certd.template.copyPipelineConfig"),
            component: {
              valuesFormat: {
                labelFormatter: (item: any) => {
                  return `${item.id}.${item.title}`;
                },
              },
              select: {
                placeholder: "点击选择",
              },
              showSelect: false,
              createCrudOptions: createCrudOptionsPipeline,
              crudOptionsOverride: {
                actionbar: {
                  show: false,
                },
                toolbar: {
                  show: false,
                },
                columns: {
                  title: {
                    column: {
                      cellRender: null,
                    },
                  },
                },
              },
            },
          },
        },
        useCreate: {
          title: t("certd.template.useTemplate"),
          form: { show: false },
          column: {
            conditionalRender: false,
            width: 400,
            cellRender({ row }) {
              function create() {
                openCreateFromTemplateDialog({
                  templateId: row.id,
                  onCreated: ({ id }) => {
                    router.push({ path: "/certd/pipeline/detail", query: { id, editMode: "true" } });
                  },
                });
              }
              return (
                <a class={"flex items-center"} onClick={create}>
                  <fs-icon icon={"ion:duplicate-outline"}></fs-icon>
                  <span class={"ml-5"}>{t("certd.template.singleCreate")}</span>
                </a>
              );
            },
          },
        },
        useImport: {
          title: t("certd.template.useTemplate"),
          form: { show: false },
          column: {
            conditionalRender: false,
            width: 400,
            cellRender({ row }) {
              return (
                <router-link class={"flex items-center"} to={{ path: "/certd/pipeline/template/import", query: { templateId: row.id } }}>
                  <fs-icon icon={"ion:duplicate"}></fs-icon>
                  <span class={"ml-5"}>{t("certd.template.batchCreate")}</span>
                </router-link>
              );
            },
          },
        },
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
