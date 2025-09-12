import * as api from "./api";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes, useUi } from "@fast-crud/fast-crud";
import { statusUtil } from "/@/views/certd/pipeline/pipeline/utils/util.status";
import { Modal, notification } from "ant-design-vue";
import { useUserStore } from "/@/store/user";
import dayjs from "dayjs";
import { useSettingStore } from "/@/store/settings";
import { cloneDeep } from "lodash-es";
import { eachStages } from "./utils";
import { setRunnableIds, useCertPipelineCreator } from "/@/views/certd/pipeline/certd-form/use";
import { useCertUpload } from "/@/views/certd/pipeline/cert-upload/use";
import GroupSelector from "/@/views/certd/pipeline/group/group-selector.vue";
import { useCertViewer } from "/@/views/certd/pipeline/use";
import { useI18n } from "/src/locales";
import { GetDetail, GetObj } from "./api";

export default function ({ crudExpose, context: { groupDictRef, selectedRowKeys } }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const router = useRouter();
  const lastResRef = ref();

  const { t } = useI18n();

  const { openAddCertdPipelineDialog } = useCertPipelineCreator();
  const { openUploadCreateDialog } = useCertUpload();

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    const res = await api.UpdateObj(form);
    lastResRef.value = res;
    return res;
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
    if (form.content == null) {
      form.content = JSON.stringify({
        title: form.title,
      });
    } else {
      //复制的流水线
      delete form.status;
      delete form.lastHistoryTime;
      delete form.lastVars;
      delete form.createTime;
      delete form.id;
      let pipeline = JSON.parse(form.content);
      pipeline.title = form.title;
      pipeline = setRunnableIds(pipeline);
      form.content = JSON.stringify(pipeline);
    }

    const res = await api.AddObj(form);
    lastResRef.value = res;
    return res;
  };

  const { viewCert, downloadCert } = useCertViewer();
  const userStore = useUserStore();
  const settingStore = useSettingStore();

  function onDialogOpen(opt: any) {
    const searchForm = crudExpose.getSearchValidatedFormData();
    opt.initialForm = {
      ...opt.initialForm,
      groupId: searchForm.groupId,
    };
  }

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      settings: {
        plugins: {
          //行选择插件，内置插件
          rowSelection: {
            //是否启用本插件
            enabled: true,
            order: -2,
            //合并在用户配置crudOptions之前还是之后
            before: true,
            props: {
              multiple: true,
              crossPage: false,
              selectedRowKeys,
              onSelectedChanged(selected) {
                console.log("已选择变化：", selected);
              },
            },
          },
        },
      },
      actionbar: {
        buttons: {
          add: {
            order: 5,
            icon: "ion:ios-add-circle-outline",
            text: t("certd.customPipeline"),
          },
          addCertd: {
            order: 1,
            text: t("certd.createCertdPipeline"),
            type: "primary",
            icon: "ion:ios-add-circle-outline",
            click() {
              const searchForm = crudExpose.getSearchValidatedFormData();
              const defaultGroupId = searchForm.groupId;
              openAddCertdPipelineDialog({ defaultGroupId });
            },
          },
          uploadCert: {
            order: 2,
            text: t("certd.commercialCertHosting"),
            type: "primary",
            tooltip: {
              slots: {
                title() {
                  return (
                    <ul>
                      <li>{t("certd.tooltip.manualUploadOwnCert")}</li>
                      <li>{t("certd.tooltip.noAutoApplyCommercialCert")}</li>
                      <li>{t("certd.tooltip.manualUploadOnUpdate")}</li>
                    </ul>
                  );
                },
              },
            },
            icon: "ion:cloud-upload-outline",
            click() {
              const searchForm = crudExpose.getSearchValidatedFormData();
              openUploadCreateDialog({ defaultGroupId: searchForm.groupId });
            },
          },
        },
      },
      form: {
        afterSubmit({ form, res, mode }) {
          if (mode === "add") {
            router.push({ path: "/certd/pipeline/detail", query: { id: res.id, editMode: "true" } });
          }
        },
        wrapper: {
          onOpen: onDialogOpen,
        },
      },
      table: {
        scroll: { x: 1500 },
        remove: {
          confirmTitle: t("certd.table.confirmDeleteTitle"),
          confirmMessage: t("certd.table.confirmDeleteMessage"),
        },
      },
      tabs: {
        name: "groupId",
        show: true,
      },
      rowHandle: {
        width: 200,
        fixed: "right",
        dropdown: {
          show: true,
        },
        buttons: {
          play: {
            order: -999,
            title: t("certd.play.runPipeline"),
            tooltip: { title: t("certd.play.runPipeline") },
            type: "link",
            icon: "ant-design:play-circle-outlined",
            click({ row }) {
              Modal.confirm({
                title: t("certd.play.confirm"),
                content: t("certd.play.confirmTrigger"),
                async onOk() {
                  await api.Trigger(row.id);
                  notification.success({ message: t("certd.play.pipelineStarted") });
                },
              });
            },
          },
          view: {
            show: false,
            click({ row }) {
              router.push({ path: "/certd/pipeline/detail", query: { id: row.id, editMode: "false" } });
            },
          },
          copy: {
            click: async context => {
              settingStore.checkPlus();
              const { ui } = useUi();
              // @ts-ignore
              let row = context[ui.tableColumn.row];
              const info = await GetDetail(row.id);
              row = info.pipeline;
              row.content = JSON.parse(row.content);
              row.title = row.title + "_copy";
              await crudExpose.openCopy({
                row: row,
                index: context.index,
              });
            },
            class: "need-plus",
          },
          config: {
            order: 1,
            title: t("certd.actions.editPipeline"),
            type: "link",
            dropdown: true,
            icon: "ant-design:edit-outlined",
            click({ row }) {
              router.push({ path: "/certd/pipeline/detail", query: { id: row.id, editMode: "true" } });
            },
          },
          edit: {
            order: 2,
            title: t("certd.actions.editConfigGroup"),
            icon: "ant-design:setting-outlined",
            dropdown: true,
          },
          viewCert: {
            order: 3,
            title: t("certd.actions.viewCertificate"),
            tooltip: { title: t("certd.actions.viewCertificate") },
            type: "link",
            icon: "ph:certificate",
            async click({ row }) {
              await viewCert(row.id);
            },
          },
          download: {
            order: 4,
            type: "link",
            title: t("certd.actions.downloadCertificate"),
            tooltip: { title: t("certd.actions.downloadCertificate") },
            icon: "ant-design:download-outlined",
            async click({ row }) {
              await downloadCert(row.id);
            },
          },
          remove: {
            order: 5,
            dropdown: true,
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
          },
          column: {
            width: 100,
          },
          form: {
            show: false,
          },
        },
        userId: {
          title: t("certd.fields.userId"),
          type: "number",
          search: {
            show: computed(() => {
              return userStore.isAdmin && settingStore.sysPublic.managerOtherUserPipeline;
            }),
          },
          form: {
            show: false,
          },
          column: {
            show: computed(() => {
              return userStore.isAdmin && settingStore.sysPublic.managerOtherUserPipeline;
            }),
            width: 100,
          },
        },
        title: {
          title: t("certd.fields.pipelineName"),
          type: "link",
          search: {
            show: true,
            title: t("certd.fields.keyword"),
            component: {
              name: "a-input",
            },
          },
          form: {
            rules: [{ required: true, message: t("certd.fields.required") }],
          },
          column: {
            width: 350,
            ellipsis: true,
            sorter: true,
            showTitle: true,
            cellRender: ({ row, value }) => {
              return <router-link to={{ path: "/certd/pipeline/detail", query: { id: row.id, editMode: false } }}>{value}</router-link>;
            },
          },
        },
        content: {
          title: t("certd.fields.pipelineContent"),
          form: { show: false },
          column: {
            show: false,
          },
          valueBuilder({ row }) {
            if (row.content) {
              row.content = JSON.parse(row.content);
              const pipeline = row.content;
              let stepCount = 0;
              eachStages(pipeline.stages, (item, runnableType) => {
                if (runnableType === "step") {
                  stepCount++;
                }
              });
              row._stepCount = stepCount;
              if (pipeline.triggers) {
                row._triggerCount = pipeline.triggers?.length > 0 ? pipeline.triggers.length : "-";
              }
            }
          },
          valueResolve({ row }) {
            if (row.content) {
              row.content = JSON.stringify(row.content);
            }
          },
        },
        triggerCount: {
          title: t("certd.fields.scheduledTaskCount"),
          type: "number",
          column: {
            align: "center",
            width: 100,
          },
          form: {
            show: false,
          },
        },
        stepCount: {
          title: t("certd.fields.deployTaskCount"),
          type: "number",
          form: { show: false },
          column: {
            align: "center",
            width: 100,
          },
        },
        lastVars: {
          title: t("certd.fields.remainingValidity"),
          type: "number",
          form: {
            show: false,
          },
          column: {
            cellRender({ row }) {
              const {
                certEffectiveTime: effectiveTime,
                certExpiresTime: expiresTime,
              } = row?.lastVars || {};
              if (!expiresTime) {
                return "-";
              }
              // 申请时间 ps:此处为证书在certd创建的时间而非实际证书申请时间
              const applyDate = dayjs(effectiveTime ?? Date.now()).format("YYYY-MM-DD");
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
            width: 150,
          },
        },
        "lastVars.certEffectiveTime": {
          title: t("certd.fields.effectiveTime"),
          search: {
            show: false,
          },
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            sorter: false,
            show: false,
            width: 150,
            align: "center",
          },
        },
        "lastVars.certExpiresTime": {
          title: t("certd.fields.expiryTime"),
          search: {
            show: false,
          },
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            sorter: false,
            width: 150,
            align: "center",
          },
        },
        status: {
          title: t("certd.fields.status"),
          type: "dict-select",
          search: {
            show: true,
          },
          dict: dict({
            data: statusUtil.getOptions(),
          }),
          form: {
            show: false,
          },
          column: {
            sorter: true,
            width: 120,
            align: "center",
          },
        },
        lastHistoryTime: {
          title: t("certd.fields.lastRun"),
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            sorter: true,
            width: 150,
            align: "center",
          },
        },
        disabled: {
          title: t("certd.fields.enabled"),
          type: "dict-switch",
          dict: dict({
            data: [
              { value: false, label: t("certd.fields.enabledLabel") },
              { value: true, label: t("certd.fields.disabledLabel") },
            ],
          }),
          form: {
            value: false,
            show: false,
          },
          column: {
            sorter: true,
            width: 80,
            align: "center",
            component: {
              name: "fs-dict-switch",
              vModel: "checked",
            },
            async valueChange({ row, key, value }) {
              return await api.UpdateObj({
                id: row.id,
                disabled: row[key],
              });
            },
          },
        },
        groupId: {
          title: t("certd.fields.group"),
          type: "dict-select",
          search: {
            show: true,
          },
          dict: groupDictRef,
          form: {
            component: {
              name: GroupSelector,
              vModel: "modelValue",
            },
          },
          column: {
            width: 130,
            align: "center",
            component: {
              color: "auto",
            },
            sorter: true,
          },
        },
        type: {
          title: t("certd.fields.type"),
          type: "dict-select",
          search: {
            show: true,
          },
          dict: dict({
            data: [
              { value: "cert", label: t("certd.types.certApply") },
              { value: "cert_upload", label: t("certd.types.certUpload") },
              { value: "custom", label: t("certd.types.custom") },
              { value: "template", label: "模版" },
            ],
          }),
          form: {
            show: false,
            value: "custom",
          },
          column: {
            sorter: true,
            width: 90,
            align: "center",
            show: true,
            component: {
              color: "auto",
            },
          },
        },
        order: {
          title: t("certd.fields.order"),
          type: "number",
          column: {
            sorter: true,
            align: "center",
            width: 80,
          },
          form: {
            value: 0,
          },
        },
        keepHistoryCount: {
          title: t("certd.fields.keepHistoryCount"),
          type: "number",
          form: {
            value: 20,
            helper: t("certd.fields.keepHistoryHelper"),
          },
          column: {
            width: 130,
            show: false,
            sorter: true,
          },
        },
        createTime: {
          title: t("certd.fields.createTime"),
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            sorter: true,
            width: 155,
            align: "center",
          },
        },
        updateTime: {
          title: t("certd.fields.updateTime"),
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            width: 125,
            show: false,
            sorter: true,
          },
        },
      },
    },
  };
}
