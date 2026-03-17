import { merge } from "lodash-es";

export function createCertDomainGetterInputDefine(opts?: { certInputKey?: string; props?: any }) {
  const certInputKey = opts?.certInputKey || "cert";
  return merge(
    {
      title: "当前证书域名",
      component: {
        name: "cert-domains-getter",
      },
      mergeScript: `
        return {
          component:{
              inputKey: ctx.compute(({form})=>{
                return form.${certInputKey}
              }),
          }
        }
        `,
      template: false,
      required: true,
    },
    opts?.props
  );
}

export function createRemoteSelectInputDefine(opts?: {
  title: string;
  certDomainsInputKey?: string;
  accessIdInputKey?: string;
  typeName?: string;
  action: string;
  type?: string;
  watches?: string[];
  helper?: string;
  formItem?: any;
  mode?: string;
  multi?: boolean;
  required?: boolean;
  rules?: any;
  mergeScript?: string;
  search?: boolean;
  pager?: boolean;
  component?: any;
  value?: any;
}) {
  const title = opts?.title || "请选择";
  const certDomainsInputKey = opts?.certDomainsInputKey || "certDomains";
  const accessIdInputKey = opts?.accessIdInputKey || "accessId";
  const typeName = opts?.typeName;
  const action = opts?.action;
  const type = opts?.type || "plugin";
  const watches = opts?.watches || [];
  const helper = opts?.helper || "请选择";
  const search = opts?.search ?? false;
  const pager = opts?.pager ?? false;
  let mode = "default";
  const multi = opts?.multi ?? true;
  if (multi) {
    mode = "tags";
  }
  const item = {
    title,
    component: {
      name: "remote-select",
      vModel: "value",
      mode,
      type,
      typeName,
      action,
      search,
      pager,
      multi,
      watches: [certDomainsInputKey, accessIdInputKey, ...watches],
      ...opts.component,
    },
    value: opts.value,
    rules: opts?.rules,
    required: opts.required ?? true,
    mergeScript:
      opts.mergeScript ??
      `
          return {
            component:{
              form: ctx.compute(({form})=>{
                return form
              })
            },
         }
        `,
    helper,
  };

  return merge(item, opts?.formItem);
}
