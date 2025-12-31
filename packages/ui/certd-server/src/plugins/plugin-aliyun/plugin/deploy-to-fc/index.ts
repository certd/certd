import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import {  createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import fs from "fs";
import path from "path";
import { tmpdir } from "node:os";
import { sp } from "@certd/basic";
import { AliyunAccess } from "../../../plugin-lib/aliyun/access/index.js";

@IsTaskPlugin({
  name: 'AliyunDeployCertToFC',
  title: '阿里云-部署至阿里云FC(3.0)',
  icon: 'svg:icon-aliyun',
  group: pluginGroups.aliyun.key,
  desc: '部署证书到阿里云函数计算（FC3.0）',
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class AliyunDeployCertToFC extends AbstractTaskPlugin {
  @TaskInput({
    title: '域名证书',
    helper: '请选择证书申请任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: 'FC大区',
    value: 'cn-hangzhou',
    component: {
      name: 'a-auto-complete',
      vModel: 'value',
      options: [
        { value: 'cn-qingdao', label: '华北1（青岛）' },
        { value: 'cn-beijing', label: '华北2（北京）' },
        { value: 'cn-zhangjiakou', label: '华北 3（张家口）' },
        { value: 'cn-huhehaote', label: '华北5（呼和浩特）' },
        { value: 'cn-hangzhou', label: '华东1（杭州）' },
        { value: 'cn-shanghai', label: '华东2（上海）' },
        { value: 'cn-shenzhen', label: '华南1（深圳）' },
        { value: 'ap-southeast-2', label: '澳大利亚（悉尼）' },
        { value: 'eu-central-1', label: '德国（法兰克福）' },
        { value: 'ap-southeast-3', label: '马来西亚（吉隆坡）' },
        { value: 'us-east-1', label: '美国（弗吉尼亚）' },
        { value: 'us-west-1', label: '美国（硅谷）' },
        { value: 'ap-northeast-1', label: '日本（东京）' },
        { value: 'ap-southeast-7', label: '泰国（曼谷）' },
        { value: 'cn-chengdu', label: '西南1（成都）' },
        { value: 'ap-southeast-1', label: '新加坡' },
        { value: 'ap-south-1', label: '印度（孟买）' },
        { value: 'ap-southeast-5', label: '印度尼西亚（雅加达）' },
        { value: 'eu-west-1', label: '英国（伦敦）' },
        { value: 'cn-hongkong', label: '中国香港' },
      ],
    },
    required: true,
  })
  regionId!: string;


  @TaskInput({
    title: '阿里云账号id',
    helper: '阿里云主账号ID，右上角头像下方获取',
    component: {
      name: 'a-input',
      vModel:"value"
    },
    required: true,
  })
  accountId!: string;

  @TaskInput({
    title: 'Access授权',
    helper: '阿里云授权AccessKeyId、AccessKeySecret',
    component: {
      name: 'access-selector',
      type: 'aliyun',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: 'FC域名',
      helper: "请选择要部署证书的域名",
      typeName: 'AliyunDeployCertToFC',
      action: AliyunDeployCertToFC.prototype.onGetDomainList.name,
      watches: ['accessId', 'regionId'],
    })
  )
  fcDomains!: string[];

  @TaskInput({
    title: '域名支持的协议类型',
    value: '',
    component: {
      name: 'a-select',
      vModel:"value",
      options: [
        { value: '', label: '保持原样（适用于原来已经开启了HTTPS）' },
        { value: 'HTTPS', label: '仅HTTPS' },
        { value: 'HTTP,HTTPS', label: 'HTTP与HTTPS同时支持' },
      ],
    },
  })
  protocol!: string;

  @TaskInput({
    title: '证书名称',
    helper: '上传后将以此名称作为前缀备注',
  })
  certName!: string;

  async onInstance() {}

  async exec(cmd: string) {
    process.env.LANG = "zh_CN.GBK";
    await sp.spawn({
      cmd: cmd,
      logger: this.logger,
    });
  }
  async execute(): Promise<void> {
    this.logger.info('开始部署证书到阿里云');
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await this.getClient(access);

    const $Util = await import('@alicloud/tea-util');
    const $OpenApi = await import('@alicloud/openapi-client');


    let privateKey = this.cert.key
    try{
      // openssl rsa -in private_key.pem -out private_key_pkcs1.pem
      const tempDir = path.join(tmpdir(), "certd");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const keyFileName = this.ctx.utils.id.randomNumber(10);
      const tempPem = `${tempDir}/${keyFileName}.pem`;
      const tempPkcs1Pem =`${tempDir}/${keyFileName}_pkcs1.pem`;
      fs.writeFileSync(tempPem, this.cert.key);
      const oldPfxCmd = `openssl rsa -in ${tempPem} -traditional -out ${tempPkcs1Pem}`;
      await this.exec(oldPfxCmd);
      const fileBuffer = fs.readFileSync(tempPkcs1Pem);
      privateKey = fileBuffer.toString();
      fs.unlinkSync(tempPem);
      fs.unlinkSync(tempPkcs1Pem);
    }catch (e) {
      this.logger.warn("私钥转换为PKCS#1格式失败",e);
    }




    for (const domainName of this.fcDomains) {
      const params = new $OpenApi.Params({
        // 接口名称
        action: 'UpdateCustomDomain',
        // 接口版本
        version: '2023-03-30',
        // 接口协议
        protocol: 'HTTPS',
        // 接口 HTTP 方法
        method: 'PUT',
        authType: 'AK',
        style: 'FC',
        // 接口 PATH
        pathname: `/2023-03-30/custom-domains/${domainName}`,
        // 接口请求体内容格式
        reqBodyType: 'json',
        // 接口响应体内容格式
        bodyType: 'json',
      });
      // body params
      const certName = this.buildCertName(CertReader.getMainDomain(this.cert.crt),this.certName??"")

      const body: { [key: string]: any } = {
        certConfig: {
          certName: certName,
          certificate: this.cert.crt,
          privateKey: privateKey,
        },
      };
      if (this.protocol) {
        body.protocol = this.protocol;
      }

      const runtime = new $Util.RuntimeOptions({});
      const request = new $OpenApi.OpenApiRequest({ body });
      // 复制代码运行请自行打印 API 的返回值
      // 返回值实际为 Map 类型，可从 Map 中获得三类数据：响应体 body、响应头 headers、HTTP 返回的状态码 statusCode。
      await client.callApi(params, request, runtime);
      this.logger.info(`部署[${domainName}]成功`);
    }
  }

  async getClient(access: AliyunAccess) {
    const $OpenApi = await import('@alicloud/openapi-client');
    const config = new $OpenApi.Config({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
    });
    // Endpoint 请参考 https://api.aliyun.com/product/FC
    config.endpoint = `${this.accountId}.${this.regionId}.fc.aliyuncs.com`;
    return new $OpenApi.default.default(config);
  }

  async onGetDomainList(data: any) {
    if (!this.accessId) {
      throw new Error('请选择Access授权');
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = await this.getClient(access);

    const $OpenApi = await import('@alicloud/openapi-client');
    const $Util = await import('@alicloud/tea-util');
    const params = new $OpenApi.Params({
      // 接口名称
      action: 'ListCustomDomains',
      // 接口版本
      version: '2023-03-30',
      // 接口协议
      protocol: 'HTTPS',
      // 接口 HTTP 方法
      method: 'GET',
      authType: 'AK',
      style: 'FC',
      // 接口 PATH
      pathname: `/2023-03-30/custom-domains`,
      // 接口请求体内容格式
      reqBodyType: 'json',
      // 接口响应体内容格式
      bodyType: 'json',
    });

    const runtime = new $Util.RuntimeOptions({});
    const request = new $OpenApi.OpenApiRequest({});
    // 复制代码运行请自行打印 API 的返回值
    // 返回值实际为 Map 类型，可从 Map 中获得三类数据：响应体 body、响应头 headers、HTTP 返回的状态码 statusCode。
    const res = await client.callApi(params, request, runtime);

    const list = res?.body?.customDomains;
    if (!list || list.length === 0) {
      throw new Error('没有找到FC域名，请先创建FC域名');
    }

    const options = list.map((item: any) => {
      return {
        label: item.domainName,
        value: item.domainName,
        title: item.domainName,
        domain: item.domainName,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}

new AliyunDeployCertToFC();
