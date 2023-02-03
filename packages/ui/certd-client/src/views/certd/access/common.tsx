import { dict } from "@fast-crud/fast-crud";
import * as api from "./api";
import _ from "lodash-es";

export function getCommonColumnDefine(crudBinding, typeRef) {
  const AccessTypeDictRef = dict({
    url: "/pi/access/accessTypeDict"
  });
  const defaultPluginConfig = {
    component: {
      name: "a-input",
      vModel: "value"
    }
  };

  function buildDefineFields(define, mode) {
    const columns = crudBinding.value[mode + "Form"].columns;
    for (const key in columns) {
      if (key.indexOf(".") >= 0) {
        delete columns[key];
      }
    }
    console.log('crudBinding.value[mode + "Form"].columns', columns);
    _.forEach(define.input, (value, mapKey) => {
      const key = "access." + mapKey;
      const field = {
        ...value,
        key
      };
      columns[key] = _.merge({ title: key }, defaultPluginConfig, field);
      console.log("form", crudBinding.value[mode + "Form"]);
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
            buildDefineFields(define, mode);
          }
        }
      },
      addForm: {
        value: typeRef
      }
    },
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
    }
  };
}
