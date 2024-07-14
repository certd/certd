import { ColumnCompositionProps, dict } from "@fast-crud/fast-crud";
// @ts-ignore
import * as api from "./api";
// @ts-ignore
import _ from "lodash-es";
import { toRef } from "vue";

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

  function buildDefineFields(define: any) {
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
      columnsRef.value[key] = _.merge({ title: key }, defaultPluginConfig, field);
      console.log("form", columnsRef.value);
    });
  }

  return {
    type: {
      title: "类型",
      type: "dict-select",
      dict: AccessTypeDictRef,
      search: {
        show: false
      },
      column: {
        width: 120
      },
      form: {
        component: {
          disabled: false
        },
        rules: [{ required: true, message: "请选择类型" }],
        valueChange: {
          immediate: true,
          async handle({ value, mode, form }) {
            if (value == null) {
              return;
            }
            const define = await api.GetProviderDefine(value);
            console.log("define", define);
            buildDefineFields(define);
          }
        }
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
