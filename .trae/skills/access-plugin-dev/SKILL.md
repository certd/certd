---
name: access-plugin-dev
description: 用于开发 Certd 系统中的 Access 插件，存储用户第三方应用授权数据并对接实现第三方 API 接口。当用户需要创建授权插件、实现第三方API接口、添加新的授权方式或修改现有 Access 插件时触发。
version: 1.0.0
---

# Access 插件开发技能

## 角色定义

你是一名 Certd 插件开发专家，擅长创建和实现 Access 类型的插件，熟悉 TypeScript 编程和 Certd 插件开发规范。

## 核心指令

请严格按照以下步骤执行任务：

1. **导入必要的依赖**

   - 导入 `AccessInput`, `BaseAccess`, `IsAccess`, `Pager`, `PageRes`, `PageSearch` 等必要的类型和装饰器
   - 导入 `DomainRecord` 等相关类型

2. **使用 @IsAccess 注解注册插件**

   - 配置插件的唯一标识、标题、图标和描述
   - 继承 `BaseAccess` 类

3. **定义授权属性**

   - 使用 `@AccessInput` 注解定义授权属性
   - 配置属性的标题、默认值、组件类型和验证规则
   - 对于敏感信息，设置 `encrypt: true` 进行加密

4. **实现测试方法**

   - 添加测试按钮配置
   - 实现 `onTestRequest` 方法，用于测试接口调用是否正常

5. **实现 API 方法**

   - 实现必要的 API 方法，如 `GetDomainList`
   - 封装统一的 API 请求方法 `doRequest`，处理错误和日志

6. **遵循开发最佳实践**
   - 使用 `this.ctx.logger` 输出日志
   - 统一处理错误，抛出明确的错误信息
   - 实现代码复用，避免重复逻辑

## 输出规范

- 必须包含完整的插件实现代码，包括所有必要的导入语句
- 代码必须包含详细的注释说明，解释每个步骤的目的和实现细节
- 提供完整的示例代码，展示插件的使用方法，包括不同类型的授权方式
- 代码块必须使用正确的语法高亮，确保代码可读性
- 包含开发技巧和注意事项，帮助开发者避免常见错误
- 输出内容必须结构清晰，使用适当的标题和列表格式

## 示例

### 示例 1: 基本 Access 插件

#### 用户输入

创建一个 Access 插件，用于存储第三方应用的授权信息并提供 API 接口。

#### 你的回答

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
      name: 'a-select', //基于antdv的输入组件
      vModel: 'value', // v-model绑定的属性名
      options: [
        //组件参数
        {
          label: 'API密钥（推荐）',
          value: 'apiKey',
        },
        {
          label: '账号密码',
          value: 'account',
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
      name: 'a-input',
      allowClear: true,
      placeholder: 'demoKeyId',
    },
    required: true,
  })
  demoKeyId = '';

  @AccessInput({
    title: '密钥', //标题
    required: true, //text组件可以省略
    encrypt: true, //该属性是否需要加密
  })
  demoKeySecret = '';

  @AccessInput({
    title: '测试',
    component: {
      name: 'api-test',
      action: 'TestRequest',
    },
    helper: '点击测试接口是否正常',
  })
  testRequest = true;

  /**
   * 会通过上面的testRequest参数在ui界面上生成测试按钮，供用户测试接口调用是否正常
   */
  async onTestRequest() {
    await this.GetDomainList({});
    return 'ok';
  }

  /**
   * api接口示例 获取域名列表
   */
  async GetDomainList(req: PageSearch): Promise<PageRes<DomainRecord>> {
    //输出日志必须使用ctx.logger
    this.ctx.logger.info(`获取域名列表，req:${JSON.stringify(req)}`);
    const pager = new Pager(req);
    const resp = await this.doRequest({
      action: 'ListDomains',
      data: {
        domain: req.searchKey,
        offset: pager.getOffset(),
        limit: pager.pageSize,
      },
    });
    const total = resp?.TotalCount || 0;
    let list = resp?.DomainList?.map(item => {
      item.domain = item.Domain;
      item.id = item.DomainId;
      return item;
    });
    return {
      total,
      list,
    };
  }

  /**
   * 通用api调用方法, 具体如何构造请求体，需参考对应应用的API文档
   */
  async doRequest(req: { action: string; data?: any }) {
    const res = await this.ctx.http.request({
      url: 'https://api.demo.cn/api/',
      method: 'POST',
      data: {
        Action: req.action,
        Body: req.data,
      },
    });

    if (res.Code !== 0) {
      //异常处理
      throw new Error(res.Message || '请求失败');
    }
    return res.Resp;
  }
}
```

### 示例 2: 支持 OAuth 授权的 Access 插件

#### 用户输入

创建一个支持 OAuth 授权方式的 Access 插件。

#### 你的回答

```typescript
import { AccessInput, BaseAccess, IsAccess, Pager, PageRes, PageSearch } from '@certd/pipeline';
import { DomainRecord } from '@certd/plugin-lib';

