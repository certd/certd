import { ColumnCompositionProps, compute, dict } from "@fast-crud/fast-crud";
import { computed, provide, ref, toRef } from "vue";
import { useReference } from "/@/use/use-refrence";
import { forEach, get, merge, set } from "lodash-es";
import { Modal } from "ant-design-vue";
import { mitter } from "/@/utils/util.mitt";
import { useI18n } from "/src/locales";
import { useProjectStore } from "/@/store/project";
import { projectDict } from "../dicts";

export function notificationProvide(api: any) {
  provide("notificationApi", api);
  provide("get:plugin:type", () => {
    return "notification";
  });
}

export function getCommonColumnDefine(crudExpose: any, typeRef: any, api: any) {
  const { t } = useI18n();

  const notificationTypeDictRef = dict({
    url: "/pi/notification/getTypeDict",
  });
  const defaultPluginConfig = {
    component: {
      name: "a-input",
      vModel: "value",
    },
  };

  const projectStore = useProjectStore();

  provide("getCurrentPluginDefine", () => {
    return currentDefine;
  });

  function buildDefineFields(define: any, form: any, mode: string) {
    const formWrapperRef = crudExpose.getFormWrapperRef();
    const columnsRef = toRef(formWrapperRef.formOptions, "columns");

    for (const key in columnsRef.value) {
      if (key.indexOf(".") >= 0) {
        delete columnsRef.value[key];
      }
    }
    console.log('crudBinding.value[mode + "Form"].columns', columnsRef.value);
    forEach(define.input, (value: any, mapKey: any) => {
      const key = "body." + mapKey;
      const field = {
        ...value,
        key,
      };
      const column = merge({ title: key }, defaultPluginConfig, field);
      //eval
      useReference(column);

      if (column.required) {
        if (!column.rules) {
          column.rules = [];
        }
        column.rules.push({ required: true, message: t("certd.requiredField") });
      }

      //设置默认值
      if (column.value != null && get(form, key) == null) {
        set(form, key, column.value);
      }
      //字段配置赋值
      columnsRef.value[key] = column;
      console.log("form", columnsRef.value, form);
    });
  }

  const currentDefine = ref();

  return {
    id: {
      title: "ID",
      key: "id",
      type: "number",
      column: {
        width: 100,
        order: -999,
      },
      form: {
        show: false,
      },
    },
    type: {
      title: t("certd.notificationType"),
      type: "dict-select",
      dict: notificationTypeDictRef,
      search: {
        show: false,
      },
      column: {
        width: 200,
        component: {
          color: "auto",
        },
      },
      editForm: {
        component: {
          disabled: false,
        },
      },
      form: {
        order: -3,
        component: {
          disabled: false,
          showSearch: true,
          filterOption: (input: string, option: any) => {
            input = input?.toLowerCase();
            return option.value.toLowerCase().indexOf(input) >= 0 || option.label.toLowerCase().indexOf(input) >= 0;
          },
          renderLabel(item: any) {
            return (
              <span class={"flex-o flex-between"}>
                {item.label}
                {item.needPlus && <fs-icon icon={"mingcute:vip-1-line"} className={"color-plus"}></fs-icon>}
              </span>
            );
          },
        },
        rules: [{ required: true, message: t("certd.selectNotificationType") }],
        valueChange: {
          immediate: true,
          async handle({ value, mode, form, immediate }) {
            if (value == null) {
              return;
            }
            const lastTitle = currentDefine.value?.title;
            const define = await api.GetProviderDefine(value);
            currentDefine.value = define;
            console.log("define", define);

            if (!immediate) {
              form.body = {};
              if (define.needPlus) {
                mitter.emit("openVipModal");
              }
            }

            if (!form.name || form.name === lastTitle) {
              form.name = define.title;
            }
            buildDefineFields(define, form, mode);
          },
        },
        helper: computed(() => {
          const define = currentDefine.value;
          if (define == null) {
            return "";
          }
          return define.desc;
        }),
      },
    } as ColumnCompositionProps,
    name: {
      title: t("certd.notificationName"),
      search: {
        show: true,
      },
      type: ["text"],
      form: {
        order: -2,
        rules: [{ required: true, message: t("certd.enterName") }],
        helper: t("certd.helperNotificationName"),
      },
      column: {
        width: 200,
      },
    },
    isDefault: {
      title: t("certd.isDefault"),
      type: "dict-switch",
      dict: dict({
        data: [
          { label: t("certd.yes"), value: true, color: "success" },
          { label: t("certd.no"), value: false, color: "default" },
        ],
      }),
      form: {
        value: false,
        rules: [{ required: true, message: t("certd.selectIsDefault") }],
        order: 999,
      },
      column: {
        align: "center",
        width: 100,
        component: {
          name: "a-switch",
          vModel: "checked",
          disabled: compute(({ value }) => {
            return value === true;
          }),
          on: {
            change({ row }) {
              Modal.confirm({
                title: t("certd.prompt"),
                content: t("certd.confirmSetDefaultNotification"),
                onOk: async () => {
                  await api.SetDefault(row.id);
                  await crudExpose.doRefresh();
                },
                onCancel: async () => {
                  await crudExpose.doRefresh();
                },
              });
            },
          },
        },
      },
    } as ColumnCompositionProps,
    test: {
      title: t("certd.test"),
      form: {
        show: compute(({ form }) => {
          return !!form.type;
        }),
        component: {
          name: "api-test",
          action: "TestRequest",
        },
        order: 990,
        col: {
          span: 24,
        },
      },
      column: {
        show: false,
      },
    },
    setting: {
      column: { show: false },
      form: {
        show: false,
        valueBuilder({ value, form }) {
          form.body = {};
          if (!value) {
            return;
          }
          const setting = JSON.parse(value);
          for (const key in setting) {
            form.body[key] = setting[key];
          }
        },
        valueResolve({ form }) {
          const setting = form.body;
          form.setting = JSON.stringify(setting);
        },
      },
    } as ColumnCompositionProps,
    projectId: {
      title: t("certd.fields.projectName"),
      type: "dict-select",
      dict: projectDict,
    },
  };
}
