import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, useFormWrapper, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";
import * as api from "./api";
import { useProjectStore } from "/@/store/project";
import { usePluginStore } from "/@/store/plugin";
import { buildCertApplyTemplateColumns, buildTemplateSubmitData, pickCertApplyTemplateParams } from "./fields";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const pluginStore = usePluginStore();
  const projectStore = useProjectStore();
  const { openCrudFormDialog } = useFormWrapper();
  const isDefaultDict = dict({
    data: [
      { value: true, label: "默认", color: "green" },
      { value: false, label: "否", color: "gray" },
    ],
  });

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const addRequest = async ({ form }: AddReq) => {
    return await api.AddObj(buildTemplateSubmitData(form));
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    return await api.UpdateObj(buildTemplateSubmitData(form));
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };
  const infoRequest = async ({ row }: DelReq) => {
    if (row?.id) {
      return await api.GetObj(row.id);
    }
    return row;
  };

  async function setDefault(row: any) {
    await api.SetDefault(row.id);
    message.success("设置成功");
    await crudExpose.doRefresh();
  }

  async function openForm(entity?: any) {
    const certPlugin: any = await pluginStore.getPluginDefine("CertApply");
    const columns = buildCertApplyTemplateColumns(certPlugin);
    const row = await infoRequest({ row: entity });
    const content = row?.content ? (typeof row.content === "string" ? JSON.parse(row.content || "{}") : row.content) : {};
    const initialForm = row
      ? {
          id: row.id,
          name: row.name,
          isDefault: row.isDefault,
          disabled: row.disabled,
          ...pickCertApplyTemplateParams(content),
        }
      : {};
    await openCrudFormDialog({
      crudOptions: {
        columns,
        form: {
          mode: row ? "edit" : "add",
          initialForm,
          wrapper: {
            width: 1100,
            title: row ? "编辑证书申请参数模版" : "新增证书申请参数模版",
            saveRemind: false,
          },
          col: {
            span: 12,
          },
          async doSubmit({ form }: any) {
            if (row) {
              await editRequest({ form, row } as any);
            } else {
              await addRequest({ form } as any);
            }
          },
          async afterSubmit() {
            await crudExpose.doRefresh();
          },
        },
      },
    });
  }

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
        infoRequest,
      },
      search: {
        initialForm: {
          ...projectStore.getSearchForm(),
        },
      },
      actionbar: {
        buttons: {
          add: {
            icon: "ion:add-circle-outline",
            click: () => openForm(),
          },
        },
      },
      rowHandle: {
        fixed: "right",
        width: 120,
        buttons: {
          edit: {
            click: ({ row }) => openForm(row),
          },
          remove: {},
        },
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          column: { width: 80 },
          form: { show: false },
        },
        name: {
          title: "模版名称",
          type: "text",
          search: { show: true },
          column: { minWidth: 220 },
        },
        isDefault: {
          title: "默认",
          type: "dict-switch",
          dict: isDefaultDict,
          column: {
            width: 170,
            cellRender({ value, row }) {
              return (
                <div class="flex items-center gap-2">
                  <fs-values-format modelValue={value} dict={isDefaultDict}></fs-values-format>
                  {!row.isDefault && (
                    <a-button
                      size="small"
                      type="link"
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation();
                        setDefault(row);
                      }}
                    >
                      设为默认
                    </a-button>
                  )}
                </div>
              );
            },
          },
        },
        disabled: {
          title: "禁用",
          type: "dict-switch",
          column: { show: false },
          form: { show: false },
        },
        createTime: {
          title: "创建时间",
          type: "datetime",
          column: { width: 180 },
        },
        content: {
          title: "配置",
          type: "text",
          column: { show: false },
          form: { show: false },
        },
      },
    },
  };
}
