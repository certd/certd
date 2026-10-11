// @ts-ignore
import { useI18n } from "/src/locales";
//
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, useFormWrapper, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { certInfoApi } from "./api";
import dayjs from "dayjs";
import { useRoute, useRouter } from "vue-router";
import { useModal } from "/@/use/use-modal";
import { Modal, notification } from "ant-design-vue";
import CertView from "/@/views/certd/pipeline/cert-view.vue";
import { useCertUpload } from "/@/views/certd/pipeline/cert-upload/use";
import { useSettingStore } from "/@/store/settings";
import { useProjectStore } from "/@/store/project";
import { useDicts } from "../../dicts";
import { useUserStore } from "/@/store/user";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const api = certInfoApi;
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
  const router = useRouter();
  const { myProjectDict } = useDicts();
  const settingStore = useSettingStore();
  const projectStore = useProjectStore();
  const userStore = useUserStore();
  const model = useModal();
  const viewCert = async (row: any) => {
    const cert = await api.GetCert(row.id);
    if (!cert) {
      notification.error({ message: t("certd.monitor.certificateNotGenerated") });
      return;
    }

    model.success({
      title: t("certd.monitor.modal.viewCertificateTitle"),
      maskClosable: true,
      okText: t("certd.monitor.modal.close"),
      width: 800,
      content: () => {
        return <CertView cert={cert}></CertView>;
      },
    });
  };

  const { openUploadCreateDialog } = useCertUpload();

  const DEFAULT_WILL_EXPIRE_DAYS = settingStore.sysPublic.defaultWillExpireDays || settingStore.sysPublic.defaultCertRenewDays || 15;
  const route = useRoute();
  const expireStatus = route?.query?.expireStatus as string;
  const searchInitForm = {
    expiresLeft: expireStatus,
    ...projectStore.getSearchForm(),
  };
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      search: {
        initialForm: searchInitForm,
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
            text: t("certd.monitor.uploadCustomCert"),
            type: "primary",
            show: false,
            async click() {
              await openUploadCreateDialog({});
            },
          },
        },
      },
      tabs: {
        name: "fromType",
        show: true,
      },
      rowHandle: {
        width: 160,
        fixed: "right",
        buttons: {
          view: { show: false },
          viewCert: {
            order: 3,
            title: t("certd.monitor.viewCert.title"),
            type: "link",
            icon: "ph:certificate",
            async click({ row }) {
              await viewCert(row);
            },
          },
          copy: { show: false },
          edit: { show: false },
          remove: {
            order: 10,
            show: false,
          },
          revoke: {
            order: 8,
            title: t("certd.monitor.revoke.title"),
            type: "link",
            icon: "ant-design:stop-outlined",
            // 只有未激活状态的证书才允许执行吊销
            show: ({ row }) => {
              return (row.status || "active") === "inactive";
            },
            async click({ row }) {
              Modal.confirm({
                title: t("certd.monitor.revoke.confirmTitle"),
                content: t("certd.monitor.revoke.confirmContent"),
                okText: t("certd.monitor.revoke.confirmOk"),
                cancelText: t("certd.common.cancel"),
                onOk: async () => {
                  await api.Revoke(row.id);
                  notification.success({ message: t("certd.monitor.revoke.success") });
                  await crudExpose.doRefresh();
                },
              });
            },
          },
          download: {
            order: 9,
            title: t("certd.monitor.download.title"),
            type: "link",
            icon: "ant-design:download-outlined",
            async click({ row }) {
              let url = "/api/monitor/cert/download?id=" + row.id;
              if (projectStore.isEnterprise) {
                url += `&projectId=${projectStore.currentProject?.id}`;
              }
              url += `&token=${userStore.getToken}`;
              window.open(url);
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
        fromType: {
          title: t("certd.common.sourcee"),
          search: {
            show: true,
          },
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.monitor.sourcePipeline"), value: "pipeline" },
              { label: t("certd.monitor.sourceManualUpload"), value: "upload" },
            ],
          }),
          form: {
            show: false,
          },
          column: {
            width: 100,
            sorter: true,
            component: {
              color: "auto",
            },
            conditionalRender: false,
          },
          valueBuilder({ value, row, key }) {
            if (!value) {
              row[key] = "pipeline";
            }
          },
        },
        status: {
          title: t("certd.common.status"),
          search: {
            show: true,
          },
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.monitor.revoke.statusActive"), value: "active", color: "green" },
              { label: t("certd.monitor.revoke.statusInactive"), value: "inactive", color: "orange" },
              { label: t("certd.monitor.revoke.statusRevoked"), value: "revoked", color: "red" },
            ],
          }),
          form: {
            show: false,
          },
          column: {
            width: 120,
            sorter: true,
            component: {
              color: "auto",
            },
            conditionalRender: false,
          },
          valueBuilder({ value, row, key }) {
            if (!value) {
              row[key] = "active";
            }
          },
        },
        domains: {
          title: t("certd.monitor.domains"),
          search: {
            show: true,
          },
          type: "text",
          form: {
            rules: [{ required: true, message: t("certd.monitor.enterDomain") }],
          },
          column: {
            width: 450,
            sorter: true,
            component: {
              name: "fs-values-format",
              color: "auto",
            },
          },
        },
        domainCount: {
          title: t("certd.common.domainCount"),
          type: "number",
          form: {
            show: false,
          },
          column: {
            width: 120,
            sorter: true,
            show: false,
          },
        },
        expiresLeft: {
          title: t("certd.monitor.validDays"),
          search: {
            show: true,
            component: {
              name: "fs-dict-select",
              dict: dict({
                data: [
                  { label: t("monitor.cert.expired"), value: "expired" },
                  { label: t("monitor.cert.expiring"), value: "expiring" },
                  { label: t("monitor.cert.noExpired"), value: "noExpired" },
                ],
              }),
            },
          },
          type: "date",
          form: {
            show: false,
          },
          column: {
            sorter: false,
            conditionalRender: false,
            cellRender({ row }) {
              const { applyTime, effectiveTime, expiresTime } = row || {};
              if (!expiresTime) {
                return "-";
              }

              // 申请时间 ps:此处为证书在certd创建的时间而非实际证书申请时间
              const applyDate = dayjs(effectiveTime ?? applyTime ?? Date.now()).format("YYYY-MM-DD");
              // 失效时间
              const expireDate = dayjs(expiresTime).format("YYYY-MM-DD");
              // 有效天数 ps:此处证书最小设置为90d
              let effectiveDays = Math.max(90, dayjs(expiresTime).diff(applyDate, "day"));

              const fixedCertExpireDays = settingStore.getSysPublic?.fixedCertExpireDays;
              if (fixedCertExpireDays && fixedCertExpireDays > 0) {
                effectiveDays = fixedCertExpireDays;
              }

              // 距离失效时间剩余天数
              const leftDays = dayjs(expiresTime).diff(dayjs(), "day");
              const color = leftDays < DEFAULT_WILL_EXPIRE_DAYS ? "red" : "#389e0d";
              const percent = (leftDays / effectiveDays) * 100;
              const textColor = leftDays < DEFAULT_WILL_EXPIRE_DAYS ? "red" : leftDays > 60 ? "#389e0d" : "";
              const format = () => {
                return <span style={{ color: textColor }}>{`${leftDays}${t("certd.common.days")}`}</span>;
              };
              // console.log('cellRender', 'effectiveDays', effectiveDays, 'expiresTime', expiresTime, 'applyTime', applyTime, 'percent', percent, row)
              return <a-progress title={expireDate + t("certd.common.expires")} percent={percent} strokeColor={color} format={format} />;
            },
          },
        },
        effectiveTime: {
          title: t("certd.monitor.effectiveTime"),
          search: {
            show: false,
          },
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            sorter: true,
            show: false,
          },
        },
        expiresTime: {
          title: t("certd.monitor.expireTime"),
          search: {
            show: false,
          },
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            sorter: true,
          },
        },
        certProvider: {
          title: t("certd.monitor.certIssuer"),
          search: {
            show: false,
          },
          type: "text",
          form: {
            show: false,
          },
          column: {
            width: 200,
          },
        },
        applyTime: {
          title: t("certd.monitor.applyTime"),
          search: {
            show: false,
          },
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            sorter: true,
          },
        },
        "pipeline.title": {
          title: t("certd.monitor.relatedPipeline"),
          search: { show: false },
          type: "link",
          form: {
            show: false,
          },
          column: {
            width: 350,
            sorter: true,
            component: {
              on: {
                onClick({ row }) {
                  router.push({ path: "/cert/pipeline/detail", query: { id: row.pipelineId, editMode: "false" } });
                },
              },
            },
          },
        },
        projectId: {
          title: t("certd.common.fields.projectName"),
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
