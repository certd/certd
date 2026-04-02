# Access 插件开发技能

## 什么是 Access 插件

Access 插件是 Certd 系统中用于存储用户第三方应用授权数据的插件，例如用户名密码、accessSecret 或 accessToken 等。同时，它还负责对接实现第三方的 API 接口，供其他插件调用使用。

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



@AccessInput({
  title: '另外一个授权Id',//标题
  component: {
    name:"access-selector", //access选择组件
    vModel:"modelValue",
    type: "ssh", // access类型，让用户固定选择这种类型的access
  },
  required: true,  //text组件可以省略
})
otherAccessId;

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
 * api接口示例 获取域名列表，
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
  /**
      this.ctx中包含很多有用的工具类
      type AccessContext = {
        http: HttpClient;
        logger: ILogger;
        utils: typeof utils;
        accessService: IAccessService;
      }
   */
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

--- 开发技巧：实现统一的 API 请求封装

**好处：**
- **代码复用**：避免在每个 API 方法中重复编写相同的 header 设置和错误处理逻辑
- **错误处理一致**：统一捕获和处理各种错误情况，确保错误信息格式统一
- **日志记录完善**：集中记录详细的错误信息，便于调试和问题排查
- **接口调用简化**：调用方只需关注业务逻辑，无需关心底层请求细节
- **易于维护**：统一修改 API 调用方式时，只需修改一处代码


## 注意事项

1. **插件命名**：插件名称应简洁明了，反映其功能。
2. **属性加密**：对于敏感信息（如密钥），应设置 `encrypt: true`。
3. **日志输出**：必须使用 `this.ctx.logger` 输出日志，而不是 `console`。
4. **错误处理**：API 调用失败时应抛出明确的错误信息。
5. **测试方法**：实现 `onTestRequest` 方法，以便用户可以测试授权是否正常。
6. **统一接口调用方法**：封装统一的 API 请求方法，避免在每个 API 方法调用中重复编写错误处理逻辑。

## 完整示例

### 示例 1: 通用授权插件

```typescript
import { AccessInput, BaseAccess, IsAccess, Pager, PageRes, PageSearch } from '@certd/pipeline';
import { DomainRecord } from '@certd/plugin-lib';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'demo',
  title: '授权插件示例',
  icon: 'clarity:plugin-line', //插件图标
  desc: '这是一个示例授权插件，用于演示如何实现一个授权插件',
})
export class DemoAccess extends BaseAccess {

   /**
   * 授权属性配置
   */
  @AccessInput({
    title: '授权方式',
    value: 'apiKey', //默认值
    component: {
      name: "a-select", //基于antdv的输入组件
      vModel: "value", // v-model绑定的属性名
      options: [ //组件参数
        {
          label: "API密钥（推荐）",
          value: "apiKey"
        },
        {
          label: "账号密码",
          value: "account"
        },
      ],
      placeholder: 'demoKeyId',
    },
    required: true,
  })
  apiType = '';

  /**
   * 授权属性配置
   */
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

  // 还可以继续编写API

  /**
   *  通用api调用方法, 具体如何构造请求体，需参考对应应用的API文档
   */
  async doRequest(req: { action: string, data?: any }) {
    /**
        this.ctx中包含很多有用的工具类
        type AccessContext = {
          http: HttpClient;
          logger: ILogger;
          utils: typeof utils;
          accessService: IAccessService;
        }
     */
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
}
```