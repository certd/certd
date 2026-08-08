import createCrudOptionsUser from "/@/views/sys/authority/user/crud";
import { CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { message, Modal } from "ant-design-vue";
import dayjs from "dayjs";
import { ref } from "vue";
import { sysSiteMonitorApi } from "./api";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const api = sysSiteMonitorApi;
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const selectedRowKeys = ref<number[]>([]);
  const handleBatchDelete = () => {
    if (!selectedRowKeys.value?.length) {
      message.error("请先选择要删除的记录");
      return;
    }
    Modal.confirm({
      title: "确认",
      content: `确认删除选中的 ${selectedRowKeys.value.length} 条站点监控记录？`,
      async onOk() {
        await api.BatchDelObj(selectedRowKeys.value);
        message.success("删除成功");
        selectedRowKeys.value = [];
        await crudExpose.doRefresh();
      },
    });
  };
  context.handleBatchDelete = handleBatchDelete;

  const checkStatusDict = dict({
    data: [
      { label: "正常", value: "ok", color: "green" },
      { label: "检查中", value: "checking", color: "blue" },
      { label: "异常", value: "error", color: "red" },
    ],
  });

  return {
    crudOptions: {
      request: {
        pageRequest,
        delRequest,
      },
      actionbar: {
        show: false,
      },
      toolbar: {
        buttons: {
          export: {
            show: true,
          },
        },
        export: {
          dataFrom: "search",
        },
      },
      pagination: {
        pageSizeOptions: ["10", "20", "50", "100", "200"],
      },
      settings: {
        plugins: {
          rowSelection: {
            enabled: true,
            props: {
              multiple: true,
              crossPage: false,
              selectedRowKeys: () => {
                return selectedRowKeys;
              },
            },
          },
        },
      },
      rowHandle: {
        fixed: "right",
        width: 100,
        buttons: {
          view: { show: false },
          copy: { show: false },
          edit: { show: false },
          remove: {
            show: true,
          },
        },
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 80,
            align: "center",
          },
          form: {
            show: false,
          },
        },
        userId: {
          title: "用户",
          type: "table-select",
          search: {
            show: true,
            col: {
              span: 4,
            },
          },
          dict: dict({
            async getNodesByValues(ids: number[]) {
              return await api.GetSimpleUserByIds(ids);
            },
            value: "id",
            label: "nickName",
          }),
          form: {
            show: false,
            component: {
              crossPage: true,
              multiple: false,
              select: {
                placeholder: "点击选择用户",
              },
              createCrudOptions: createCrudOptionsUser,
            },
          },
          column: {
            width: 150,
          },
        },
        projectId: {
          title: "项目ID",
          type: "number",
          search: {
            show: true,
            col: {
              span: 3,
            },
          },
          column: {
            width: 100,
            align: "center",
          },
          form: {
            show: false,
          },
        },
        name: {
          title: "站点名称",
          type: "text",
          search: {
            show: true,
            col: {
              span: 4,
            },
          },
          column: {
            width: 160,
          },
          form: {
            show: false,
          },
        },
        domain: {
          title: "域名",
          type: "text",
          search: {
            show: true,
            col: {
              span: 4,
            },
          },
          column: {
            width: 230,
            sorter: true,
            cellRender({ value, row }) {
              const domainPort = `${value}:${row.httpsPort || 443}`;
              return (
                <a-tooltip title={domainPort} placement="left">
                  <fs-copyable modelValue={domainPort} title={domainPort}>
                    <a target="_blank" href={`https://${domainPort}`}>
                      {domainPort}
                    </a>
                  </fs-copyable>
                </a-tooltip>
              );
            },
          },
          form: {
            show: false,
          },
        },
        certDomains: {
          title: "证书域名",
          type: "text",
          search: {
            show: true,
            col: {
              span: 4,
            },
          },
          column: {
            width: 260,
            sorter: true,
            ellipsis: true,
            cellRender({ value }) {
              return <a-tooltip title={value}>{value}</a-tooltip>;
            },
          },
          form: {
            show: false,
          },
        },
        certProvider: {
          title: "颁发机构",
          type: "text",
          column: {
            width: 200,
            sorter: true,
            ellipsis: true,
            cellRender({ value }) {
              return <a-tooltip title={value}>{value}</a-tooltip>;
            },
          },
          form: {
            show: false,
          },
        },
        certStatus: {
          title: "证书状态",
          type: "dict-select",
          search: {
            show: true,
            col: {
              span: 3,
            },
          },
          dict: dict({
            data: [
              { label: "正常", value: "ok", color: "green" },
              { label: "已过期", value: "expired", color: "red" },
            ],
          }),
          column: {
            width: 100,
            sorter: true,
            align: "center",
          },
          form: {
            show: false,
          },
        },
        checkStatus: {
          title: "检查状态",
          type: "dict-select",
          search: {
            show: true,
            col: {
              span: 3,
            },
          },
          dict: checkStatusDict,
          column: {
            width: 100,
            sorter: true,
            align: "center",
            cellRender({ value, row }) {
              return (
                <a-tooltip title={row.error}>
                  <fs-values-format v-model={value} dict={checkStatusDict}></fs-values-format>
                </a-tooltip>
              );
            },
          },
          form: {
            show: false,
          },
        },
        certExpiresTime: {
          title: "证书到期时间",
          type: "datetime",
          column: {
            sorter: true,
            width: 155,
          },
          form: {
            show: false,
          },
        },
        remainingValidity: {
          title: "剩余有效期",
          type: "date",
          column: {
            width: 120,
            conditionalRender: false,
            cellRender({ row }) {
              if (!row.certExpiresTime) {
                return "-";
              }
              const leftDays = dayjs(row.certExpiresTime).diff(dayjs(), "day");
              const color = leftDays < 15 ? "red" : "#389e0d";
              return <span style={{ color }}>{leftDays}天</span>;
            },
          },
          form: {
            show: false,
          },
        },
        lastCheckTime: {
          title: "上次检查时间",
          type: "datetime",
          column: {
            sorter: true,
            width: 155,
          },
          form: {
            show: false,
          },
        },
        disabled: {
          title: "状态",
          type: "dict-select",
          search: {
            show: true,
            col: {
              span: 3,
            },
          },
          dict: dict({
            data: [
              { label: "启用", value: false, color: "green" },
              { label: "禁用", value: true, color: "red" },
            ],
          }),
          column: {
            width: 90,
            sorter: true,
            align: "center",
          },
          form: {
            show: false,
          },
        },
        remark: {
          title: "备注",
          type: "textarea",
          column: {
            width: 200,
            sorter: true,
            ellipsis: true,
            cellRender({ value }) {
              return <a-tooltip title={value}>{value}</a-tooltip>;
            },
          },
          form: {
            show: false,
          },
        },
        createTime: {
          title: "创建时间",
          type: "datetime",
          column: {
            width: 155,
            sorter: true,
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
