import { CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, UserPageQuery, UserPageRes, dict } from "@fast-crud/fast-crud";
import { useI18n } from "/src/locales";
import { useDicts } from "../dicts";

const typeDict = dict({
  url: "/pi/audit/dict",
  getData: async () => {
    const { createAuditApi } = await import("./api");
    const api = createAuditApi();
    const res = await api.GetDict();
    return res.types || [];
  },
});

const actionDict = dict({
  url: "/pi/audit/dict",
  getData: async () => {
    const { createAuditApi } = await import("./api");
    const api = createAuditApi();
    const res = await api.GetDict();
    return res.actions || [];
  },
});

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const { myProjectDict } = useDicts();
  const api = context.api;

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const delRequest = async (req: DelReq) => {
    return await api.DelObj(req.row.id);
  };

  return {
    crudOptions: {
      request: { pageRequest, delRequest },
      actionbar: {
        buttons: {
          add: { show: false },
        },
      },
      rowHandle: {
        width: 120,
        fixed: "right",
        buttons: {
          view: { show: false },
          edit: { show: false },
          remove: { show: true },
          copy: { show: false },
        },
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          column: { width: 80 },
          form: { show: false },
        },
        createTime: {
          title: "操作时间",
          type: "datetime",
          search: {
            show: true,
            component: {
              name: "a-range-picker",
            },
          },
          column: { width: 170, sorter: true },
          form: { show: false },
        },
        type: {
          title: "操作类型",
          type: "dict-select",
          dict: typeDict,
          search: { show: true },
          column: { width: 120 },
          form: { show: false },
        },
        action: {
          title: "操作动作",
          type: "text",
          search: { show: true },
          column: { width: 200, tooltip: true },
          form: { show: false },
        },
        content: {
          title: "备注",
          type: "text",
          search: { show: true },
          column: { width: 700, tooltip: true },
          form: { show: false },
        },
        ipAddress: {
          title: "IP地址",
          type: "text",
          column: { width: 140 },
          form: { show: false },
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
