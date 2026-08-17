# Component Examples

Source: `packages/ui/certd-server/src/plugins`.
Detected **30** distinct component names.

These snippets are extracted from existing Certd plugins. For online plugins, place the object under `input.<field>.component` in the YAML document.

## `EmailSelector`

Source: `packages/ui/certd-server/src/plugins/plugin-other/plugins/plugin-deploy-to-mail.ts`

```ts
component: {
  name: "EmailSelector",
  vModel: "value",
  mode: "tags",
}
```

## `ParamsShow`

Source: `packages/ui/certd-server/src/plugins/plugin-template/email/plugin-common.ts`

```ts
component: {
name: "ParamsShow",
      params: [
        { label: "标题", value: "title" },
        { label: "内容", value: "content" },
        { label: "URL", value: "url" },
      ],
}
```

## `RemoteSelect`

Source: `packages/ui/certd-server/src/plugins/plugin-cert/plugin/cert-plugin/getter/aliyun.ts`

```ts
component: {
  name: "RemoteSelect",
  vModel: "value",
  pager: true,
  single: true,
}
```

## `a-alert`

Source: `packages/ui/certd-server/src/plugins/plugin-template/email/plugin-base.ts`

```ts
component: {
  name: "a-alert",
  props: {
    type: "info",
    message: "在标题和内容模版中，通过${name}引用参数，例如： 感谢注册，您的注册验证码为：${code}",
  },
}
```

## `a-auto-complete`

Source: `packages/ui/certd-server/src/plugins/plugin-aliyun/plugin/deploy-to-ack/index.ts`

```ts
component: {
name: "a-auto-complete",
      vModel: "value",
      options: [
        { value: "cn-qingdao", label: "华北1（青岛）" },
        { value: "cn-beijing", label: "华北2（北京）" },
        { value: "cn-zhangjiakou", label: "华北3（张家口）" },
        { value: "cn-huhehaote", label: "华北5（呼和浩特）" },
        { value: "cn-wulanchabu", label: "华北6（乌兰察布）" },
        { value: "cn-hangzhou", label: "华东1（杭州）" },
        { value: "cn-shanghai", label: "华东2（上海）" },
        { value: "cn-shenzhen", label: "华南1（深圳）" },
        { value: "cn-guangzhou", label: "华南3（广州）" },
        { value: "ap-southeast-2", label: "澳大利亚（悉尼）" },
        { value: "ap-southeast-3", label: "马来西亚（吉隆坡）" },
        { value: "ap-northeast-1", label: "日本（东京）" },
        { value: "cn-chengdu", label: "西南1（成都）" },
        { value: "ap-southeast-1", label: "新加坡" },
        { value: "ap-southeast-5", label: "印度尼西亚（雅加达）" },
        { value: "cn-hongkong", label: "中国香港" },
        { value: "eu-central-1", label: "德国（法兰克福）" },
        { value: "us-east-1", label: "美国（弗吉尼亚）" },
        { value: "us-west-1", label: "美国（硅谷）" },
        { value: "eu-west-1", label: "英国（伦敦）" },
        { value: "me-east-1", label: "阿联酋（迪拜）" },
        //金融云
        { value: "cn-beijing-finance-1", label: "华北2 金融云（邀测）" },
        { value: "cn-hangzhou-finance", label: "华东1 金融云" },
        { value: "cn-shanghai-finance-1", label: "华东2 金融云" },
        { value: "cn-shenzhen-finance-1", label: "华南1 金融云" },
      ],
      placeholder: "集群所属大区",
}
```

## `a-input`

Source: `packages/ui/certd-server/src/plugins/plugin-admin/plugin-db-backup.ts`

```ts
component: {
name: "a-input",
      type: "value",
      placeholder: `默认${defaultBackupDir}`,
}
```

## `a-input-number`

Source: `packages/ui/certd-server/src/plugins/plugin-acepanel/access.ts`

```ts
component: {
name: "a-input-number",
      vModel: "value",
}
```

## `a-input-password`

Source: `packages/ui/certd-server/src/plugins/plugin-51dns/access.ts`

```ts
component: {
name: "a-input-password",
      vModel: "value",
      placeholder: "密码",
}
```

## `a-radio-group`

Source: `packages/ui/certd-server/src/plugins/plugin-aliyun/plugin/deploy-to-esa/index.ts`

```ts
component: {
name: "a-radio-group",
      vModel: "value",
      options: [
        { label: "边缘证书", value: "edge" },
        { label: "SaaS证书", value: "saas" },
      ],
}
```

## `a-select`

Source: `packages/ui/certd-server/src/plugins/plugin-admin/plugin-db-backup.ts`

```ts
component: {
name: "a-select",
      options: [
        { label: "本地复制", value: "local" },
        { label: "oss上传（推荐）", value: "oss" },
        { label: "ssh上传(请使用oss上传方式)", value: "ssh", disabled: true },
      ],
      placeholder: "",
}
```

## `a-switch`

Source: `packages/ui/certd-server/src/plugins/plugin-acepanel/access.ts`

```ts
component: {
name: "a-switch",
      vModel: "checked",
}
```

## `a-textarea`

Source: `packages/ui/certd-server/src/plugins/plugin-admin/plugin-script.ts`

```ts
component: {
name: "a-textarea",
      vModel: "value",
      rows: 10,
      style: "background-color: #000c17;color: #fafafa;",
}
```

## `access-selector`

Source: `packages/ui/certd-server/src/plugins/plugin-acepanel/plugins/plugin-deploy-to-website.ts`

