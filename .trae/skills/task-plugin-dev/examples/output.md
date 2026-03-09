# Task 插件开发指南

## 开发步骤

### 1. 导入必要的依赖

```typescript
import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { CertInfo, CertReader } from '@certd/plugin-cert';
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from '@certd/plugin-lib';
import { optionsUtils } from '@certd/basic';
import { CertApplyPluginNames} from '@certd/plugin-cert';
```

### 2. 使用 @IsTaskPlugin 注解注册插件

```typescript
@IsTaskPlugin({
  // 命名规范，插件类型+功能，大写字母开头，驼峰命名
  name: 'DemoTest',
  title: 'Demo-测试插件', // 插件标题
  icon: 'clarity:plugin-line', // 插件图标
  // 插件分组
  group: pluginGroups.other.key,
  default: {
    // 默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
// 类名规范，跟上面插件名称（name）一致
export class DemoTest extends AbstractTaskPlugin {
  // 插件实现...
}
```

### 3. 定义任务输入参数

使用 `@TaskInput` 注解定义任务输入参数：

```typescript
// 测试参数
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
```

### 4. 实现插件方法

```typescript
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
  // ...
}
```

## 注意事项

1. **插件命名**：插件名称应遵循命名规范，大写字母开头，驼峰命名。
2. **类名规范**：类名应与插件名称（name）一致。
3. **证书选择**：必须包含证书选择参数，用于获取前置任务输出的域名证书。
4. **日志输出**：使用 `this.logger` 输出日志，而不是 `console`。
5. **错误处理**：执行过程中的错误应被捕获并记录。
6. **授权获取**：使用 `this.getAccess(accessId)` 获取授权信息。