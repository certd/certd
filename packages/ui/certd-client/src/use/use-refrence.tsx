import _ from "lodash-es";
import { asyncCompute, compute } from "@fast-crud/fast-crud";
import { computed } from "vue";

export type MergeScriptContext = {
  compute: typeof compute;
  asyncCompute: typeof asyncCompute;
  computed: typeof computed;
};

export function useReference(formItem: any) {
  if (formItem.mergeScript) {
    const ctx = {
      compute,
      asyncCompute,
      computed
    };
    const script = formItem.mergeScript;
    const func = new Function("ctx", script);
    const merged = func(ctx);
    _.merge(formItem, merged);

    delete formItem.mergeScript;
  }
  //helper
  if (formItem.helper && typeof formItem.helper === "string") {
    //正则表达式替换 [name](url) 成 <a href="url" >
    let helper = formItem.helper.replace(/\[(.*)\]\((.*)\)/g, '<a href="$2" target="_blank">$1</a>');
    helper = helper.replace(/\n/g, "<br/>");
    formItem.helper = {
      render: () => {
        return <div innerHTML={helper}></div>;
      }
    };
  }
}