```ts
component: {
name: "access-selector",
      type: "acepanel",
}
```

## `api-test`

Source: `packages/ui/certd-server/src/plugins/plugin-51dns/access.ts`

```ts
component: {
name: "api-test",
      action: "TestRequest",
}
```

## `cert-info-updater`

Source: `packages/ui/certd-server/src/plugins/plugin-cert/plugin/cert-plugin/custom/index.ts`

```ts
component: {
name: "cert-info-updater",
      vModel: "modelValue",
}
```

## `dns-provider-selector`

Source: `packages/ui/certd-server/src/plugins/plugin-cert/plugin/cert-plugin/apply.ts`

```ts
component: {
name: "dns-provider-selector",
}
```

## `domain-selector`

Source: `packages/ui/certd-server/src/plugins/plugin-cert/plugin/cert-plugin/base-convert.ts`

```ts
component: {
name: "domain-selector",
      vModel: "value",
      mode: "tags",
      // open: false,
      placeholder: "请输入证书域名/IP，比如：foo.com , *.foo.com , *.sub.foo.com , *.bar.com , 123.123.123.123",
      tokenSeparators: [",", " ", "，", "、", "|"],
      search: true,
      pager: true,
}
```

## `domains-verify-plan-editor`

Source: `packages/ui/certd-server/src/plugins/plugin-cert/plugin/cert-plugin/apply.ts`

```ts
component: {
name: "domains-verify-plan-editor",
}
```

## `email-selector`

Source: `packages/ui/certd-server/src/plugins/plugin-cert/plugin/cert-plugin/base.ts`

```ts
component: {
name: "email-selector",
      vModel: "value",
}
```

## `fs-icon-selector`

Source: `packages/ui/certd-server/src/plugins/plugin-oauth/oidc/plugin-oidc.ts`

```ts
component: {
name: "fs-icon-selector",
      vModel: "modelValue",
      iconSets: IconSets,
}
```

## `icon-select`

Source: `packages/ui/certd-server/src/plugins/plugin-cert/plugin/cert-plugin/apply.ts`

```ts
component: {
name: "icon-select",
      vModel: "value",
      options: [
        { value: "letsencrypt", label: "Let's Encrypt（免费，新手推荐，支持IP证书）", icon: "simple-icons:letsencrypt" },
        { value: "google", label: "Google（免费）", icon: "flat-color-icons:google" },
        { value: "zerossl", label: "ZeroSSL（免费）", icon: "emojione:digit-zero" },
        { value: "litessl", label: "litessl（免费）", icon: "roentgen:free" },
        { value: "sslcom", label: "SSL.com（仅主域名和www免费）", icon: "la:expeditedssl" },
        { value: "letsencrypt_staging", label: "Let's Encrypt测试环境（仅供测试）", icon: "simple-icons:letsencrypt" },
      ],
}
```

## `input-password`

Source: `packages/ui/certd-server/src/plugins/plugin-cert/plugin/cert-plugin/base-convert.ts`

```ts
component: {
name: "input-password",
      vModel: "value",
}
```

## `notification-selector`

Source: `packages/ui/certd-server/src/plugins/plugin-github/plugins/plugin-check-release.ts`

```ts
component: {
name: "notification-selector",
      select: {
        mode: "tags",
      },
}
```

## `output-selector`

Source: `packages/ui/certd-server/src/plugins/plugin-acepanel/plugins/plugin-deploy-to-website.ts`

```ts
component: {
name: "output-selector",
      from: [...CertApplyPluginNames],
}
```

## `pem-input`

Source: `packages/ui/certd-server/src/plugins/plugin-cert/plugin/cert-plugin/custom/index.ts`

```ts
component: {
name: "pem-input",
                vModel: "modelValue",
                textarea: {
                  rows: 4,
                  placeholder: "-----BEGIN CERTIFICATE-----\n...\n...\n-----END CERTIFICATE-----",
                },
}
```

## `refresh-input`

Source: `packages/ui/certd-server/src/plugins/plugin-cert/access/acme-account-access.ts`

```ts
component: {
name: "refresh-input",
      action: "GenerateAccount",
      buttonText: "生成ACME账号",
      successMessage: "ACME账号已生成，请保存授权配置",
      type: "textarea",
      rows: 4,
}
```

## `remote-auto-complete`

Source: `packages/ui/certd-server/src/plugins/plugin-aliyun/plugin/deploy-to-apig/index.ts`

```ts
component: {
name: "remote-auto-complete",
}
```

## `remote-select`

Source: `packages/ui/certd-server/src/plugins/plugin-nginx-proxy-manager/plugins/plugin-deploy-to-proxy-hosts.ts`

```ts
component: {
name: "remote-select",
      vModel: "value",
      mode: "tags",
      type: "plugin",
      action: "onGetProxyHostOptions",
      search: true,
      pager: false,
      single: false,
      watches: ["certDomains", "accessId"],
}
```

## `remote-tree-select`

Source: `packages/ui/certd-server/src/plugins/plugin-tencent/plugin/refresh-cert/index.ts`

```ts
component: {
name: "remote-tree-select",
      vModel: "value",
      action: TencentRefreshCert.prototype.onGetRegionsTree.name,
      pager: false,
      search: false,
      watches: ["certList"],
}
```

## `synology-device-id-getter`

Source: `packages/ui/certd-server/src/plugins/plugin-plus/synology/access.ts`

```ts
component: {
placeholder: "设备ID",
      name: "synology-device-id-getter",
      type: "access",
      typeName: "synology",
}
```
