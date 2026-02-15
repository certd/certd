import { cloneDeep } from "lodash-es";

export function getInputFromForm(form: any, pluginType: string) {
  form = cloneDeep(form);
  let input: any = {};
  const record: any = form;
  if (pluginType === "plugin") {
    input = form?.input || {};
    delete form.input;
  } else if (pluginType === "access") {
    input = form?.access || {};
    delete form.access;
  } else if (pluginType === "notification") {
    input = form?.body || {};
    delete form.body;
  } else if (pluginType === "addon") {
    input = form?.body || {};
    delete form.body;
  } else {
    throw new Error(`pluginType ${pluginType} not support`);
  }
  return {
    input,
    record,
  };
}
