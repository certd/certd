import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 */
@IsAccess({
  name: "lecdn",
  title: "LeCDN授权",
  desc: "",
  icon: "material-symbols:shield-outline",
})
export class LeCDNAccess extends BaseAccess {
  @AccessInput({
    title: "LeCDN系统网址",
    component: {
      name: "a-input",
      vModel: "value",
    },
    required: true,
    helper: "例如：http://demo.xxxx.cn",
  })
  url!: string;

  @AccessInput({
    title: "认证类型",
    component: {
      placeholder: "请选择",
      name: "a-select",
      vModel: "value",
      options: [
        { value: "token", label: "API访问令牌" },
        { value: "password", label: "账号密码(旧版本)" },
      ],
    },
    required: true,
  })
  type!: string;

  @AccessInput({
    title: "用户名",
    component: {
      placeholder: "username",
    },
    mergeScript: `
    return {
         show:ctx.compute(({form})=>{
          return form.access.type === 'password';
        })
      }
    `,
    required: true,
    encrypt: false,
  })
  username = "";

  @AccessInput({
    title: "登录密码",
    component: {
      placeholder: "password",
    },
    required: true,
    encrypt: true,
    mergeScript: `
    return {
         show:ctx.compute(({form})=>{
          return form.access.type === 'password';
        })
      }
    `,
  })
  password = "";

  @AccessInput({
    title: "Api访问令牌",
    component: {
      placeholder: "apiToken",
    },
    required: true,
    encrypt: true,
    mergeScript: `
    return {
         show:ctx.compute(({form})=>{
          return form.access.type === 'token';
        })
      }
    `,
  })
  apiToken = "";
}

new LeCDNAccess();
