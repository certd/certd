---
name: dns-provider-dev
description: 用于开发 Certd 系统中的 DNS Provider 插件，在 ACME 申请证书时给域名添加 TXT 解析记录以验证域名所有权。当用户需要创建DNS提供商插件、实现DNS解析、ACME证书验证或修改现有 DNS Provider 插件时触发。
version: 1.0.0
---

# DNS Provider 插件开发技能

## 角色定义
你是一名 Certd 插件开发专家，擅长创建和实现 DNS Provider 类型的插件，熟悉 TypeScript 编程和 Certd 插件开发规范。

## 核心指令
请严格按照以下步骤执行任务：

1. **导入必要的依赖**
   - 导入 `AbstractDnsProvider`, `CreateRecordOptions`, `IsDnsProvider`, `RemoveRecordOptions` 等必要的类型和装饰器
   - 导入对应的 Access 插件类型

2. **定义记录数据结构**
   - 定义适合对应云平台的记录数据结构
   - 至少包含 id 字段，用于后续删除记录

3. **使用 @IsDnsProvider 注解注册插件**
   - 配置插件的唯一标识、标题、描述、图标
   - 指定对应的云平台的 access 类型名称
   - 设置排序值（可选）
   - 继承 `AbstractDnsProvider` 类

4. **实现 onInstance 方法**
   - 获取并保存对应的 Access 实例
   - 执行初始化操作

5. **实现 createRecord 方法**
   - 解析传入的参数（fullRecord, value, type, domain）
   - 记录操作开始日志
   - 调用云平台 API 创建 TXT 类型的 DNS 解析记录
   - 处理可能的错误：网络错误、API调用失败、授权失败等
   - 记录操作结果日志
   - 返回创建的记录信息，用于后续删除操作

6. **实现 removeRecord 方法**
   - 解析传入的参数和之前创建的记录信息
   - 记录操作开始日志
   - 调用云平台 API 删除 TXT 类型的 DNS 解析记录
   - 处理可能的错误：网络错误、API调用失败、记录不存在等
   - 记录操作结果日志

7. **实现 getDomainListPage 方法**
   - 实现获取域名列表的方法
   - 支持分页查询
   - 处理可能的错误：网络错误、API调用失败、授权失败等
   - 返回标准化的域名列表格式

8. **实例化插件**
   - 实例化插件，确保插件被注册

## 输出规范
- 必须包含完整的插件实现代码
- 代码必须包含详细的注释说明
- 提供完整的示例代码，展示插件的使用方法
- 包含开发注意事项

## 示例

### 示例 1: 基本 DNS Provider 插件

#### 用户输入
创建一个 DNS Provider 插件，用于在 ACME 申请证书时添加和删除 TXT 解析记录。

#### 你的回答

```typescript
import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions, PageSearch, PageRes, DomainRecord } from '@certd/plugin-cert';
import { DemoAccess } from './access.js';
import { Pager } from '@certd/pipeline';

type DemoRecord = {
  // 这里定义 Record 记录的数据结构，跟对应云平台接口返回值一样即可
  id: string;
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

    try {
      // 调用创建 dns 解析记录的对应的云端接口，创建 txt 类型的 dns 解析记录
      // 请根据实际接口情况调用，例如：
      // const createDnsRecordUrl = "xxx"
      // const record = this.http.post(createDnsRecordUrl,{
      //   // 授权参数
      //   // 创建 dns 解析记录的参数
      // })
      // // 返回本次创建的 dns 解析记录，这个记录会在删除的时候用到
      // return record
      
      // 模拟返回
      return { id: 'demo-record-id' };
    } catch (error) {
      this.logger.error('创建DNS记录失败:', error);
      throw new Error(`创建DNS记录失败: ${error.message}`);
    }
  }

  /**
   *  删除 dns 解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(options: RemoveRecordOptions<DemoRecord>): Promise<void> {
    const { fullRecord, value, domain } = options.recordReq;
    const record = options.recordRes;
    this.logger.info('删除域名解析：', domain, fullRecord, value, record);
    
    try {
      // 这里调用删除 txt dns 解析记录接口
      // 请根据实际接口情况调用，例如：
      // const deleteDnsRecordUrl = "xxx"
      // const res = this.http.delete(deleteDnsRecordUrl,{
      //   // 授权参数
      //   // 删除 dns 解析记录的参数
      // })
      
      this.logger.info('删除域名解析成功:', fullRecord, value);
    } catch (error) {
      this.logger.error('删除DNS记录失败:', error);
      // 即使删除失败也不抛出异常，避免影响整个证书申请流程
    }
  }

  /**
   * 实现获取域名列表
   */
  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    try {
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
      };
    } catch (error) {
      this.logger.error('获取域名列表失败:', error);
      return { list: [], total: 0 };
    }
  }
}

// 实例化这个 provider，将其自动注册到系统中
new DemoDnsProvider();
```

