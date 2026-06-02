import { cloneDeep, merge, omit } from "lodash-es";
import { useReference } from "/@/use/use-refrence";

export const certApplyTemplateExcludeParamFields = ["domains", "domainsVerifyPlan"];

const excludeFieldSet = new Set(certApplyTemplateExcludeParamFields);

export function pickCertApplyTemplateParams(input: any = {}) {
  const params: any = {};
  for (const key of Object.keys(input || {})) {
    if (!excludeFieldSet.has(key) && input[key] !== undefined) {
      params[key] = input[key];
    }
  }
  return params;
}

export function buildCertApplyTemplateColumns(certPlugin: any) {
  const columns: any = {
    name: {
      title: "模版名称",
      type: "text",
      form: {
        required: true,
        order: -1000,
      },
    },
  };

  for (const key of Object.keys(certPlugin?.input || {})) {
    if (excludeFieldSet.has(key)) {
      continue;
    }
    const inputDefine = cloneDeep(certPlugin?.input?.[key]);
    if (!inputDefine) {
      continue;
    }
    useReference(inputDefine);
    columns[key] = {
      title: inputDefine.title,
      form: {
        ...inputDefine,
      },
    };
  }
  // if (columns.acmeAccountAccessId?.form) {
  //   columns.acmeAccountAccessId.form.show = true;
  //   columns.acmeAccountAccessId.form.required = false;
  //   columns.acmeAccountAccessId.form.component = {
  //     ...columns.acmeAccountAccessId.form.component,
  //     type: "acmeAccount",
  //     subtype: undefined,
  //   };
  // }

  merge(columns, {
    isDefault: {
      title: "默认模版",
      type: "switch",
      form: {
        value: false,
        component: {
          name: "a-switch",
          vModel: "checked",
        },
        order: 900,
      },
    },
    disabled: {
      title: "禁用",
      type: "switch",
      form: {
        value: false,
        component: {
          name: "a-switch",
          vModel: "checked",
        },
        order: 901,
      },
    },
  });

  return columns;
}

export function buildTemplateSubmitData(form: any) {
  return {
    id: form.id,
    name: form.name,
    content: pickCertApplyTemplateParams(omit(form, ["id", "name", "content", "isDefault", "disabled"])),
    isDefault: form.isDefault,
    disabled: form.disabled,
  };
}
