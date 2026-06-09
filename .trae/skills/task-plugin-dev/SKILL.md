---
name: task-plugin-dev
description: 用于开发 Certd 系统中的 Task 插件，继承自 AbstractTaskPlugin 类，被流水线调用 execute 方法将证书部署到对应的应用上。当用户需要创建任务插件、部署证书、自动化任务或修改现有 Task 插件时触发。
version: 1.0.0
---

# Task 插件开发技能

## 角色定义

你是一名 Certd 插件开发专家，擅长创建和实现 Task 类型的插件，熟悉 TypeScript 编程和 Certd 插件开发规范。

## 核心指令

请严格按照以下步骤执行任务：

1. **导入必要的依赖**

   - 导入 `AbstractTaskPlugin`, `IsTaskPlugin`, `PageSearch`, `pluginGroups`, `RunStrategy`, `TaskInput` 等必要的类型和装饰器
   - 导入 `CertInfo`, `CertReader` 等证书相关类型
   - 导入 `createCertDomainGetterInputDefine`, `createRemoteSelectInputDefine` 等工具函数
   - 导入 `optionsUtils` 等辅助工具
   - 导入 `CertApplyPluginNames` 等常量

2. **使用 @IsTaskPlugin 注解注册插件**

   - 配置插件的唯一标识、标题、图标
   - 设置插件分组
   - 配置默认策略（如 `SkipWhenSucceed`）
   - 确保类名与插件名称一致

3. **定义任务输入参数**

   - 使用 `@TaskInput` 注解定义各种输入参数
   - 必须包含证书选择参数，用于获取前置任务输出的域名证书
   - 可以添加授权选择框、文本输入、选择框等参数
   - 使用 `createCertDomainGetterInputDefine` 获取证书域名列表

4. **实现动态显隐配置**

   - 使用 `mergeScript` 实现根据其他输入值动态控制输入项的显隐状态
   - 利用 `ctx.compute` 函数访问表单中的其他字段值

5. **实现插件方法**

   - **onInstance 方法**：插件实例化时执行的初始化操作
   - **execute 方法**：插件的核心执行逻辑
     - 获取授权信息
     - 读取证书信息
     - 执行具体的部署逻辑
     - 处理错误并记录日志
     - 实现幂等性：确保重复执行不会导致问题
     - 实现超时处理：设置合理的超时时间
     - 实现回滚机制：在部署失败时能够回滚到之前的状态
   - **后端获取选项方法**：用于前端从后端获取选项的方法

6. **遵循开发最佳实践**
   - 插件命名：遵循命名规范，大写字母开头，驼峰命名
   - 类名规范：类名应与插件名称一致
   - 日志输出：使用 `this.logger` 输出日志
   - 错误处理：捕获并记录执行过程中的错误
   - 授权获取：使用 `this.getAccess(accessId)` 获取授权信息

## 输出规范

- 必须包含完整的插件实现代码
- 代码必须包含详细的注释说明
- 提供完整的示例代码，展示插件的使用方法
- 包含开发注意事项和最佳实践

## 示例

### 示例 1: 基本 Task 插件

#### 用户输入

创建一个 Task 插件，用于将证书部署到对应的应用上。

#### 你的回答