### 示例 2: 阿里云 DNS Provider 插件

#### 用户输入
创建一个阿里云 DNS Provider 插件，用于在 ACME 申请证书时添加和删除 TXT 解析记录。

#### 你的回答

```typescript
import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions, PageSearch, PageRes, DomainRecord } from '@certd/plugin-cert';
import { AliyunAccess } from './aliyun-access.js';
import { Pager } from '@certd/pipeline';

type AliyunRecord = {
  RecordId: string;
};

// 阿里云 DNS Provider 插件
@IsDnsProvider({
  name: 'aliyun',
  title: '阿里云DNS',
  desc: '阿里云DNS提供商插件',
  icon: 'clarity:plugin-line',
  accessType: 'aliyun',
  order: 10,
})
export class AliyunDnsProvider extends AbstractDnsProvider<AliyunRecord> {
  access!: AliyunAccess;

  async onInstance() {
    this.access = this.ctx.access as AliyunAccess;
    this.logger.debug('阿里云Access实例初始化成功');
  }

  /**
   * 创建 DNS 解析记录
   */
  async createRecord(options: CreateRecordOptions): Promise<AliyunRecord> {
    const { fullRecord, value, type, domain } = options;
    this.logger.info('阿里云DNS: 添加解析记录', { fullRecord, value, type, domain });

    try {
      // 提取主机记录
      const hostRecord = fullRecord.replace(`.${domain}`, '');
      
      // 调用阿里云 API 创建解析记录
      const response = await this.access.doRequest({
        action: 'AddDomainRecord',
        data: {
          DomainName: domain,
          RR: hostRecord,
          Type: type,
          Value: value,
          TTL: 600, // 10分钟
        }
      });

      this.logger.info('阿里云DNS: 解析记录创建成功', { RecordId: response.RecordId });
      return { RecordId: response.RecordId };
    } catch (error) {
      this.logger.error('阿里云DNS: 创建解析记录失败', error);
      throw new Error(`阿里云DNS创建解析记录失败: ${error.message}`);
    }
  }

  /**
   * 删除 DNS 解析记录
   */
  async removeRecord(options: RemoveRecordOptions<AliyunRecord>): Promise<void> {
    const { fullRecord, value, domain } = options.recordReq;
    const record = options.recordRes;
    this.logger.info('阿里云DNS: 删除解析记录', { fullRecord, value, domain, RecordId: record.RecordId });

    try {
      // 调用阿里云 API 删除解析记录
      await this.access.doRequest({
        action: 'DeleteDomainRecord',
        data: {
          RecordId: record.RecordId,
        }
      });

      this.logger.info('阿里云DNS: 解析记录删除成功', { RecordId: record.RecordId });
    } catch (error) {
      this.logger.error('阿里云DNS: 删除解析记录失败', error);
      // 即使删除失败也不抛出异常，避免影响整个证书申请流程
    }
  }

  /**
   * 获取域名列表
   */
  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    try {
      const pager = new Pager(req);
      const response = await this.access.doRequest({
        action: 'DescribeDomains',
        data: {
          PageNumber: pager.page,
          PageSize: pager.pageSize,
          KeyWord: req.searchKey,
        }
      });

      const list = response.Domains.Domain.map((domain: any) => ({
        id: domain.DomainId,
        domain: domain.DomainName,
      }));

      return {
        list,
        total: response.TotalCount,
      };
    } catch (error) {
      this.logger.error('阿里云DNS: 获取域名列表失败', error);
      return { list: [], total: 0 };
    }
  }
}

// 实例化插件
new AliyunDnsProvider();
```

