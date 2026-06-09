# Access 插件开发指南

## 开发步骤

### 1. 导入必要的依赖

```typescript
import { AccessInput, BaseAccess, IsAccess, Pager, PageRes, PageSearch } from '@certd/pipeline';
import { DomainRecord } from '@certd/plugin-lib';
```

### 2. 使用 @IsAccess 注解注册插件

```typescript
@IsAccess({
  name: 'demo', // 插件唯一标识
  title: '授权插件示例', // 插件标题
  icon: 'clarity:plugin-line', // 插件图标
  desc: '这是一个示例授权插件，用于演示如何实现一个授权插件', // 插件描述
})
export class DemoAccess extends BaseAccess {
  // 插件实现...
}
```

### 3. 定义授权属性

使用 `@AccessInput` 注解定义授权属性：

```typescript
@AccessInput({
  title: '授权方式',
  value: 'apiKey', // 默认值
  component: {
    name: "a-select", // 基于 antdv 的输入组件
    vModel: "value", // v-model 绑定的属性名
    options: [ // 组件参数
      { label: "API密钥（推荐）", value: "apiKey" },
      { label: "账号密码", value: "account" },
    ],
    placeholder: 'demoKeyId',
  },
  required: true,
})
apiType = '';

@AccessInput({
  title: '密钥Id',
  component: {
    name:"a-input",
    allowClear: true,
    placeholder: 'demoKeyId',
  },
  required: true,
})
demoKeyId = '';

@AccessInput({
  title: '密钥',//标题
  required: true,  //text组件可以省略
  encrypt: true, //该属性是否需要加密
})
demoKeySecret = '';
```

### 4. 实现测试方法

```typescript
@AccessInput({
  title: "测试",
  component: {
    name: "api-test",
    action: "TestRequest"
  },
  helper: "点击测试接口是否正常"
})
testRequest = true;

/**
 * 会通过上面的testRequest参数在ui界面上生成测试按钮，供用户测试接口调用是否正常
 */
async onTestRequest() {
  await this.GetDomainList({});
  return "ok"
}
```

### 5. 实现 API 方法

```typescript
/**
 * 获api接口示例 取域名列表，
 */
async GetDomainList(req: PageSearch): Promise<PageRes<DomainRecord>> {
  //输出日志必须使用ctx.logger
  this.ctx.logger.info(`获取域名列表，req:${JSON.stringify(req)}`);
  const pager = new Pager(req);
  const resp = await this.doRequest({
    action: "ListDomains",
    data: {
      domain: req.searchKey,
      offset: pager.getOffset(),
      limit: pager.pageSize,
    }
  });
  const total = resp?.TotalCount || 0;
  let list = resp?.DomainList?.map((item) => {
    item.domain = item.Domain;
    item.id = item.DomainId;
    return item;
  })
  return {
    total,
    list
  };
}

/**
 *  通用api调用方法, 具体如何构造请求体，需参考对应应用的API文档
 */
async doRequest(req: { action: string, data?: any }) {
  const res = await this.ctx.http.request({
    url: "https://api.demo.cn/api/",
    method: "POST",
    data: {
      Action: req.action,
      Body: req.data
    }
  });

  if (res.Code !== 0) {
    //异常处理
    throw new Error(res.Message || "请求失败");
  }
  return res.Resp;
}
```

## 注意事项

1. **插件命名**：插件名称应简洁明了，反映其功能。
2. **属性加密**：对于敏感信息（如密钥），应设置 `encrypt: true`。
3. **日志输出**：必须使用 `this.ctx.logger` 输出日志，而不是 `console`。
4. **错误处理**：API 调用失败时应抛出明确的错误信息。
5. **测试方法**：实现 `onTestRequest` 方法，以便用户可以测试授权是否正常。
