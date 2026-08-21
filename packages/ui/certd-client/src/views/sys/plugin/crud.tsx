import * as api from "./api";
import { useI18n } from "/src/locales";
import { Ref, ref, computed } from "vue";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { Modal, notification } from "ant-design-vue";
//@ts-ignore
import yaml from "js-yaml";
import { usePluginImport } from "./use-import";
import KvInput from "/@/components/plugins/common/kv-input.vue";
import DependPluginsInput from "./components/depend-plugins-input.vue";
import { usePluginConfig } from "./use-config";
import { useSettingStore } from "/src/store/settings/index";
import { usePluginStore } from "/@/store/plugin";
import PluginAuthorField from "./components/plugin-author-field.vue";
import { usePluginAiDev } from "./use-ai-dev";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();

  let lastType = "";
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    if (lastType && lastType != query?.query?.type) {
      query.page.offset = 0;
    }
    lastType = query?.query?.type;
    const queryData = query.query || {};
    const sortBy = queryData.sortBy;
    delete queryData.sortBy;
    if (sortBy === "score" || sortBy === "downloadCount") {
      query.sort = {
        prop: sortBy,
        asc: false,
      };
    } else {
      delete query.sort;
    }
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    const res = await api.UpdateObj(form);
    return res;
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
    const res = await api.AddObj(form);
    return res;
  };

  // const infoRequest = async ({ row }: AddReq) => {
  //   return await api.GetObj(row.id);
  // };

  const selectedRowKeys: Ref<any[]> = ref([]);
  context.selectedRowKeys = selectedRowKeys;

  const { openImportDialog } = usePluginImport();
  const { openConfigDialog } = usePluginConfig();
  const { openAiDevDialog } = usePluginAiDev();

  const settingStore = useSettingStore();
  const pluginStore = usePluginStore();
  const syncLoading = ref(false);
  const lastSyncTime = ref(0);
  const autoSyncInterval = 30 * 24 * 60 * 60 * 1000;
  const syncButtonTitle = computed(() => {
    if (!lastSyncTime.value) {
      return t("certd.onlinePluginNotSynced");
    }
    return t("certd.onlinePluginLastSyncTime", {
      time: formatSyncTime(lastSyncTime.value),
    });
  });

  function formatSyncTime(time: number) {
    return new Date(time).toLocaleString();
  }

  function needAutoSync(time: number) {
    if (!time) {
      return true;
    }
    return Date.now() - time > autoSyncInterval;
  }

  function canEditStorePlugin(row: any) {
    if (row.type !== "store") {
      return false;
    }
    const bindUserId = Number(settingStore.installInfo?.bindUserId || 0);
    const developerId = Number(row.developerId || 0);
    return !developerId || (!!bindUserId && developerId === bindUserId);
  }

  async function syncOnlinePlugins(options?: { showSuccess?: boolean }) {
    if (syncLoading.value) {
      return;
    }
    syncLoading.value = true;
    try {
      await api.OnlinePluginSync();
      const setting = await api.OnlinePluginSetting();
      lastSyncTime.value = setting.lastSyncTime || Date.now();
      await pluginStore.reload();
      crudExpose.doRefresh();
      if (options?.showSuccess !== false) {
        notification.success({ message: t("certd.onlinePluginSyncSuccess") });
      }
    } finally {
      syncLoading.value = false;
    }
  }

  async function loadOnlinePluginSetting() {
    const setting = await api.OnlinePluginSetting();
    lastSyncTime.value = setting.lastSyncTime || 0;
    if (needAutoSync(lastSyncTime.value)) {
      await syncOnlinePlugins({ showSuccess: false });
    }
  }

  loadOnlinePluginSetting().catch(e => {
    console.warn("load online plugin setting failed", e);
  });
  return {
    crudOptions: {
      settings: {
        plugins: {
          rowSelection: {
            enabled: true,
            order: -2,
            before: true,
            props: {
              multiple: true,
              crossPage: true,
              selectedRowKeys,
            },
          },
        },
      },
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
        // infoRequest,
      },
      actionbar: {
        buttons: {
          add: {
            show: true,
            icon: "ion:ios-add-circle-outline",
            text: t("certd.customPlugin"),
          },
          import: {
            show: true,
            icon: "ion:cloud-upload-outline",
            text: t("certd.import"),
            type: "primary",
            async click() {
              await openImportDialog({ crudExpose });
            },
          },
          aiDev: {
            show: true,
            icon: "ion:sparkles-outline",
            text: "AI 开发插件",
            type: "primary",
            async click() {
              await openAiDevDialog();
            },
          },
          syncOnline: {
            show: true,
            icon: "ion:sync-outline",
            type: "primary",
            text: t("certd.onlinePluginSync"),
            tooltip: { title: syncButtonTitle },
            loading: syncLoading,
            async click() {
              await syncOnlinePlugins();
            },
          },
          clearRuntimeDeps: {
            show: true,
            icon: "ion:trash-outline",
            text: t("certd.clearRuntimeDeps"),
            tooltip: { title: t("certd.clearRuntimeDepsTooltip") },
            type: "primary",
            danger: true,
            async click() {
              Modal.confirm({
                title: t("certd.confirm"),
                content: t("certd.clearRuntimeDepsConfirm"),
                async onOk() {
                  await api.ClearRuntimeDeps();
                  notification.success({ message: t("certd.clearRuntimeDepsSuccess") });
                },
              });
            },
          },
        },
      },
      table: {
        show: false,
        rowKey: "fullName",
        remove: {
          afterRemove: async context => {
            await pluginStore.reload();
          },
          confirmMessage: "确定要删除吗？如果该插件已被使用，删除可能会导致流水线执行失败！",
        },
      },
      rowHandle: {
        show: true,
        minWidth: 200,
        fixed: "right",
        buttons: {
          edit: {
            show: compute(({ row }) => {
              return canEditStorePlugin(row);
            }),
          },
          copy: {
            show: compute(({ row }) => {
              return canEditStorePlugin(row);
            }),
            async click({ row }) {
              const copyRow = { ...row };
              delete copyRow.fullName;
              delete copyRow.id;
              crudExpose.openCopy({
                row: copyRow,
              });
            },
          },
          remove: {
            order: 999,
            //@ts-ignore
            show: compute(({ row }) => {
              return row.type === "custom" || row.type === "store";
            }),
          },
          export: {
            text: null,
            icon: "ion:cloud-download-outline",
            title: t("certd.export"),
            type: "link",
            //@ts-ignore
            show: compute(({ row }) => {
              return canEditStorePlugin(row);
            }),
            async click({ row }) {
              const content = await api.ExportPlugin(row.id);
              if (content) {
                const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${row.name}.yaml`;
                link.click();
                URL.revokeObjectURL(url);
              }
            },
          },
          config: {
            show: computed(() => {
              return settingStore.isComm;
            }),
            text: null,
            icon: "ion:settings-outline",
            title: t("certd.config"),
            type: "link",
            async click({ row }) {
              await openConfigDialog({
                row,
                onSuccess: async () => {
                  crudExpose.doRefresh();
                },
              });
            },
          },
        },
      },
      tabs: {
        name: "type",
        show: true,
        defaultOption: {
          show: false,
        },
      },
      form: {
        onSuccess(opts: any) {
          crudExpose.doRefresh();
        },
      },
      columns: {
        pluginType: {
          title: t("certd.pluginType"),
          type: "dict-select",
          search: {
            show: true,
            component: {
              disabled: false,
            },
            col: {
              span: 3,
            },
          },
          form: {
            order: 0,
            rules: [{ required: true }],
            component: {
              disabled: true,
            },
          },
          addForm: {
            component: {
              disabled: false,
            },
          },
          dict: dict({
            data: [
              { label: t("certd.auth"), value: "access" },
              { label: t("certd.dns"), value: "dnsProvider" },
              { label: t("certd.deployPlugin"), value: "deploy" },
              { label: "通知", value: "notification" },
              { label: "Addon", value: "addon" },
            ],
          }),
          column: {
            width: 100,
            align: "center",
            component: {
              color: "auto",
            },
          },
        },
        icon: {
          title: t("certd.icon"),
          type: "icon",
          form: {
            rules: [{ required: true }],
          },
          column: {
            width: 70,
            align: "center",
            component: {
              name: "fs-icon",
              vModel: "icon",
              style: {
                fontSize: "22px",
              },
            },
          },
        },
        name: {
          title: t("certd.pluginName"),
          type: "text",
          search: {
            show: true,
            col: {
              span: 3,
            },
          },
          form: {
            show: true,
            helper: t("certd.pluginNameHelper"),
            rules: [
              { required: true },
              {
                type: "pattern",
                pattern: /^[a-zA-Z][a-zA-Z0-9]+$/,
                message: t("certd.pluginNameRuleMsg"),
              },
            ],
          },
          column: {
            width: 250,
            cellRender({ row }) {
              if (row.author) {
                return <fs-copyable model-value={`${row.author}/${row.name}`} />;
              } else {
                return <fs-copyable model-value={row.name} />;
              }
            },
          },
        },
        author: {
          title: t("certd.author"),
          type: "text",
          search: {
            component: {
              name: "a-input",
              vModel: "value",
            },
            show: true,
            col: {
              span: 2,
            },
          },
          form: {
            show: true,
            component: {
              name: PluginAuthorField,
              vModel: "modelValue",
            },
            rules: [{ required: true, message: "请先注册并选择插件作者" }],
          },
          column: {
            width: 200,
            show: false,
          },
        },
        onlyMine: {
          title: "只看我的",
          type: "dict-switch",
          search: {
            show: true,
            col: {
              span: 2,
            },
          },
          form: {
            show: false,
          },
          column: {
            show: false,
          },
          dict: dict({
            data: [
              { label: "否", value: false },
              { label: "是", value: true },
            ],
          }),
        },
        sortBy: {
          title: "排序",
          type: "dict-select",
          search: {
            show: true,
            col: {
              span: 3,
            },
          },
          form: {
            show: false,
          },
          column: {
            show: false,
          },
          dict: dict({
            data: [
              { label: "默认排序", value: "" },
              { label: "评分最高", value: "score" },
              { label: "下载最多", value: "downloadCount" },
            ],
          }),
        },
        title: {
          title: t("certd.titlea"),
          type: "text",
          search: {
            show: false,
            col: {
              span: 3,
            },
          },
          form: {
            helper: t("certd.titleHelper"),
            rules: [{ required: true }],
          },
          column: {
            width: 300,
            cellRender({ row }) {
              return <div>{row.title}</div>;
            },
          },
        },
        desc: {
          title: t("certd.description"),
          type: "textarea",
          helper: t("certd.descriptionHelper"),
          column: {
            width: 300,
            show: false,
          },
        },
        type: {
          title: t("certd.sourcee"),
          type: "dict-select",
          search: {
            show: true,
            col: {
              span: 3,
            },
            component: {
              disabled: false,
            },
          },
          form: {
            value: "store",
            component: {
              disabled: true,
            },
          },
          dict: dict({
            data: [
              { label: t("certd.builtIn"), value: "builtIn" },
              { label: t("certd.store"), value: "store" },
            ],
          }),
          column: {
            width: 70,
            align: "center",
            component: {
              color: "auto",
            },
          },
        },
        vip: {
          title: "会员要求",
          type: "dict-select",
          dict: dict({
            data: [
              { label: "免费", value: "free" },
              { label: "专业版", value: "plus" },
            ],
          }),
          form: {
            value: "free",
          },
          column: {
            show: false,
          },
        },
        version: {
          title: t("certd.version"),
          type: "text",
          column: {
            width: 100,
            align: "center",
          },
        },
        "extra.dependPlugins": {
          title: t("certd.pluginDependencies"),
          type: "text",
          form: {
            component: {
              name: DependPluginsInput,
              vModel: "modelValue",
            },
            helper: t("certd.pluginDependenciesHelper"),
          },
          column: {
            show: false,
          },
        },
        "extra.dependPackages": {
          title: t("certd.thirdPartyDependencies"),
          type: "text",
          form: {
            component: {
              name: KvInput,
              vModel: "modelValue",
            },
            helper: t("certd.thirdPartyDependenciesHelper"),
          },
          column: {
            show: false,
          },
        },
        "extra.showRunStrategy": {
          title: t("certd.editableRunStrategy"),
          type: "dict-switch",
          dict: dict({
            data: [
              { value: true, label: t("certd.editable") },
              { value: false, label: t("certd.notEditable") },
            ],
          }),
          form: {
            value: false,
            rules: [{ required: true }],
          },
          column: {
            width: 100,
            align: "left",
            show: false,
          },
        },
        "extra.default.strategy.runStrategy": {
          title: t("certd.runStrategy"),
          type: "dict-select",
          dict: dict({
            data: [
              { value: 0, label: t("certd.normalRun") },
              { value: 1, label: t("certd.skipOnSuccess") },
            ],
          }),
          form: {
            value: 1,
            rules: [{ required: true }],
            helper: t("certd.defaultRunStrategyHelper"),
            show: compute(({ form }) => {
              return form.extra.showRunStrategy;
            }),
          },
          column: {
            width: 100,
            align: "left",
            component: {
              color: "auto",
            },
            show: false,
          },
          valueBuilder({ row }) {
            if (typeof row.extra === "string") {
              row.extra = yaml.load(row.extra);
            }
          },
          valueResolve({ row }) {
            if (row.extra && typeof row.extra === "object") {
              row.extra = yaml.dump(row.extra);
            }
          },
        },
        disabled: {
          title: t("certd.clickToToggle"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.enabled"), value: false, color: "success" },
              { label: t("certd.disabled"), value: true, color: "error" },
            ],
          }),
          form: {
            title: t("certd.enableDisable"),
            value: false,
          },
          column: {
            width: 120,
            align: "center",
            component: {
              title: t("certd.clickToToggle"),
              on: {
                async click({ value, row }) {
                  Modal.confirm({
                    title: t("certd.confirm"),
                    content: `${t("certd.confirmToggle")} ${!value ? t("certd.disable") : t("certd.enable")}?`,
                    maskClosable: true,
                    onOk: async () => {
                      await api.SetDisabled({
                        id: row.id,
                        name: row.name,
                        type: row.type,
                        disabled: !value,
                      });
                      crudExpose.doRefresh();
                    },
                  });
                },
              },
            },
          },
        },
        group: {
          title: t("certd.pluginGroup"),
          type: "dict-select",
          search: {
            show: true,
            col: {
              span: 3,
            },
          },
          dict: dict({
            url: "/pi/plugin/groupsList",
            label: "title",
            value: "key",
          }),
          form: {
            rules: [{ required: true }],
            show: compute(({ form }) => {
              return form.pluginType === "deploy";
            }),
          },
          column: {
            width: 100,
            align: "left",
            component: {
              color: "auto",
            },
          },
        },
        createTime: {
          title: t("certd.createTime"),
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            sorter: true,
            width: 160,
            align: "center",
          },
        },
        updateTime: {
          title: t("certd.updateTime"),
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            show: true,
          },
        },
      },
    },
  };
}