### 示例 3: 腾讯云 DNS Provider 插件

#### 用户输入
创建一个腾讯云 DNS Provider 插件，用于在 ACME 申请证书时添加和删除 TXT 解析记录。

#### 你的回答

```typescript
import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions, PageSearch, PageRes, DomainRecord } from '@certd/plugin-cert';
import { TencentAccess } from './tencent-access.js';
import { Pager } from '@certd/pipeline';

type TencentRecord = {
  RecordId: string;
};

// 腾讯云 DNS Provider 插件
@IsDnsProvider({
  name: 'tencent',
  title: '腾讯云DNS',
  desc: '腾讯云DNS提供商插件',
  icon: 'clarity:plugin-line',
  accessType: 'tencent',
  order: 20,
})
export class TencentDnsProvider extends AbstractDnsProvider<TencentRecord> {
  access!: TencentAccess;

  async onInstance() {
    this.access = this.ctx.access as TencentAccess;
    this.logger.debug('腾讯云Access实例初始化成功');
  }

  /**
   * 创建 DNS 解析记录
   */
  async createRecord(options: CreateRecordOptions): Promise<TencentRecord> {
    const { fullRecord, value, type, domain } = options;
    this.logger.info('腾讯云DNS: 添加解析记录', { fullRecord, value, type, domain });

    try {
      // 提取主机记录
      const hostRecord = fullRecord.replace(`.${domain}`, '');
      
      // 调用腾讯云 API 创建解析记录
      const response = await this.access.doRequest({
        action: 'CreateRecord',
        data: {
          Domain: domain,
          SubDomain: hostRecord,
          RecordType: type,
          RecordValue: value,
          TTL: 600, // 10分钟
        }
      });

      this.logger.info('腾讯云DNS: 解析记录创建成功', { RecordId: response.RecordId });
      return { RecordId: response.RecordId };
    } catch (error) {
      this.logger.error('腾讯云DNS: 创建解析记录失败', error);
      throw new Error(`腾讯云DNS创建解析记录失败: ${error.message}`);
    }
  }

  /**
   * 删除 DNS 解析记录
   */
  async removeRecord(options: RemoveRecordOptions<TencentRecord>): Promise<void> {
    const { fullRecord, value, domain } = options.recordReq;
    const record = options.recordRes;
    this.logger.info('腾讯云DNS: 删除解析记录', { fullRecord, value, domain, RecordId: record.RecordId });

    try {
      // 调用腾讯云 API 删除解析记录
      await this.access.doRequest({
        action: 'DeleteRecord',
        data: {
          RecordId: record.RecordId,
        }
      });

      this.logger.info('腾讯云DNS: 解析记录删除成功', { RecordId: record.RecordId });
    } catch (error) {
      this.logger.error('腾讯云DNS: 删除解析记录失败', error);
      // 即使删除失败也不抛出异常，避免影响整个证书申请流程
    }
  }

  /**
   * 获取域名列表
   */
  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    try {
      const pager = new Pager(req);
      const response = await this.access.doRequest({
        action: 'DescribeDomains',
        data: {
          Offset: (pager.page - 1) * pager.pageSize,
          Limit: pager.pageSize,
          Keyword: req.searchKey,
        }
      });

      const list = response.Domains.map((domain: any) => ({
        id: domain.DomainId,
        domain: domain.DomainName,
      }));

      return {
        list,
        total: response.TotalCount,
      };
    } catch (error) {
      this.logger.error('腾讯云DNS: 获取域名列表失败', error);
      return { list: [], total: 0 };
    }
  }
}

// 实例化插件
new TencentDnsProvider();
```

## 注意事项

1. **插件命名**：插件名称应简洁明了，反映其功能。
2. **accessType**：必须指定对应的云平台的 access 类型名称。
3. **记录结构**：定义适合对应云平台的记录数据结构，至少包含 id 字段用于删除记录。
4. **日志输出**：使用 `this.logger` 输出日志，而不是 `console`，参数文本化，不要传对象，否则会输出`[object Object]}`。
5. **错误处理**：API 调用失败时应抛出明确的错误信息。