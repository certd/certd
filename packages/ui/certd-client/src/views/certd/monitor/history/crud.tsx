// @ts-ignore
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { message, Modal } from "ant-design-vue";
import { ref } from "vue";
import { createGroupDictRef } from "../../basic/group/api";
import { useDicts } from "../../dicts";
import { jobHistoryApi } from "./api";
import { useCrudPermission } from "/@/plugin/permission";
import { useProjectStore } from "/@/store/project";
import { useI18n } from "/src/locales";
export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const api = jobHistoryApi;
  const { crudBinding } = crudExpose;
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async (req: EditReq) => {};
  const delRequest = async (req: DelReq) => {
    const { row } = req;
    return await api.DelObj(row.id);
  };

  const addRequest = async (req: AddReq) => {};
  const { myProjectDict } = useDicts();

  const historyResultDict = dict({
    data: [
      { label: t("monitor.history.jobResult.done"), value: "done", color: "green" },
      { label: t("monitor.history.jobResult.start"), value: "start", color: "blue" },
    ],
  });

  const jobTypeDict = dict({
    data: [
      { label: t("monitor.history.jobType.domainExpirationCheck"), value: "domainExpirationCheck", color: "green" },
      { label: t("monitor.history.jobType.siteCertMonitor"), value: "siteCertMonitor", color: "blue" },
    ],
  });

  const selectedRowKeys = ref([]);

  const handleBatchDelete = () => {
    if (selectedRowKeys.value?.length > 0) {
      Modal.confirm({
        title: "确认",
        content: `确定要批量删除这${selectedRowKeys.value.length}条记录吗`,
        async onOk() {
          await api.BatchDelObj(selectedRowKeys.value);
          message.info("删除成功");
          crudExpose.doRefresh();
          selectedRowKeys.value = [];
        },
      });
    } else {
      message.error("请先勾选记录");
    }
  };

  context.handleBatchDelete = handleBatchDelete;

  const GroupTypeSite = "site";
  const groupDictRef = createGroupDictRef(GroupTypeSite);

  function getDefaultGroupId() {
    const searchFrom = crudExpose.getSearchValidatedFormData();
    if (searchFrom.groupId) {
      return searchFrom.groupId;
    }
  }

  const projectStore = useProjectStore();
  const { hasActionPermission } = useCrudPermission({ permission: context.permission });
  return {
    id: "jobHistoryCrud",
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      // tabs: {
      //   name: "groupId",
      //   show: true,
      // },
      toolbar: {
        buttons: {
          export: {
            show: true,
          },
        },
      },
      pagination: {
        pageSizeOptions: ["10", "20", "50", "100", "200"],
      },
      settings: {
        plugins: {
          //这里使用行选择插件，生成行选择crudOptions配置，最终会与crudOptions合并
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
        buttons: {
          add: {
            show: false,
          },
        },
      },
      rowHandle: {
        fixed: "right",
        width: 280,
        buttons: {
          edit: {
            show: false,
          },
        },
      },
      // tabs: {
      //   name: "disabled",
      //   show: true,
      // },
      search: {
        initialForm: {
          ...projectStore.getSearchForm(),
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
            width: 80,
            align: "center",
          },
          form: {
            show: false,
          },
        },
        type: {
          title: t("monitor.history.jobTypeTitle"),
          search: {
            show: true,
          },
          type: "dict-select",
          dict: jobTypeDict,
          form: {
            show: false,
          },
          column: {
            width: 120,
          },
        },
        title: {
          title: t("monitor.history.titleTitle"),
          search: {
            show: true,
          },
          type: "text",
          column: {
            width: 200,
          },
        },
        content: {
          title: t("monitor.history.contentTitle"),
          search: {
            show: true,
          },
          type: "text",
          column: {
            width: 460,
            ellipsis: true,
          },
        },
        result: {
          title: t("monitor.history.resultTitle"),
          search: {
            show: false,
          },
          type: "dict-select",
          dict: historyResultDict,
          form: {
            show: false,
          },
          column: {
            width: 100,
            align: "center",
            sorter: true,
            cellRender({ value, row }) {
              return (
                <a-tooltip title={row.error}>
                  <fs-values-format v-model={value} dict={historyResultDict}></fs-values-format>
                </a-tooltip>
              );
            },
          },
        },
        startAt: {
          title: t("monitor.history.startAtTitle"),
          search: {
            show: true,
          },
          type: "datetime",
          column: {
            width: 160,
          },
        },
        endAt: {
          title: t("monitor.history.endAtTitle"),
          search: {
            show: true,
          },
          type: "datetime",
          column: {
            width: 160,
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
