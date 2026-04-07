import * as api from "./api";
import { useI18n } from "/src/locales";
import { Ref, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { Modal } from "ant-design-vue";
//@ts-ignore
import yaml from "js-yaml";
import { usePluginImport } from "./use-import";
import { usePluginConfig } from "./use-config";
import { useSettingStore } from "/src/store/settings/index";
import { usePluginStore } from "/@/store/plugin";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const router = useRouter();
  const { t } = useI18n();

  let lastType = "";
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    if (lastType && lastType != query?.query?.type) {
      query.page.offset = 0;
    }
    lastType = query?.query?.type;
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

  const selectedRowKeys: Ref<any[]> = ref([]);
  context.selectedRowKeys = selectedRowKeys;

  const { openImportDialog } = usePluginImport();
  const { openConfigDialog } = usePluginConfig();

  const settingStore = useSettingStore();
  const pluginStore = usePluginStore();
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
        },
      },
      table: {
        rowKey: "name",
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
              return row.type === "custom";
            }),
          },
          copy: {
            show: compute(({ row }) => {
              return row.type === "custom";
            }),
          },
          remove: {
            order: 999,
            show: compute(({ row }) => {
              return row.type === "custom";
            }),
          },
          export: {
            text: null,
            icon: "ion:cloud-download-outline",
            title: t("certd.export"),
            type: "link",
            show: compute(({ row }) => {
              return row.type === "custom";
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
                crudExpose,
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
          if (opts.res?.id) {
            router.push({
              name: "SysPluginEdit",
              query: {
                id: opts.res.id,
              },
            });
          }
        },
      },
      columns: {
        pluginType: {
          title: t("certd.pluginType"),
          type: "dict-select",
          search: {
            show: true,
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
            show: true,
          },
          form: {
            show: true,
            helper: t("certd.authorHelper"),
            rules: [
              { required: true },
              {
                type: "pattern",
                pattern: /^[a-zA-Z][a-zA-Z0-9]+$/,
                message: t("certd.authorRuleMsg"),
              },
            ],
          },
          column: {
            width: 200,
            show: false,
          },
        },
        title: {
          title: t("certd.titlea"),
          type: "text",
          form: {
            helper: t("certd.titleHelper"),
            rules: [{ required: true }],
          },
          column: {
            width: 300,
            cellRender({ row }) {
              if (row.type === "custom") {
                return <router-link to={`/sys/plugin/edit?id=${row.id}`}>{row.title}</router-link>;
              }
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
          },
          form: {
            value: "custom",
            component: {
              disabled: true,
            },
          },
          dict: dict({
            data: [
              { label: t("certd.builtIn"), value: "builtIn" },
              { label: t("certd.custom"), value: "custom" },
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
              name: "a-select",
              mode: "tags",
              open: false,
              allowClear: true,
            },
            helper: t("certd.pluginDependenciesHelper"),
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
            if (row.extra) {
              row.extra = yaml.load(row.extra);
            }
          },
          valueResolve({ row }) {
            if (row.extra) {
              row.extra = yaml.dump(row.extra);
            }
          },
        },
        disabled: {
          title: t("certd.enableDisable"),
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
                    onOk: async () => {
                      await api.SetDisabled({
                        id: row.id,
                        name: row.name,
                        type: row.type,
                        disabled: !value,
                      });
                      await crudExpose.doRefresh();
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