```typescript
import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { CertInfo, CertReader } from '@certd/plugin-cert';
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from '@certd/plugin-lib';
import { optionsUtils } from '@certd/basic';
import { CertApplyPluginNames } from '@certd/plugin-cert';

@IsTaskPlugin({
  //命名规范，插件类型+功能，大写字母开头，驼峰命名
  name: 'DemoTest',
  title: 'Demo-测试插件',
  icon: 'clarity:plugin-line',
  //插件分组
  group: pluginGroups.other.key,
  default: {
    //默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
//类名规范，跟上面插件名称（name）一致
export class DemoTest extends AbstractTaskPlugin {
  //测试参数
  @TaskInput({
    title: '属性示例',
    value: '默认值',
    component: {
      //前端组件配置，具体配置见组件文档 https://www.antdv.com/components/input-cn
      name: 'a-input',
      vModel: 'value', //双向绑定组件的props名称
    },
    helper: '帮助说明,[链接](https://certd.docmirror.cn)',
    required: false, //是否必填
  })
  text!: string;

  //测试参数
  @TaskInput({
    title: '选择框',
    component: {
      //前端组件配置，具体配置见组件文档 https://www.antdv.com/components/select-cn
      name: 'a-auto-complete',
      vModel: 'value',
      options: [
        //选项列表
        { label: '动态显', value: 'show' },
        { label: '动态隐', value: 'hide' },
      ],
    },
  })
  select!: string;

  @TaskInput({
    title: '动态显隐',
    helper: '我会根据选择框的值进行显隐',
    show: true, //动态计算的值会覆盖它
    //动态计算脚本， mergeScript返回的对象会合并当前配置
    mergeScript: `
    return {
      show: ctx.compute(({form})=>{
        return form.select === 'show';
      })
    }
    `,
  })
  showText!: string;

  //测试参数
  @TaskInput({
    title: '多选框',
    component: {
      //前端组件配置，具体配置见组件文档 https://www.antdv.com/components/select-cn
      name: 'a-select',
      vModel: 'value',
      mode: 'tags',
      multiple: true,
      options: [
        { value: '1', label: '选项1' },
        { value: '2', label: '选项2' },
      ],
    },
  })
  multiSelect!: string;

  //测试参数
  @TaskInput({
    title: 'switch',
    component: {
      //前端组件配置，具体配置见组件文档 https://www.antdv.com/components/switch-cn
      name: 'a-switch',
      vModel: 'checked',
    },
  })
  switch!: boolean;

  //证书选择，此项必须要有
  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames],
    },
    // required: true, // 必填
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  //前端可以展示，当前申请的证书域名列表
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: 'demo授权',
    helper: 'demoAccess授权',
    component: {
      name: 'access-selector',
      type: 'demo', //固定授权类型
    },
    // rules: [{ required: true, message: '此项必填' }],
    // required: true, //必填
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: '从后端获取选项',
      helper: '选择时可以从后端获取选项',
      action: DemoTest.prototype.onGetSiteList.name,
      //当以下参数变化时，触发获取选项
      watches: ['certDomains', 'accessId'],
      required: true,
    })
  )
  siteName!: string | string[];

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<void> {
    const { select, text, cert, accessId } = this;

    try {
      const access = await this.getAccess(accessId);
      this.logger.debug('access', access);
    } catch (e) {
      this.logger.error('获取授权失败', e);
    }

    try {
      const certReader = new CertReader(cert);
      this.logger.debug('certReader', certReader);
    } catch (e) {
      this.logger.error('读取crt失败', e);
    }

    this.logger.info('DemoTestPlugin execute');
    this.logger.info('text:', text);
    this.logger.info('select:', select);
    this.logger.info('switch:', this.switch);
    this.logger.info('授权id:', accessId);

    // 具体的部署逻辑
    // const res = await this.http.request({
    //   url: 'https://api.demo.com',
    //   method: 'GET',
    // });
    // if (res.code !== 0) {
    //   //检查res是否报错,你需要抛异常，来结束插件执行，否则会判定为执行成功，下次执行时会跳过本任务
    //   throw new Error(res.message);
    // }
    // this.logger.info('部署成功:', res);
  }

  //此方法演示，如何让前端在添加插件时可以从后端获取选项，这里是后端返回选项的方法
  async onGetSiteList(req: PageSearch) {
    if (!this.accessId) {
      throw new Error('请选择Access授权');
    }

    // @ts-ignore
    const access = await this.getAccess(this.accessId);

    // const siteRes = await access.GetDomainList(req);
    //以下是模拟数据
    const siteRes = [
      { id: 1, siteName: 'site1.com' },
      { id: 2, siteName: 'site2.com' },
      { id: 3, siteName: 'site2.com' },
    ];
    //转换为前端所需要的格式
    const options = siteRes.map((item: any) => {
      return {
        value: item.siteName,
        label: item.siteName,
        domain: item.siteName,
      };
    });
    //将站点域名名称根据证书域名进行匹配分组，分成匹配的和不匹配的两组选项，返回给前端，供用户选择
    return {
      list: optionsUtils.buildGroupOptions(options, this.certDomains),
      total: siteRes.length,
    };
  }
}
```

### 示例 2: Nginx 部署 Task 插件

#### 用户输入

创建一个 Task 插件，用于将证书部署到 Nginx 服务器上。

#### 你的回答