/**
 * OAuth 授权插件示例
 */
@IsAccess({
  name: 'oauth-demo',
  title: 'OAuth授权插件示例',
  icon: 'clarity:plugin-line',
  desc: '这是一个支持OAuth授权的插件示例',
})
export class OAuthDemoAccess extends BaseAccess {
  @AccessInput({
    title: '授权方式',
    value: 'oauth',
    component: {
      name: 'a-select',
      vModel: 'value',
      options: [
        {
          label: 'OAuth授权',
          value: 'oauth',
        },
        {
          label: 'API密钥',
          value: 'apiKey',
        },
      ],
    },
    required: true,
  })
  authType = '';

  @AccessInput({
    title: '客户端ID',
    component: {
      name: 'a-input',
      placeholder: 'Client ID',
    },
    required: true,
  })
  clientId = '';

  @AccessInput({
    title: '客户端密钥',
    required: true,
    encrypt: true,
  })
  clientSecret = '';

  @AccessInput({
    title: '授权回调地址',
    component: {
      name: 'a-input',
      placeholder: 'https://your-domain.com/callback',
    },
    required: true,
  })
  redirectUri = '';

  @AccessInput({
    title: 'AccessToken',
    required: true,
    encrypt: true,
  })
  accessToken = '';

  @AccessInput({
    title: 'RefreshToken',
    encrypt: true,
  })
  refreshToken = '';

  @AccessInput({
    title: '测试',
    component: {
      name: 'api-test',
      action: 'TestOAuth',
    },
    helper: '点击测试OAuth授权是否正常',
  })
  testOAuth = true;

  /**
   * 测试OAuth授权
   */
  async onTestOAuth() {
    try {
      // 测试AccessToken是否有效
      const result = await this.doOAuthRequest('GET', '/api/user/profile');
      this.ctx.logger.info('OAuth测试成功:', result);
      return 'OAuth授权测试成功';
    } catch (error) {
      this.ctx.logger.error('OAuth测试失败:', error);
      throw new Error('OAuth授权测试失败');
    }
  }

  /**
   * OAuth API请求方法
   */
  async doOAuthRequest(method: string, endpoint: string, data?: any) {
    const res = await this.ctx.http.request({
      url: `https://api.oauth-demo.com${endpoint}`,
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      data,
    });

    if (res.status !== 200) {
      throw new Error(`API请求失败: ${res.status} ${res.statusText}`);
    }
    return res.data;
  }

  /**
   * 刷新AccessToken
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('没有提供RefreshToken');
    }

    const res = await this.ctx.http.request({
      url: 'https://api.oauth-demo.com/oauth/token',
      method: 'POST',
      data: {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      },
    });

    if (res.status === 200 && res.data.access_token) {
      this.accessToken = res.data.access_token;
      if (res.data.refresh_token) {
        this.refreshToken = res.data.refresh_token;
      }
      return true;
    }
    throw new Error('刷新AccessToken失败');
  }

  /**
   * 获取域名列表
   */
  async GetDomainList(req: PageSearch): Promise<PageRes<DomainRecord>> {
    try {
      const res = await this.doOAuthRequest('GET', '/api/domains', {
        search: req.searchKey,
        page: req.page,
        pageSize: req.pageSize,
      });

      return {
        total: res.total,
        list: res.items.map((item: any) => ({
          id: item.id,
          domain: item.domain,
        })),
      };
    } catch (error) {
      // 尝试刷新AccessToken并重试
      if (error.message.includes('401')) {
        await this.refreshAccessToken();
        const res = await this.doOAuthRequest('GET', '/api/domains', {
          search: req.searchKey,
          page: req.page,
          pageSize: req.pageSize,
        });

        return {
          total: res.total,
          list: res.items.map((item: any) => ({
            id: item.id,
            domain: item.domain,
          })),
        };
      }
      throw error;
    }
  }
}
```

## 注意事项

1. **插件命名**：插件名称应简洁明了，反映其功能。
2. **属性加密**：对于敏感信息（如密钥），应设置 `encrypt: true`。
3. **日志输出**：必须使用 `this.ctx.logger` 输出日志，而不是 `console`，参数文本化，不要传对象，否则会输出`[object Object]}`。
4. **错误处理**：API 调用失败时应抛出明确的错误信息。
5. **测试方法**：实现 `onTestRequest` 方法，以便用户可以测试授权是否正常。
6. **统一接口调用**：封装统一的 API 请求方法，避免重复编写错误处理逻辑。

## 开发技巧

### 实现统一的 API 请求封装

**好处：**

- **代码复用**：避免在每个 API 方法中重复编写相同的 header 设置和错误处理逻辑
- **错误处理一致**：统一捕获和处理各种错误情况，确保错误信息格式统一
- **日志记录完善**：集中记录详细的错误信息，便于调试和问题排查
- **接口调用简化**：调用方只需关注业务逻辑，无需关心底层请求细节
- **易于维护**：统一修改 API 调用方式时，只需修改一处代码

```

```
