import { ColumnCompositionProps, compute, dict } from "@fast-crud/fast-crud";
import { computed, provide, ref, toRef } from "vue";
import { useReference } from "/@/use/use-refrence";
import { forEach, get, merge, set } from "lodash-es";
import { Modal } from "ant-design-vue";
import { mitter } from "/@/utils/util.mitt";
import { useI18n } from "/src/locales";
import * as pipelineApi from "/@/views/certd/pipeline/api";
import { getAddonTypeDefine } from "/@/views/certd/addon/api";

export function addonProvide(api: any) {
  provide("addonApi", api);
  provide("get:plugin:type", () => {
    return "addon";
  });
}

export function getCommonColumnDefine(crudExpose: any, typeRef: any, api: any, addonType: string) {
  const { t } = useI18n();
  // const addonTypeTypeDictRef = dict({
  //   data: [{ value: "captcha", label: "验证码" }],
  // });
  const addonTypeDictRef = dict({
    url: `/addon/getTypeDict?addonType=${addonType}`,
  });
  const defaultPluginConfig = {
    component: {
      name: "a-input",
      vModel: "value",
    },
  };

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
    // addonType: {
    //   title: "Addon类型",
    //   type: "dict-select",
    //   dict: addonTypeTypeDictRef,
    //   search: {
    //     show: false,
    //   },
    //   column: {
    //     width: 200,
    //     component: {
    //       color: "auto",
    //     },
    //   },
    //   form: {
    //     onChange(ctx: { value: any }) {
    //       addonTypeDictRef.url = `/addon/getTypeDict?addonType=${ctx.value}`;
    //     },
    //   },
    //   editForm: {
    //     component: {
    //       disabled: false,
    //     },
    //   },
    // },
    type: {
      title: t("certd.addonType"),
      type: "dict-select",
      dict: addonTypeDictRef,
      search: {
        show: true,
        valueChange: null,
      },
      column: {
        width: 200,
        component: {
          color: "auto",
        },
      },
      editForm: {
        component: {
          disabled: true,
        },
      },
      addForm: {
        component: {
          disabled: compute(({ form }) => {
            return form.type ? true : false;
          }),
        },
      },
      form: {
        order: -22,
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
        rules: [{ required: true, message: t("certd.addonTypeSelect") }],
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
      title: t("certd.addonName"),
      search: {
        show: true,
      },
      type: ["text"],
      form: {
        order: -2,
        rules: [{ required: true, message: t("certd.enterName") }],
        helper: t("certd.addonNameHelper"),
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
        show: computed(() => {
          return getAddonTypeDefine(addonType)?.showDefault ?? false;
        }),
        columnSetShow: false,
        value: false,
        rules: [{ required: true, message: t("certd.selectIsDefault") }],
        order: 999,
      },
      column: {
        align: "center",
        width: 100,
        columnSetShow: false,
        show: computed(() => {
          return getAddonTypeDefine(addonType)?.showDefault ?? false;
        }),
        component: {
          name: "a-switch",
          vModel: "checked",
          disabled: compute(({ value }) => {
            return value === true;
          }),
          on: {
            // @ts-ignore
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
    },
    test: {
      title: t("certd.test"),
      form: {
        show: compute(({ form }) => {
          return !!form.type && currentDefine.value?.showTest === true;
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
        columnSetShow: false,
      },
    },
    setting: {
      column: { show: false, columnSetShow: false },
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
  };
}
