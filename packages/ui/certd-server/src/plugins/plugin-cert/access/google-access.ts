import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

@IsAccess({
  name: "google",
  title: "google cloud",
  desc: "谷歌云授权",
  icon: "flat-color-icons:google",
})
export class GoogleAccess extends BaseAccess {
  @AccessInput({
    title: "密钥类型",
    value: "serviceAccount",
    component: {
      placeholder: "密钥类型",
      name: "a-select",
      vModel: "value",
      options: [
        { value: "serviceAccount", label: "服务账号密钥" },
        { value: "apiKey", label: "ApiKey，暂不可用", disabled: true },
      ],
    },
    helper: "密钥类型",
    required: true,
    encrypt: false,
  })
  type = "";

  @AccessInput({
    title: "项目ID",
    component: {
      placeholder: "ProjectId",
    },
    helper: "ProjectId",
    required: true,
    encrypt: false,
    mergeScript: `
    return {
      show:ctx.compute(({form})=>{
        return form.access.type === 'apiKey'
      })
    }
    `,
  })
  projectId = "";

  @AccessInput({
    title: "ApiKey",
    component: {
      placeholder: "ApiKey",
    },
    helper: "不要选，目前没有用",
    required: true,
    encrypt: true,
    mergeScript: `
    return {
      show:ctx.compute(({form})=>{
        return form.access.type === 'apiKey'
      })
    }
    `,
  })
  apiKey = "";

  @AccessInput({
    title: "服务账号密钥",
    component: {
      placeholder: "serviceAccountSecret",
      name: "a-textarea",
      vModel: "value",
      rows: 4,
    },
    helper:
      "[如何创建服务账号](https://cloud.google.com/iam/docs/service-accounts-create?hl=zh-CN) \n[获取密钥](https://console.cloud.google.com/iam-admin/serviceaccounts?hl=zh-cn)，点击详情，点击创建密钥，将下载json文件，把内容填在此处",
    required: true,
    encrypt: true,
    mergeScript: `
    return {
      show:ctx.compute(({form})=>{
        return form.access.type === 'serviceAccount'
      })
    }
    `,
  })
  serviceAccountSecret = "";

  @AccessInput({
    title: "https代理",
    component: {
      placeholder: "http://127.0.0.1:10811",
    },
    helper: "Google的请求需要走代理，如果不配置，则会使用环境变量中的全局HTTPS_PROXY配置\n或者服务器本身在海外，则不需要配置",
    required: false,
    encrypt: false,
  })
  httpsProxy = "";
}

new GoogleAccess();
