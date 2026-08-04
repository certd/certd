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
      message.error("Please select records to delete first");
      return;
    }
    Modal.confirm({
      title: "Confirm",
      content: `Are you sure you want to delete the selected ${selectedRowKeys.value.length} site monitor records?`,
      async onOk() {
        await api.BatchDelObj(selectedRowKeys.value);
        message.success("Deleted successfully");
        selectedRowKeys.value = [];
        await crudExpose.doRefresh();
      },
    });
  };
  context.handleBatchDelete = handleBatchDelete;

  const checkStatusDict = dict({
    data: [
      { label: "Normal", value: "ok", color: "green" },
      { label: "Checking", value: "checking", color: "blue" },
      { label: "Error", value: "error", color: "red" },
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
          title: "User",
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
                placeholder: "Click to select user",
              },
              createCrudOptions: createCrudOptionsUser,
            },
          },
          column: {
            width: 150,
          },
        },
        projectId: {
          title: "Project ID",
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
          title: "Site Name",
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
          title: "Domain",
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
          title: "Certificate Domains",
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
          title: "Issuer",
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
          title: "Certificate Status",
          type: "dict-select",
          search: {
            show: true,
            col: {
              span: 3,
            },
          },
          dict: dict({
            data: [
              { label: "Normal", value: "ok", color: "green" },
              { label: "Expired", value: "expired", color: "red" },
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
          title: "Check Status",
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
          title: "Certificate Expiration Time",
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
          title: "Remaining Validity",
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
              return <span style={{ color }}>{leftDays} days</span>;
            },
          },
          form: {
            show: false,
          },
        },
        lastCheckTime: {
          title: "Last Check Time",
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
          title: "Status",
          type: "dict-select",
          search: {
            show: true,
            col: {
              span: 3,
            },
          },
          dict: dict({
            data: [
              { label: "Enabled", value: false, color: "green" },
              { label: "Disabled", value: true, color: "red" },
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
          title: "Remark",
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
          title: "Created At",
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
