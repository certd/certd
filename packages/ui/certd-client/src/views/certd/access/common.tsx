import { ColumnCompositionProps, dict } from "@fast-crud/fast-crud";
import { computed, provide, ref, toRef } from "vue";
import { useReference } from "/@/use/use-refrence";
import { forEach, get, merge, set } from "lodash-es";
import SecretPlainGetter from "/@/views/certd/access/access-selector/access/secret-plain-getter.vue";
import { utils } from "/@/utils";

export function getCommonColumnDefine(crudExpose: any, typeRef: any, api: any) {
  provide("getFromType", api.from);
  provide("accessApi", api);
  provide("get:plugin:type", () => {
    return "access";
  });
  provide("getCurrentPluginDefine", () => {
    return currentDefine;
  });
  const AccessTypeDictRef = dict({
    url: "/pi/access/accessTypeDict",
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
      const key = "access." + mapKey;
      const field = {
        ...value,
        key,
      };
      const column = merge({ title: key }, defaultPluginConfig, field);

      if (value.encrypt === true && mode != "add") {
        column.suffixRender = (scope: { form: any; key: string }) => {
          const { form, key } = scope;
          const inputKey = scope.key.replace("access.", "");
          const onChange = (val: any) => {
            set(form, key, val);
          };
          const value = get(form, key);
          return <SecretPlainGetter accessId={form.id} inputKey={inputKey} modalValue={value} onUpdate:modelValue={onChange} />;
        };
      }
      //eval
      useReference(column);

      if (column.required) {
        if (!column.rules) {
          column.rules = [];
        }
        column.rules.push({ required: true, message: "此项必填" });
      }

      //设置默认值
      if (column.value != null && get(form, key) == null) {
        set(form, key, column.value);
      }
      //字段配置赋值
      if (columnsRef.value) {
        columnsRef.value[key] = column;
      }

      console.log("form", columnsRef.value);
    });
  }

  const currentDefine = ref();

  return {
    type: {
      title: "类型",
      type: "dict-select",
      dict: AccessTypeDictRef,
      search: {
        show: true,
      },
      column: {
        width: 200,
        component: {
          color: "auto",
        },
        order: -1,
      },
      form: {
        order: -1,
        component: {
          disabled: false,
          showSearch: true,
          filterOption: (input: string, option: any) => {
            input = input?.toLowerCase();
            return option.value.toLowerCase().indexOf(input) >= 0 || option.label.toLowerCase().indexOf(input) >= 0;
          },
          renderLabel(item: any) {
            return (
              <span class={"flex flex-between items-center"}>
                <span class={"flex items-center"}>
                  <fs-icon icon={item.icon} class={"mr-5 fs-16 color-blue"} />
                  {item.label}
                </span>
                <span>{item.value}</span>
              </span>
            );
          },
        },
        rules: [{ required: true, message: "请选择类型" }],
        valueChange: {
          immediate: true,
          async handle({ value, mode, form, immediate }) {
            if (value == null) {
              return;
            }
            const define = await api.GetProviderDefine(value);
            currentDefine.value = define;
            console.log("define", define);
            if (!immediate) {
              form.access = {};
            }
            buildDefineFields(define, form, mode);
          },
        },
        helper: {
          render: () => {
            const define = currentDefine.value;
            if (define == null) {
              return "";
            }
            return <div innerHTML={utils.transformLink(define.desc)}></div>;
          },
        },
      },
      addForm: {
        value: typeRef,
      },
    } as ColumnCompositionProps,
    setting: {
      column: { show: false },
      form: {
        show: false,
        valueBuilder({ value, form }) {
          form.access = {};
          if (!value) {
            return;
          }
          const setting = JSON.parse(value);
          for (const key in setting) {
            form.access[key] = setting[key];
          }
        },
        valueResolve({ form }) {
          const setting = form.access;
          form.setting = JSON.stringify(setting);
        },
      },
    } as ColumnCompositionProps,
  };
}
