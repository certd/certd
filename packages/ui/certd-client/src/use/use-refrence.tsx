import _ from "lodash-es";
import { compute } from "@fast-crud/fast-crud";

export function useReference(formItem: any) {
  if (formItem.reference) {
    for (const reference of formItem.reference) {
      _.set(
        formItem,
        reference.dest,
        compute<any>((scope) => {
          return _.get(scope, reference.src);
        })
      );
    }
    delete formItem.reference;
  }

  if (formItem.mergeScript) {
    const ctx = {
      compute
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
