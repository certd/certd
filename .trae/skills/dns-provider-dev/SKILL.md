# DNS Provider 插件开发技能

## 什么是 DNS Provider 插件

DNS Provider 插件是 Certd 系统中的 DNS 提供商插件，它用于在 ACME 申请证书时给域名添加 TXT 解析记录，以验证域名所有权。

## 开发步骤

### 1. 导入必要的依赖

```typescript
import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from '@certd/plugin-cert';
import { DemoAccess } from './access.js';
import { isDev } from '../../utils/env.js';
```

### 2. 定义记录数据结构

```typescript
type DemoRecord = {
  // 这里定义 Record 记录的数据结构，跟对应云平台接口返回值一样即可，一般是拿到 id 就行，用于删除 txt 解析记录，清理申请痕迹
  // id:string
};
```

### 3. 使用 @IsDnsProvider 注解注册插件

```typescript
// 这里通过 IsDnsProvider 注册一个 dnsProvider
@IsDnsProvider({
  name: 'demo', // 插件唯一标识
  title: 'Dns提供商Demo', // 插件标题
  desc: 'dns provider示例', // 插件描述
  icon: 'clarity:plugin-line', // 插件图标
  // 这里是对应的云平台的 access 类型名称
  accessType: 'demo',
  order: 99, // 排序
})
export class DemoDnsProvider extends AbstractDnsProvider<DemoRecord> {
  access!: DemoAccess;

  async onInstance() {
    this.access = this.ctx.access as DemoAccess;
    // 也可以通过 ctx 成员变量传递 context
    this.logger.debug('access', this.access);
    // 初始化的操作
    // ...
  }

  // 插件实现...
}
```

### 4. 实现 createRecord 方法

```typescript
/**
 * 创建 dns 解析记录，用于验证域名所有权
 */
async createRecord(options: CreateRecordOptions): Promise<any> {
  /**
   * options 参数说明
   * fullRecord: '_acme-challenge.example.com',
   * value: 一串 uuid
   * type: 'TXT',
   * domain: 'example.com'
   */
  const { fullRecord, value, type, domain } = options;
  this.logger.info('添加域名解析：', fullRecord, value, type, domain);

  // 调用创建 dns 解析记录的对应的云端接口，创建 txt 类型的 dns 解析记录
  // 请根据实际接口情况调用，例如：
  // const createDnsRecordUrl = "xxx"
  // const record = this.http.post(createDnsRecordUrl,{
  //   // 授权参数
  //   // 创建 dns 解析记录的参数
  // })
  // // 返回本次创建的 dns 解析记录，这个记录会在删除的时候用到
  // return record
}
```

### 5. 实现 removeRecord 方法

```typescript
/**
 *  删除 dns 解析记录,清理申请痕迹
 * @param options
 */
async removeRecord(options: RemoveRecordOptions<DemoRecord>): Promise<void> {
  const { fullRecord, value, domain } = options.recordReq;
  const record = options.recordRes;
  this.logger.info('删除域名解析：', domain, fullRecord, value, record);
  // 这里调用删除 txt dns 解析记录接口
  // 请根据实际接口情况调用，例如：

  // const deleteDnsRecordUrl = "xxx"
  // const res = this.http.delete(deleteDnsRecordUrl,{
  //   // 授权参数
  //   // 删除 dns 解析记录的参数
  // })


  this.logger.info('删除域名解析成功:', fullRecord, value);
}
```

### 6. 实现 getDomainListPage 方法
```typescript
  /**
   * 实现获取域名列表
   */
  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const pager = new Pager(req);
    const res = await this.http.request({
      // 请求接口获取域名列表
    })
    const list = res.Domains?.map(item => ({
      id: item.Id,
      domain: item.DomainName,
    })) || []

    return {
      list,
      total: res.Total,
    }
  }
```

### 6. 实例化插件

```typescript
// 实例化这个 provider，将其自动注册到系统中
if (isDev()) {
  // 你的实现 要去掉这个 if，不然生产环境将不会显示
  new DemoDnsProvider();
}
```

## 注意事项

1. **插件命名**：插件名称应简洁明了，反映其功能。
2. **accessType**：必须指定对应的云平台的 access 类型名称。
3. **记录结构**：定义适合对应云平台的记录数据结构，至少包含 id 字段用于删除记录。
4. **日志输出**：使用 `this.logger` 输出日志，而不是 `console`。
5. **错误处理**：API 调用失败时应抛出明确的错误信息。
6. **实例化**：生产环境中应移除 `if (isDev())` 条件，确保插件在生产环境中也能被注册。

## 完整示例

### 示例：通用 DNS Provider

```typescript
import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from '@certd/plugin-cert';
import { DemoAccess } from './access.js';
import { isDev } from '../../utils/env.js';

type DemoRecord = {
  // 这里定义 Record 记录的数据结构，跟对应云平台接口返回值一样即可，一般是拿到 id 就行，用于删除 txt 解析记录，清理申请痕迹
  // id:string
};

// 这里通过 IsDnsProvider 注册一个 dnsProvider
@IsDnsProvider({
  name: 'demo',
  title: 'Dns提供商Demo',
  desc: 'dns provider示例',
  icon: 'clarity:plugin-line',
  // 这里是对应的云平台的 access 类型名称
  accessType: 'demo',
  order: 99,
})
export class DemoDnsProvider extends AbstractDnsProvider<DemoRecord> {
  access!: DemoAccess;

  async onInstance() {
    this.access = this.ctx.access as DemoAccess;
    // 也可以通过 ctx 成员变量传递 context
    this.logger.debug('access', this.access);
    // 初始化的操作
    // ...
  }

  /**
   * 创建 dns 解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions): Promise<any> {
    /**
     * options 参数说明
     * fullRecord: '_acme-challenge.example.com',
     * value: 一串 uuid
     * type: 'TXT',
     * domain: 'example.com'
     */
    const { fullRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, type, domain);

    // 调用创建 dns 解析记录的对应的云端接口，创建 txt 类型的 dns 解析记录
    // 请根据实际接口情况调用，例如：
    // const createDnsRecordUrl = "xxx"
    // const record = this.http.post(createDnsRecordUrl,{
    //   // 授权参数
    //   // 创建 dns 解析记录的参数
    // })
    // // 返回本次创建的 dns 解析记录，这个记录会在删除的时候用到
    // return record
  }

  /**
   *  删除 dns 解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(options: RemoveRecordOptions<DemoRecord>): Promise<void> {
    const { fullRecord, value, domain } = options.recordReq;
    const record = options.recordRes;
    this.logger.info('删除域名解析：', domain, fullRecord, value, record);
    // 这里调用删除 txt dns 解析记录接口
    // 请根据实际接口情况调用，例如：

    // const deleteDnsRecordUrl = "xxx"
    // const res = this.http.delete(deleteDnsRecordUrl,{
    //   // 授权参数
    //   // 删除 dns 解析记录的参数
    // })


    this.logger.info('删除域名解析成功:', fullRecord, value);
  }

  /**
   * 实现获取域名列表
   */
  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const pager = new Pager(req);
    const res = await this.http.request({
      // 请求接口获取域名列表
    })
    const list = res.Domains?.map(item => ({
      id: item.Id,
      domain: item.DomainName,
    })) || []

    return {
      list,
      total: res.Total,
    }
  }
}

// 实例化这个 provider，将其自动注册到系统中
new DemoDnsProvider();

```