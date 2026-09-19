---
name: certd-online-access-plugin-dev
description: 用于开发 Certd 在线 Access 插件。输出完整 YAML，content 中返回继承 BaseAccess 的 class，并在 input 中声明授权字段。
---

# 在线 Access 插件

读取父 Skill 的 `references/online-yaml-format.md`。不要沿用代码版 `@IsAccess`、`@AccessInput` 装饰器和独立 TypeScript 文件。

## 输出结构

- `pluginType` 使用 `access`。
- `input` 中声明用户需要填写的授权字段。
- 敏感字段在 input 中设置加密或密码类组件。
- `content` 中实现授权 class 和 API 方法。

## `content` 模板

```javascript
const { BaseAccess } = await _ctx.import("@certd/pipeline")

return class DemoAccess extends BaseAccess {
  demoKeyId
  demoKeySecret

  async onTestRequest() {
    await this.getDomainList({ searchKey: "" })
    return "ok"
  }

  async getDomainList(req) {
    this.logger.info("获取域名列表", { searchKey: req.searchKey })
    const res = await this.ctx.http.request({
      url: "https://api.example.com/domains",
      method: "GET",
      params: { keyword: req.searchKey },
    })
    if (res.error) {
      throw new Error(`获取域名列表失败: ${res.message}`)
    }
    return {
      total: res.data?.total || 0,
      list: res.data?.list || [],
    }
  }
}
```

## 编写要求

- 统一使用 `await _ctx.import(...)` 加载模块。
- 使用 `_ctx.import("/@/...")` 通过绝对路径加载 `server/src/` 下的模块，`/@` 代表 `server/src` 根路径。
- 需要记录模块加载信息时使用 `_ctx.logger`，访问执行日志使用 `this.logger`。
- 返回继承 `BaseAccess` 的 class，不使用装饰器。
- class 属性名必须与 YAML `input` 字段一致。
- 所有敏感授权值只通过 `this` 和 Certd 授权上下文使用，不打印真实值。
- `onTestRequest` 应调用实际 API 方法并在失败时抛出异常。
- 对外 API 方法应统一处理分页、错误和返回字段。
- 使用 `this.logger` 或框架提供的 logger，禁止 `console.log`。
- 一般将API接口方法封装到Access中，其他plugin调用access的方法当做client sdk使用

## 字段动态显隐

多种鉴权方式（例如「ApiKey」和「AccessKey签名」）共用一个授权时，
用字段上的 `mergeScript` 按所选方式显隐对应字段，只让用户看到当前方式需要的字段：

```yaml
input:
  authType:
    title: 鉴权方式
    value: apikey
    component:
      name: a-select
      vModel: value
      options:
        - { label: AccessKey签名, value: aksk }
        - { label: ApiKey, value: apikey }
  accessKeyId:
    title: accessKeyId
    component:
      name: a-input
      vModel: value
    mergeScript: |2-

          return {
            show: ctx.compute(({form})=>{
              return !form.access.authType || form.access.authType === 'aksk';
            })
          }
```

- 判断必须写在 `ctx.compute(({form})=>{ ... })` 回调里；脚本本身在插件定义阶段就拼好了，
  那时表单还没打开，用参数在服务端判断字段值没有意义。
- 授权表单的字段值在 `form.access.xxx`（任务表单才是 `form.xxx`）。
- 历史授权没有 `authType` 字段，条件里要用 `!form.access.authType || ...` 兜底走旧逻辑。

完整用法见父 Skill 的 `references/merge-script.md`。