```typescript
import { AbstractTaskPlugin, CertInfo, IsTaskPlugin, TaskInput, pluginGroups, RunStrategy } from '@certd/pipeline';
import { CertReader } from '@certd/plugin-lib';

/**
 * Nginx 证书部署插件
 */
@IsTaskPlugin({
  name: 'NginxDeploy',
  title: 'Nginx 部署',
  desc: '将证书部署到 Nginx 服务器上',
  icon: 'clarity:server-line',
  group: pluginGroups.deploy.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class NginxDeploy extends AbstractTaskPlugin {
  /**
   * 服务器授权
   */
  @TaskInput({
    title: '服务器授权',
    component: {
      name: 'access-selector',
      vModel: 'accessId',
      accessTypes: ['ssh'],
      placeholder: '请选择服务器授权',
    },
    required: true,
  })
  accessId = '';

  /**
   * 域名证书
   */
  @TaskInput({
    title: '域名证书',
    component: {
      name: 'output-selector',
      from: ['CertApply', 'CertApplyCloudflare'],
      field: 'cert',
    },
    required: true,
  })
  cert!: CertInfo;

  /**
   * 证书路径
   */
  @TaskInput({
    title: '证书路径',
    value: '/etc/nginx/ssl',
    component: {
      name: 'a-input',
      placeholder: '请输入证书存储路径',
    },
    required: true,
  })
  certPath = '';

  /**
   * Nginx 配置文件路径
   */
  @TaskInput({
    title: 'Nginx 配置文件',
    value: '/etc/nginx/conf.d',
    component: {
      name: 'a-input',
      placeholder: '请输入 Nginx 配置文件路径',
    },
    required: true,
  })
  nginxConfPath = '';

  /**
   * 服务名称
   */
  @TaskInput({
    title: '服务名称',
    component: {
      name: 'a-input',
      placeholder: '请输入服务名称（用于生成配置文件）',
    },
    required: true,
  })
  serviceName = '';

  /**
   * 执行部署
   */
  async execute(): Promise<void> {
    this.logger.info('开始部署证书到 Nginx');

    try {
      // 1. 获取服务器授权
      const sshAccess = await this.getAccess(this.accessId);
      this.logger.info('获取服务器授权成功');

      // 2. 读取证书信息
      const certReader = new CertReader(this.cert);
      const cert = certReader.getCert();
      const key = certReader.getKey();
      const fullchain = certReader.getFullChain();
      this.logger.info('读取证书信息成功');

      // 3. 准备部署路径
      const certFile = `${this.certPath}/${this.serviceName}.pem`;
      const keyFile = `${this.certPath}/${this.serviceName}.key`;
      const confFile = `${this.nginxConfPath}/${this.serviceName}.conf`;

      // 4. 创建证书目录
      await sshAccess.exec(`mkdir -p ${this.certPath}`);
      this.logger.info('创建证书目录成功');

      // 5. 上传证书文件
      await sshAccess.uploadContent(cert, certFile);
      await sshAccess.uploadContent(key, keyFile);
      await sshAccess.uploadContent(fullchain, `${this.certPath}/${this.serviceName}-fullchain.pem`);
      this.logger.info('上传证书文件成功');

      // 6. 生成 Nginx 配置
      const nginxConf = `server {
    listen 443 ssl;
    server_name ${this.cert.domains.join(' ')};

    ssl_certificate ${certFile};
    ssl_certificate_key ${keyFile};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
`;

      // 7. 上传 Nginx 配置
      await sshAccess.uploadContent(nginxConf, confFile);
      this.logger.info('上传 Nginx 配置成功');

      // 8. 测试 Nginx 配置
      const testResult = await sshAccess.exec('nginx -t');
      if (testResult.includes('test is successful')) {
        this.logger.info('Nginx 配置测试成功');
      } else {
        throw new Error(`Nginx 配置测试失败: ${testResult}`);
      }

      // 9. 重启 Nginx 服务
      await sshAccess.exec('systemctl reload nginx');
      this.logger.info('重启 Nginx 服务成功');

      this.logger.info('证书部署到 Nginx 成功');
    } catch (error) {
      this.logger.error('部署失败:', error);
      throw new Error(`部署到 Nginx 失败: ${error.message}`);
    }
  }
}

// 实例化插件
new NginxDeploy();
```

### 示例 3: 阿里云 OSS 部署 Task 插件

#### 用户输入

创建一个 Task 插件，用于将证书部署到阿里云 OSS 上。

#### 你的回答

```typescript
import { AbstractTaskPlugin, CertInfo, IsTaskPlugin, TaskInput, pluginGroups, RunStrategy } from '@certd/pipeline';
import { CertReader } from '@certd/plugin-lib';

/**
 * 阿里云 OSS 证书部署插件
 */
@IsTaskPlugin({
  name: 'AliyunOSSDeploy',
  title: '阿里云 OSS 部署',
  desc: '将证书部署到阿里云 OSS 存储上',
  icon: 'clarity:cloud-line',
  group: pluginGroups.deploy.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class AliyunOSSDeploy extends AbstractTaskPlugin {
  /**
   * 阿里云授权
   */
  @TaskInput({
    title: '阿里云授权',
    component: {
      name: 'access-selector',
      vModel: 'accessId',
      accessTypes: ['aliyun'],
      placeholder: '请选择阿里云授权',
    },
    required: true,
  })
  accessId = '';

  /**
   * 域名证书
   */
  @TaskInput({
    title: '域名证书',
    component: {
      name: 'output-selector',
      from: ['CertApply', 'CertApplyCloudflare'],
      field: 'cert',
    },
    required: true,
  })
  cert!: CertInfo;

  /**
   * OSS 存储桶
   */
  @TaskInput({
    title: 'OSS 存储桶',
    component: {
      name: 'a-input',
      placeholder: '请输入 OSS 存储桶名称',
    },
    required: true,
  })
  bucketName = '';

  /**
   * 存储路径
   */
  @TaskInput({
    title: '存储路径',
    value: 'ssl/',
    component: {
      name: 'a-input',
      placeholder: '请输入证书存储路径',
    },
  })
  storagePath = '';

  /**
   * 执行部署
   */
  async execute(): Promise<void> {
    this.logger.info('开始部署证书到阿里云 OSS');

    try {
      // 1. 获取阿里云授权
      const aliyunAccess = await this.getAccess(this.accessId);
      this.logger.info('获取阿里云授权成功');

      // 2. 读取证书信息
      const certReader = new CertReader(this.cert);
      const cert = certReader.getCert();
      const key = certReader.getKey();
      const fullchain = certReader.getFullChain();
      this.logger.info('读取证书信息成功');

      // 3. 准备存储路径
      const basePath = this.storagePath.endsWith('/') ? this.storagePath : `${this.storagePath}/`;
      const certFileName = `${basePath}${this.cert.domains[0]}.pem`;
      const keyFileName = `${basePath}${this.cert.domains[0]}.key`;
      const fullchainFileName = `${basePath}${this.cert.domains[0]}-fullchain.pem`;

      // 4. 上传证书到 OSS
      await aliyunAccess.uploadToOSS({
        bucket: this.bucketName,
        key: certFileName,
        content: cert,
      });
      this.logger.info('上传证书文件成功');

      await aliyunAccess.uploadToOSS({
        bucket: this.bucketName,
        key: keyFileName,
        content: key,
      });
      this.logger.info('上传私钥文件成功');

      await aliyunAccess.uploadToOSS({
        bucket: this.bucketName,
        key: fullchainFileName,
        content: fullchain,
      });
      this.logger.info('上传完整证书链成功');

      // 5. 设置文件访问权限（可选）
      await aliyunAccess.setOSSObjectAcl({
        bucket: this.bucketName,
        key: certFileName,
        acl: 'private',
      });

      await aliyunAccess.setOSSObjectAcl({
        bucket: this.bucketName,
        key: keyFileName,
        acl: 'private',
      });

      await aliyunAccess.setOSSObjectAcl({
        bucket: this.bucketName,
        key: fullchainFileName,
        acl: 'private',
      });
      this.logger.info('设置文件访问权限成功');

      this.logger.info('证书部署到阿里云 OSS 成功');
    } catch (error) {
      this.logger.error('部署失败:', error);
      throw new Error(`部署到阿里云 OSS 失败: ${error.message}`);
    }
  }
}

// 实例化插件
new AliyunOSSDeploy();
```

## 注意事项

1. **插件命名**：插件名称应遵循命名规范，大写字母开头，驼峰命名。
2. **类名规范**：类名应与插件名称（name）一致。
3. **证书选择**：必须包含证书选择参数，用于获取前置任务输出的域名证书。
4. **日志输出**：使用 `this.logger` 输出日志，而不是 `console`，参数文本化，不要传对象，否则会输出`[object Object]}`。
5. **错误处理**：执行过程中的错误应被捕获并记录。
6. **授权获取**：使用 `this.getAccess(accessId)` 获取授权信息。

## 部署逻辑注意事项

1. **部署接口逻辑**：

   - 研究应用的部署接口逻辑，一般有两种：
     a. 用户选择网站ID，给网站部署新证书
     b. 用户选择证书ID，只需要更新证书即可
   - 保证多次执行都能针对同一个对象部署证书
   - 确保出错后重新运行能够回归到正常状态

2. **前置证书选择**：

   - 前置证书可以是原始的 `certInfo` 类型，也可能是上传到平台之后返回的证书id
   - 根据接口要求选择合适的证书类型：
     a. 如果接口需要上传后的证书id，那么部署时要先将证书上传，再部署
     b. 如果接口需要原始的 `certInfo` 类型，那么直接使用 `certInfo` 部署证书
     c. 当两者都支持时，判断用户选择的证书类型，再考虑优先上传再部署

3. **证书清理**：
   - 如果是先上传再部署的，那么在部署完成后，可能需要考虑清理证书

```

```
