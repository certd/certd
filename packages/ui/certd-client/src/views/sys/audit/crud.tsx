import { CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, UserPageQuery, UserPageRes, dict } from "@fast-crud/fast-crud";

const typeDict = dict({
  url: "/sys/audit/dict",
  getData: async () => {
    const { createSysAuditApi } = await import("./api");
    const api = createSysAuditApi();
    const res = await api.GetDict();
    return res.types || [];
  },
});

const actionDict = dict({
  url: "/sys/audit/dict",
  getData: async () => {
    const { createSysAuditApi } = await import("./api");
    const api = createSysAuditApi();
    const res = await api.GetDict();
    return res.actions || [];
  },
});

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const api = context.api;

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const delRequest = async (req: DelReq) => {
    return await api.DelObj(req.row.id);
  };

  const cleanExpired = async () => {
    await api.Clean(90);
    crudExpose.doRefresh();
  };

  return {
    crudOptions: {
      request: { pageRequest, delRequest },
      actionbar: {
        buttons: {
          add: { show: false },
          clean: {
            text: "清理过期日志(90天)",
            type: "default",
            click: cleanExpired,
          },
        },
      },
      rowHandle: {
        width: 120,
        fixed: "right",
        buttons: {
          view: { show: false },
          edit: { show: false },
          remove: { show: true },
        },
      },
      search: {
        initialForm: {
          sort: { prop: "id", asc: false },
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
              vModel: ["createTime_start", "createTime_end"],
            },
          },
          column: { width: 170, sorter: true },
          form: { show: false },
        },
        userName: {
          title: "操作人",
          type: "text",
          search: { show: true },
          column: { width: 120 },
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
          type: "dict-select",
          dict: actionDict,
          search: { show: true },
          column: { width: 100 },
          form: { show: false },
        },
        content: {
          title: "内容",
          type: "text",
          search: { show: true },
          column: { minWidth: 300 },
          form: { show: false },
        },
        ipAddress: {
          title: "IP地址",
          type: "text",
          column: { width: 140 },
          form: { show: false },
        },
      },
    },
  };
}
