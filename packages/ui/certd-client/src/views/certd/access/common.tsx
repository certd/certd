import { ColumnCompositionProps, dict, compute } from "@fast-crud/fast-crud";
// @ts-ignore
import * as api from "./api";
// @ts-ignore
import _ from "lodash-es";
import { computed, ref, toRef } from "vue";
import { useReference } from "/@/use/use-refrence";

export function getCommonColumnDefine(crudExpose: any, typeRef: any) {
  const AccessTypeDictRef = dict({
    url: "/pi/access/accessTypeDict"
  });
  const defaultPluginConfig = {
    component: {
      name: "a-input",
      vModel: "value"
    }
  };

  function buildDefineFields(define: any, form: any) {
    const formWrapperRef = crudExpose.getFormWrapperRef();
    const columnsRef = toRef(formWrapperRef.formOptions, "columns");

    for (const key in columnsRef.value) {
      if (key.indexOf(".") >= 0) {
        delete columnsRef.value[key];
      }
    }
    console.log('crudBinding.value[mode + "Form"].columns', columnsRef.value);
    _.forEach(define.input, (value: any, mapKey: any) => {
      const key = "access." + mapKey;
      const field = {
        ...value,
        key
      };
      const column = _.merge({ title: key }, defaultPluginConfig, field);

      //eval
      useReference(column);

      //设置默认值
      if (column.value != null && _.get(form, key) == null) {
        _.set(form, key, column.value);
      }
      //字段配置赋值
      columnsRef.value[key] = column;
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
        show: false
      },
      column: {
        width: 200,
        component: {
          color: "auto"
        }
      },
      form: {
        component: {
          disabled: false,
          showSearch: true,
          filterOption: (input: string, option: any) => {
            input = input?.toLowerCase();
            return option.value.toLowerCase().indexOf(input) >= 0 || option.label.toLowerCase().indexOf(input) >= 0;
          }
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
            buildDefineFields(define, form);
          }
        },
        helper: computed(() => {
          const define = currentDefine.value;
          if (define == null) {
            return "";
          }
          return define.desc;
        })
      },
      addForm: {
        value: typeRef
      }
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
        }
      }
    } as ColumnCompositionProps
  };
}
