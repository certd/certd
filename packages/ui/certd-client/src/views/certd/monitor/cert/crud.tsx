// @ts-ignore
import { useI18n } from "/src/locales";
//
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, useFormWrapper, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { certInfoApi } from "./api";
import dayjs from "dayjs";
import { useRouter } from "vue-router";
import { useModal } from "/@/use/use-modal";
import { notification } from "ant-design-vue";
import CertView from "/@/views/certd/pipeline/cert-view.vue";
import { useCertUpload } from "/@/views/certd/pipeline/cert-upload/use";

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
  const { openCrudFormDialog } = useFormWrapper();
  const router = useRouter();

  const model = useModal();
  const viewCert = async (row: any) => {
    const cert = await api.GetCert(row.id);
    if (!cert) {
      notification.error({ message: t("certd.certificateNotGenerated") });
      return;
    }

    model.success({
      title: t("certd.modal.viewCertificateTitle"),
      maskClosable: true,
      okText: t("certd.modal.close"),
      width: 800,
      content: () => {
        return <CertView cert={cert}></CertView>;
      },
    });
  };

  const { openUploadCreateDialog, openUpdateCertDialog } = useCertUpload();
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
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
            text: t("certd.uploadCustomCert"),
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
        width: 100,
        fixed: "right",
        buttons: {
          view: { show: false },
          viewCert: {
            order: 3,
            title: t("certd.viewCert.title"),
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
          download: {
            order: 9,
            title: t("certd.download.title"),
            type: "link",
            icon: "ant-design:download-outlined",
            async click({ row }) {
              if (!row.certFile) {
                notification.error({ message: t("certd.certificateNotGenerated") });
                return;
              }
              window.open("/api/monitor/cert/download?id=" + row.id);
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
          title: t("certd.sourcee"),
          search: {
            show: true,
          },
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.sourcePipeline"), value: "pipeline" },
              { label: t("certd.sourceManualUpload"), value: "upload" },
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
        domains: {
          title: t("certd.domains"),
          search: {
            show: true,
          },
          type: "text",
          form: {
            rules: [{ required: true, message: t("certd.enterDomain") }],
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
          title: t("certd.domainCount"),
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
          title: t("certd.validDays"),
          search: {
            show: false,
          },
          type: "date",
          form: {
            show: false,
          },
          column: {
            sorter: true,
            conditionalRender: false,
            cellRender({ row }) {
              const {
                applyTime,
                effectiveTime,
                expiresTime,
              } = row || {};
              if (!expiresTime) {
                return "-";
              }
              // 申请时间 ps:此处为证书在certd创建的时间而非实际证书申请时间
              const applyDate = dayjs(effectiveTime ?? applyTime ?? Date.now()).format("YYYY-MM-DD");
              // 失效时间
              const expireDate = dayjs(expiresTime).format("YYYY-MM-DD");
              // 有效天数 ps:此处证书最小设置为90d
              const effectiveDays = Math.max(90, dayjs(expiresTime).diff(applyDate, "day"));
              // 距离失效时间剩余天数
              const leftDays = dayjs(expiresTime).diff(dayjs(), "day");
              const color = leftDays < 20 ? "red" : "#389e0d";
              const percent = (leftDays / effectiveDays) * 100;
              const textColor = leftDays < 20 ? "red" : leftDays > 60 ? "#389e0d" : "";
              const format = () => {
                return <span style={{ color: textColor }}>{`${leftDays}${t("certd.days")}`}</span>;
              };
              // console.log('cellRender', 'effectiveDays', effectiveDays, 'expiresTime', expiresTime, 'applyTime', applyTime, 'percent', percent, row)
              return <a-progress title={expireDate + t("certd.expires")} percent={percent} strokeColor={color} format={format} />;
            },
          },
        },
        effectiveTime: {
          title: t("certd.effectiveTime"),
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
          title: t("certd.expireTime"),
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
          title: t("certd.certIssuer"),
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
          title: t("certd.applyTime"),
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
          title: t("certd.relatedPipeline"),
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
                  router.push({ path: "/certd/pipeline/detail", query: { id: row.pipelineId, editMode: "false" } });
                },
              },
            },
          },
        },
      },
    },
  };
}
