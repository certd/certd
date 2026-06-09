import createCrudOptionsUser from "/@/views/sys/authority/user/crud";
import { ColumnProps, CreateCrudOptionsProps, CreateCrudOptionsRet, DataFormatterContext, DelReq, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { message, Modal } from "ant-design-vue";
import dayjs from "dayjs";
import { ref } from "vue";
import { statusUtil } from "/@/views/certd/pipeline/pipeline/utils/util.status";
import { sysPipelineApi } from "./api";
import { useSettingStore } from "/@/store/settings";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const api = sysPipelineApi;
  const settingStore = useSettingStore();
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const selectedRowKeys = ref<number[]>([]);
  const pipelineTypeDictData = [
    { value: "cert", label: "证书申请" },
    { value: "cert_upload", label: "证书上传" },
    { value: "custom", label: "自定义" },
    { value: "template", label: "模板" },
    { value: "cert_auto", label: "证书申请" },
  ];
  const disabledDictData = [
    { label: "启用", value: false, color: "green" },
    { label: "禁用", value: true, color: "red" },
  ];

  function findDictLabel(data: any[], value: any) {
    return data.find(item => item.value === value)?.label ?? value;
  }

  function formatValidTime(value: any) {
    if (!value || value <= 0) {
      return "永久有效";
    }
    if (value < Date.now()) {
      return "已过期";
    }
    return dayjs(value).format("YYYY-MM-DD");
  }

  function getRecordValue(row: any, key: string) {
    return key.split(".").reduce((target, item) => target?.[item], row);
  }

  function formatListValue(value: any) {
    if (Array.isArray(value)) {
      return value.join(",");
    }
    return value ?? "";
  }

  function exportColumnFilter(col: ColumnProps) {
    if (!col.key || ["_index", "_selection", "rowHandle"].includes(col.key)) {
      return false;
    }
    if (col.key === "lastVars.certDomains") {
      return true;
    }
    return col.show !== false;
  }

  function exportDataFormatter(opts: DataFormatterContext) {
    const { row, originalRow, col, exportCol } = opts;
    const key = col.key;
    const value = getRecordValue(originalRow, key);

    if (key === "validTime") {
      row[key] = formatValidTime(value);
    } else if (key === "lastVars.certDomains") {
      row[key] = formatListValue(value);
    } else if (key === "status") {
      row[key] = statusUtil.get(value)?.label ?? value;
    } else if (key === "disabled") {
      row[key] = findDictLabel(disabledDictData, value);
    } else if (key === "type") {
      row[key] = findDictLabel(pipelineTypeDictData, value);
    } else if (key.includes("Time") && value) {
      row[key] = dayjs(value).format("YYYY-MM-DD HH:mm:ss");
    }

    if (col.width) {
      exportCol.width = col.width / 10;
    }
  }

  const handleBatchDelete = () => {
    if (!selectedRowKeys.value?.length) {
      message.error("请先选择要删除的记录");
      return;
    }
    settingStore.checkPlus();
    Modal.confirm({
      title: "确认",
      content: `确认删除选中的 ${selectedRowKeys.value.length} 条用户流水线？删除后会清理对应执行历史、日志和证书仓库记录。`,
      async onOk() {
        await api.BatchDelObj(selectedRowKeys.value);
        message.success("删除成功");
        selectedRowKeys.value = [];
        await crudExpose.doRefresh();
      },
    });
  };
  context.handleBatchDelete = handleBatchDelete;

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
          columnFilter: exportColumnFilter,
          dataFormatter: exportDataFormatter,
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
          search: {
            show: true,
            col: {
              span: 2,
            },
          },
          column: {
            width: 90,
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
        title: {
          title: "流水线名称",
          type: "text",
          search: {
            show: true,
            title: "关键词",
            component: {
              name: "a-input",
            },
            col: {
              span: 4,
            },
          },
          column: {
            width: 320,
            sorter: true,
            ellipsis: true,
            showTitle: true,
          },
          form: {
            show: false,
          },
        },
        type: {
          title: "类型",
          type: "dict-select",
          search: {
            show: true,
            col: {
              span: 3,
            },
          },
          dict: dict({
            data: pipelineTypeDictData,
          }),
          column: {
            width: 110,
            align: "center",
            sorter: true,
            component: {
              color: "auto",
            },
          },
          form: {
            show: false,
          },
        },
        status: {
          title: "运行状态",
          type: "dict-select",
          search: {
            show: true,
            col: {
              span: 3,
            },
          },
          dict: dict({
            data: statusUtil.getOptions(),
          }),
          column: {
            sorter: true,
            width: 120,
            align: "center",
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
            data: disabledDictData,
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
        stepCount: {
          title: "部署任务数",
          type: "number",
          column: {
            align: "center",
            width: 110,
          },
          form: {
            show: false,
          },
        },
        triggerCount: {
          title: "定时任务数",
          type: "number",
          column: {
            align: "center",
            width: 110,
            sorter: true,
          },
          form: {
            show: false,
          },
        },
        "lastVars.certDomains": {
          title: "证书域名",
          type: "text",
          column: {
            width: 260,
            show: false,
            ellipsis: true,
          },
          form: {
            show: false,
          },
        },
        lastHistoryTime: {
          title: "最后执行时间",
          type: "datetime",
          column: {
            sorter: true,
            width: 155,
            align: "center",
          },
          form: {
            show: false,
          },
        },
        nextRunTime: {
          title: "下次执行时间",
          type: "datetime",
          column: {
            sorter: true,
            width: 155,
            align: "center",
          },
          form: {
            show: false,
          },
        },
        validTime: {
          title: "有效期",
          type: "date",
          column: {
            sorter: true,
            width: 130,
            align: "center",
            cellRender({ value }) {
              if (!value || value <= 0) {
                return "永久有效";
              }
              if (value < Date.now()) {
                return <span style={{ color: "red" }}>已过期</span>;
              }
              return dayjs(value).format("YYYY-MM-DD");
            },
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
        updateTime: {
          title: "更新时间",
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
