// @ts-ignore
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import dayjs from "dayjs";
import { useDicts } from "../dicts";
import { useProjectStore } from "/@/store/project";
import { useI18n } from "/src/locales";
import { clientApi } from "./api";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const api = clientApi;
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const delRequest = async (req: DelReq) => {
    const { row } = req;
    return await api.DelObj(row.id);
  };
  const editRequest = async (req: EditReq) => {};
  const addRequest = async (req: AddReq) => {};

  const { myProjectDict } = useDicts();
  const projectStore = useProjectStore();

  return {
    id: "clientCrud",
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      pagination: {
        pageSizeOptions: ["10", "20", "50", "100", "200"],
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
        width: 120,
        buttons: {
          view: {
            show: false,
          },
          edit: {
            show: false,
          },
        },
      },
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
            width: 70,
            align: "center",
          },
          form: {
            show: false,
          },
        },
        machineName: {
          title: t("certd.client.machineName"),
          search: {
            show: true,
          },
          type: "text",
          form: {
            show: false,
          },
          column: {
            width: 180,
            ellipsis: true,
          },
        },
        clientId: {
          title: t("certd.client.clientId"),
          search: {
            show: true,
          },
          type: "text",
          form: {
            show: false,
          },
          column: {
            width: 220,
            ellipsis: true,
          },
        },
        version: {
          title: t("certd.client.version"),
          search: {
            show: false,
          },
          type: "text",
          form: {
            show: false,
          },
          column: {
            width: 90,
            align: "center",
          },
        },
        os: {
          title: t("certd.client.os"),
          search: {
            show: false,
          },
          type: "text",
          form: {
            show: false,
          },
          column: {
            width: 100,
            align: "center",
          },
        },
        online: {
          title: t("certd.client.status"),
          search: {
            show: false,
          },
          type: "text",
          form: {
            show: false,
          },
          column: {
            width: 100,
            align: "center",
            cellRender({ value, row }) {
              const online = value === true;
              const heartbeat = row.lastHeartbeatAt ? dayjs(row.lastHeartbeatAt).format("YYYY-MM-DD HH:mm:ss") : "";
              return (
                <a-tooltip title={heartbeat}>
                  <a-tag color={online ? "green" : "red"}>{online ? t("certd.client.online") : t("certd.client.offline")}</a-tag>
                </a-tooltip>
              );
            },
          },
        },
        siteCount: {
          title: t("certd.client.siteCount"),
          search: {
            show: false,
          },
          type: "number",
          form: {
            show: false,
          },
          column: {
            width: 90,
            align: "center",
          },
        },
        httpsSiteCount: {
          title: t("certd.client.httpsSiteCount"),
          search: {
            show: false,
          },
          type: "number",
          form: {
            show: false,
          },
          column: {
            width: 110,
            align: "center",
          },
        },
        syncedSiteCount: {
          title: t("certd.client.syncedSiteCount"),
          search: {
            show: false,
          },
          type: "number",
          form: {
            show: false,
          },
          column: {
            width: 90,
            align: "center",
          },
        },
        failedSiteCount: {
          title: t("certd.client.failedSiteCount"),
          search: {
            show: false,
          },
          type: "number",
          form: {
            show: false,
          },
          column: {
            width: 80,
            align: "center",
          },
        },
        lastHeartbeatAt: {
          title: t("certd.client.lastHeartbeatAt"),
          search: {
            show: false,
          },
          type: "text",
          form: {
            show: false,
          },
          column: {
            width: 170,
            sorter: true,
            cellRender({ value }) {
              if (!value) {
                return "-";
              }
              return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
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
