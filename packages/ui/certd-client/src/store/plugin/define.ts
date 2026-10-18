import { merge } from "lodash-es";

const defaultColumn = {
  component: {
    name: "a-input",
  },
};

const vModelMapping: Record<string, string> = {
  "remote-select": "value",
  RemoteSelect: "value",
  "a-switch": "checked",
  "a-checkbox": "checked",
  "a-radio": "checked",
};

export function initComponentDefine(column: any) {
  const field = merge({}, defaultColumn, column);
  const componentName = field.component.name;
  if (field.component.vModel == null) {
    if (componentName?.startsWith("a-")) {
      field.component.vModel = vModelMapping[componentName] || "value";
    } else {
      field.component.vModel = vModelMapping[componentName] || "modelValue";
    }
  }
  return field;
}
