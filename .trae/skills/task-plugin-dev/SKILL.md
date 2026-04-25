# Task 插件开发技能

## 什么是 Task 插件

Task 插件是 Certd 系统中的部署任务插件，它继承自 `AbstractTaskPlugin` 类，被流水线调用 `execute` 方法，将证书部署到对应的应用上。

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
    // 前端组件配置，具体配置见组件文档 https://www.antdv.com/components/input-cn
    name: 'a-input',
    vModel: 'value', // 双向绑定组件的 props 名称
  },
  helper: '帮助说明,[链接](https://certd.docmirror.cn)',
  required: false, // 是否必填
})
text!: string;

// 证书选择，此项必须要有
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
// 前端可以展示，当前申请的证书域名列表
certDomains!: string[];

// 授权选择框
@TaskInput({
  title: 'demo授权',
  helper: 'demoAccess授权',
  component: {
    name: 'access-selector',
    vModel:"modelValue",
    type: "demo", // access类型，让用户固定选择这种类型的access
  },
  // rules: [{ required: true, message: '此项必填' }],
  // required: true, // 必填
})
accessId!: string;
```

### 4. 动态显隐配置（mergeScript）

使用 `mergeScript` 可以实现根据其他输入值动态控制当前输入项的显隐状态。

```typescript
@TaskInput({
  title: '匹配模式',
  component: {
    name: 'select',
    options: [
      { label: '手动选择', value: 'manual' },
      { label: '根据证书匹配', value: 'auto' },
    ],
  },
  default: 'manual',
})
domainMatchMode!: 'manual' | 'auto';

@TaskInput(
  createRemoteSelectInputDefine({
    title: 'DCDN加速域名',
    helper: '你在阿里云上配置的DCDN加速域名',
    action: DeployCertToAliyunDCDN.prototype.onGetDomainList.name,
    watches: ['certDomains', 'accessId'],
    required: true,
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return domainMatchMode === "manual"
        })
      }
    `,
  })
)
domainName!: string | string[];
```

`mergeScript` 中的 `ctx.compute` 函数接收一个回调函数，通过 `form` 参数可以访问表单中的其他字段值。

### 5. 实现插件方法

#### 5.1 插件实例化时执行的方法

```typescript
// 插件实例化时执行的方法
async onInstance() {}
```

#### 5.2 插件执行方法

  1. 开始写代码之前，需要先研究应用的部署接口逻辑, 一般有两种
    a 用户选择网站ID，给网站部署新证书
    b 用户选择证书ID，只需要更新证书即可
    无论哪一种都要保证多次执行都能针对同一个对象部署证书，出错后重新运行能够回归到正常状态
    反例： 比如根据证书id=1进行更新，结果证书部署完成之后，证书id变成了2，那么再次运行插件，插件的输出参数仍然是1，就无法达到持续更更新证书的目的。
    这部分逻辑每一步都需要明确的接口文档支撑，不能依赖于经验

  2. 前置证书选择
    a. 前置证书可以选择原始的certInfo类型，也有可能是上传到平台之后返回的证书id，比如阿里的CAS证书id，部署时要区分这两者
    b. 如果接口需要上传后的证书id，那么部署时要先将证书上传，再部署
    c. 如果接口需要原始的certInfo类型，那么直接使用certInfo部署证书
    d. 当两者都支持时，判断用户选择的证书类型，再考虑优先上传再部署

  3. 证书清理
    a. 如果是先上传再部署的，那么在部署完成后，可能需要考虑清理证书
    

```typescript
// 插件执行方法
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
 
}
```

#### 5.3 后端获取选项方法

使用 `createRemoteSelectInputDefine` 创建远程选择输入项，`action` 指向的方法接收 `PageSearch` 参数并返回 `{ list, total }` 格式。

```typescript
@TaskInput(
  createRemoteSelectInputDefine({
    title: '从后端获取选项',
    helper: '选择时可以从后端获取选项',
    action: DemoTest.prototype.onGetSiteList.name,
    // 当以下参数变化时，触发获取选项
    watches: ['certDomains', 'accessId'],
    required: true,
  })
)
siteName!: string | string[];

// 从后端获取选项的方法，接收PageSearch参数
async onGetSiteList(data: PageSearch) {
  if (!this.accessId) {
    throw new Error('请选择Access授权');
  }

  // @ts-ignore
  const access = await this.getAccess(this.accessId);

  // const siteRes = await access.GetDomainList(data);
  // 以下是模拟数据
  const siteRes = [
    { id: 1, siteName: 'site1.com' },
    { id: 2, siteName: 'site2.com' },
    { id: 3, siteName: 'site2.com' },
  ];
  // 转换为前端所需要的格式
  const options = siteRes.map((item: any) => {
    return {
      value: item.siteName,
      label: item.siteName,
      domain: item.siteName,
    };
  });
  
  // 返回{list, total}格式
  return {
    list: optionsUtils.buildGroupOptions(options, this.certDomains),
    total: siteRes.length,
  };
}
```

## 注意事项

1. **插件命名**：插件名称应遵循命名规范，大写字母开头，驼峰命名。
2. **类名规范**：类名应与插件名称（name）一致。
3. **证书选择**：必须包含证书选择参数，用于获取前置任务输出的域名证书。
4. **日志输出**：使用 `this.logger` 输出日志，而不是 `console`。
5. **错误处理**：执行过程中的错误应被捕获并记录。
6. **授权获取**：使用 `this.getAccess(accessId)` 获取授权信息。

## 完整示例

```typescript
import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { CertInfo, CertReader } from '@certd/plugin-cert';
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from '@certd/plugin-lib';
import { optionsUtils } from '@certd/basic';
import { CertApplyPluginNames} from '@certd/plugin-cert';
@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
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
    //动态计算脚本， mergeScript返回的对象会合并当前配置，此处演示 show的值会被动态计算结果覆盖，show的值根据用户选择的select的值决定
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