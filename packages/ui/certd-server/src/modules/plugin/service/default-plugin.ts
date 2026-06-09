import { CertApplyPluginNames } from "@certd/plugin-cert";

export function getDefaultAccessPlugin() {
  const metadata = `
input:
  username:  # 授权参数名
    title: 用户名  # 授权参数标题
    required: true # 是否必填项
    encrypt: false # 是否加密
    component: # 输入组件配置
      name: a-input  #输入组件名称
      allowClear: true # 组件的参数，参考 https://www.antdv.com/components/input#api
  password:
    title: 密码
    required: true
    encrypt: true
    component:
      name: a-input
      allowClear: true
`;

  const script = `
// 必须使用 await import 来引入模块
const { BaseAccess } = await import("@certd/pipeline")
// 需要返回一个继承BaseAccess的类
return class DemoAccess extends BaseAccess {
  // 授权的字段，跟左边input一一对应
  username;
  password;
}
`;
  return {
    metadata: metadata,
    content: script,
  };
}

export function getDefaultDeployPlugin() {
  let certApplyNames = "";
  for (const name of CertApplyPluginNames) {
    certApplyNames += `
        - "${name}"`;
  }
  const metadata = `
input:   # 插件的输入参数
  cert:
    title: 前置任务证书
    helper: 请选择前置任务产生的证书 # 帮助说明
    component:
      name: output-selector     # 输入组件名称
      vModel: modelValue        # 组件参数
      from:${certApplyNames}
    required: true
  certDomains:
    title: 当前证书域名
    component:
      name: cert-domains-getter
    mergeScript: |
      return {
        component:{
            inputKey: ctx.compute(({form})=>{
              return form.cert
            }),
        }
      }
    required: true
  accessId:
    title: Access授权
    helper: xxxx的授权
    component:
      name: access-selector    # 授权选择组件名称
      type: aliyun             # 授权类型
    required: true
  key1:
    title: 输入示例1
    required: false
  key2:
    title: 可选项
    component:
      name: a-select
      vMode: value
      options:
        - value: "1"
          label: 选项1
        - value: "2"
          label: 选项2
    required: false
#output:  # 输出参数，一般插件都不需要配置此项
#  outputName:
#
`;

  const script = `
// 要用await来import模块
const { AbstractTaskPlugin } = await import("@certd/pipeline")
// 使用_ctx.import("/@/xxx.js") 以绝对路径引用模块，/@相当于根路径
const {AliyunAccess} = await _ctx.import("/@/plugins/plugin-lib/aliyun/access/index.js")
_ctx.logger.info("AliyunAccess:",AliyunAccess)
// 要返回一个继承AbstractTaskPlugin的class
return class DemoTask extends AbstractTaskPlugin {
  // 这里是插件的输入参数，对应左边的input配置
  cert;
  certDomains;
  accessId;
  key1;
  key2;
  // 编写执行方法
  async execute(){
    // 根据accessId获取授权配置
    const access = await this.getAccess(this.accessId)

    //必须使用this.logger打印日志
    // this.logger.info("cert:",this.cert);
    this.logger.info("certDomains:",this.certDomains);
    this.logger.info("access:",access);
    this.logger.info("key1:",this.key1);
    this.logger.info("key2:",this.key2);
    // 开始你的部署任务
    // this.ctx里面有一些常用的方法类，比如utils、http、logger等
    const res = await this.ctx.http.request({url:"https://www.baidu.com"})
    if(res.error){
      //抛出异常，终止任务，否则将被判定为执行成功
      throw new Error("部署失败:"+res.message)
    }
    this.logger.info("执行成功")
    // this.outputName = xxxx //设置输出参数，可以被其他插件选择使用
  }
}
`;
  return {
    metadata: metadata,
    content: script,
  };
}

export function getDefaultDnsPlugin() {
  const metadata = `
accessType: aliyun # 授权类型名称
#dependPlugins: # 依赖第三方库，安装插件时会安装依赖库，尽量使用certd已安装的库，比如http、lodash-es、utils
#  @alicloud/openapi-client: ^0.4.12
#dependLibs: # 依赖的插件，应用商店安装时会先安装依赖插件
#  aliyun: *

  `;

  const script = `
const { AbstractDnsProvider } = await import("@certd/pipeline")
return class DemoDnsProvider extends AbstractDnsProvider {
  // 创建dns解析记录，用于验证域名所有权
  async createRecord(options) {
    /**
     * fullRecord: '_acme-challenge.test.example.com',
     * value: 一串uuid
     * type: 'TXT',
     * domain: 'example.com'
     */
    const { fullRecord, value, type, domain } = options;
    const access = this.ctx.access
    this.logger.info('添加域名解析：', fullRecord, value, type, domain);
    // const record = await sdk.createRecord() // 调用对应的接口创建解析记录

    //返回解析记录，用于后面清理
    return record
  }

  /**
   *  删除dns解析记录,清理申请痕迹
   * @param options
   */
  async removeRecord(options) {
    const { fullRecord, value } = options.recordReq;
    const record = options.recordRes;  // createRecord接口返回的record
    const access = this.ctx.access
    this.logger.info('删除域名解析：', fullRecord, value);
    if (!record) {
      this.logger.info('record为空，不执行删除');
      return;
    }
    const recordId = record.id;
    // 这里调用删除txt dns解析记录接口
    // sdk.removeRecord(recordId)
    this.logger.info("删除域名解析成功");
  }
}

`;

  return {
    metadata: metadata,
    content: script,
  };
}
