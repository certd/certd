// 导入所需的 SDK 模块
import { AwsAccess } from '../access.js';
import { CertInfo } from '@certd/plugin-cert';
import {ILogger, utils} from '@certd/basic';
type AwsClientOptions = { access: AwsAccess; region: string, logger:ILogger };

export class AwsClient {
  options: AwsClientOptions;
  access: AwsAccess;
  region: string;
  logger: ILogger;
  constructor(options: AwsClientOptions) {
    this.options = options;
    this.access = options.access;
    this.region = options.region;
    this.logger = options.logger;
  }
  async importCertificate(certInfo: CertInfo) {
    // 创建 ACM 客户端
    const { ACMClient, ImportCertificateCommand } = await import('@aws-sdk/client-acm');
    const acmClient = new ACMClient({
      region: this.region, // 替换为您的 AWS 区域
      credentials: {
        accessKeyId: this.access.accessKeyId, // 从环境变量中读取
        secretAccessKey: this.access.secretAccessKey,
      },
    });

    const cert = certInfo.crt.split('-----END CERTIFICATE-----')[0] + '-----END CERTIFICATE-----';
    // 构建上传参数
    const data = await acmClient.send(
      new ImportCertificateCommand({
        Certificate: Buffer.from(cert),
        PrivateKey: Buffer.from(certInfo.key),
        // CertificateChain: certificateChain, // 可选
      })
    );
    console.log('Upload successful:', data);
    // 返回证书 ARN（Amazon Resource Name）
    return data.CertificateArn;
  }


  async route53ClientGet() {
    const { Route53Client } = await import('@aws-sdk/client-route-53');
    return new Route53Client({
      region: this.region,
      credentials: {
        accessKeyId: this.access.accessKeyId, // 从环境变量中读取
        secretAccessKey: this.access.secretAccessKey,
      },
    });
  }

   async route53GetHostedZoneId(name:string) :Promise<{ZoneId:string,ZoneName:string}> {
    const hostedZones = await this.route53ListHostedZones(name);
    const zoneId = hostedZones[0].Id.replace('/hostedzone/','');
    this.logger.info(`获取到hostedZoneId:${zoneId},name:${hostedZones[0].Name}`);
    return {
      ZoneId: zoneId,
      ZoneName: hostedZones[0].Name,
    };
  }
  async route53ListHostedZones(name:string) :Promise<{Id:string,Name:string}[]> {
    const {  ListHostedZonesByNameCommand } =await import("@aws-sdk/client-route-53"); // ES Modules import

    const client = await this.route53ClientGet();
    const input = { // ListHostedZonesByNameRequest
      DNSName: name,
    };
    const command = new ListHostedZonesByNameCommand(input);
    const response = await this.doRequest(()=>client.send(command));
    if (response.HostedZones.length === 0) {
      throw new Error(`找不到 HostedZone ${name}`);
    }
    this.logger.info(`获取到hostedZoneId:${JSON.stringify(response.HostedZones)}`);
    return response.HostedZones;
  }

  async route53ChangeRecord(req:{
    hostedZoneId:string,fullRecord:string,type:string, value:string, action:"CREATE"|"DELETE"}){
    const {  ChangeResourceRecordSetsCommand} =await import("@aws-sdk/client-route-53"); // ES Modules import
    // const { Route53Client, ChangeResourceRecordSetsCommand } = require("@aws-sdk/client-route-53"); // CommonJS import
    // import type { Route53ClientConfig } from "@aws-sdk/client-route-53";
    const client = await this.route53ClientGet();

    const appendBody:any = {}
    if(req.action === 'CREATE'){
      appendBody.TTL = 60;
    }
    const input = { // ChangeResourceRecordSetsRequest
      HostedZoneId: req.hostedZoneId, // required
      ChangeBatch: { // ChangeBatch
        Changes: [ // Changes // required
          { // Change
            Action: req.action as any , // required
            ResourceRecordSet: { // ResourceRecordSet
              Name: req.fullRecord+".", // required
              Type: req.type.toUpperCase() as any,
              ResourceRecords: [ // ResourceRecords
                { // ResourceRecord
                  Value: `"${req.value}"`, // required
                },
              ],
              ...appendBody
            },
          },
        ],
      },
    };
    this.logger.info(`添加域名解析参数：${JSON.stringify(input)}`);
    const command = new ChangeResourceRecordSetsCommand(input);
    const response = await this.doRequest(()=>client.send(command));
    console.log('Add record successful:', JSON.stringify(response));
    await utils.sleep(3000);
    return response;
    /*
    // { // ChangeResourceRecordSetsResponse
//   ChangeInfo: { // ChangeInfo
//     Id: "STRING_VALUE", // required
//     Status: "PENDING" || "INSYNC", // required
//     SubmittedAt: new Date("TIMESTAMP"), // required
//     Comment: "STRING_VALUE",
//   },
// };*/
  }

  async doRequest<T>(call:()=>Promise<T>):Promise<T>{
    try{
      return await call();
    }catch(err){
      this.logger.error(`调用接口失败:${err.Error?.Message || err.message},requestId:${err.requestId}`);
      throw err;
    }
  }
}
