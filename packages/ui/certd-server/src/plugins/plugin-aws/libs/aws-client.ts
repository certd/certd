// 导入所需的 SDK 模块
import { AwsAccess } from "../access.js";
import { CertInfo, DomainRecord } from "@certd/plugin-cert";
import { ILogger, utils } from "@certd/basic";
import { PageRes, PageSearch } from "@certd/pipeline";
type AwsClientOptions = { access: AwsAccess; region: string; logger: ILogger };

/**
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/route-53-domains/
 */
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
    const { ACMClient, ImportCertificateCommand } = await import("@aws-sdk/client-acm");
    const acmClient = new ACMClient({
      region: this.region, // 替换为您的 AWS 区域
      credentials: {
        accessKeyId: this.access.accessKeyId, // 从环境变量中读取
        secretAccessKey: this.access.secretAccessKey,
      },
    });

    // Split the full PEM chain: first block is the leaf cert, the rest is the intermediate chain
    const pemBlocks = certInfo.crt.split(/(?<=-----END CERTIFICATE-----)/);
    const cert = pemBlocks[0].trim();
    const chain = pemBlocks
      .slice(1)
      .join("")
      .trim();

    // 构建上传参数
    const data = await acmClient.send(
      new ImportCertificateCommand({
        Certificate: Buffer.from(cert),
        PrivateKey: Buffer.from(certInfo.key),
        CertificateChain: chain ? Buffer.from(chain) : undefined,
      })
    );
    this.logger.info(`Upload successful: ${data.CertificateArn}`);
    // 返回证书 ARN（Amazon Resource Name）
    return data.CertificateArn;
  }

  async getCallerIdentity() {
    const { STSClient, GetCallerIdentityCommand } = await import("@aws-sdk/client-sts");

    const client = new STSClient({
      region: this.access.region || "us-east-1",
      credentials: {
        accessKeyId: this.access.accessKeyId, // 从环境变量中读取
        secretAccessKey: this.access.secretAccessKey,
      },
    });

    const command = new GetCallerIdentityCommand({});
    const response = await client.send(command);
    this.logger.info(`     账户ID: ${response.Account}`);
    this.logger.info(`     ARN: ${response.Arn}`);
    this.logger.info(`     用户ID: ${response.UserId}`);
    return response;
  }

  async route53ClientGet() {
    const { Route53Client } = await import("@aws-sdk/client-route-53");
    return new Route53Client({
      region: this.region,
      credentials: {
        accessKeyId: this.access.accessKeyId, // 从环境变量中读取
        secretAccessKey: this.access.secretAccessKey,
      },
    });
  }

  async route53GetHostedZoneId(name: string): Promise<{ ZoneId: string; ZoneName: string }> {
    const hostedZones = await this.route53ListHostedZones(name);
    const zoneId = hostedZones[0].Id.replace("/hostedzone/", "");
    this.logger.info(`获取到hostedZoneId:${zoneId},name:${hostedZones[0].Name}`);
    return {
      ZoneId: zoneId,
      ZoneName: hostedZones[0].Name,
    };
  }
  async route53ListHostedZones(name: string): Promise<{ Id: string; Name: string }[]> {
    const { ListHostedZonesByNameCommand } = await import("@aws-sdk/client-route-53"); // ES Modules import

    const client = await this.route53ClientGet();
    const input = {
      // ListHostedZonesByNameRequest
      DNSName: name,
    };
    const command = new ListHostedZonesByNameCommand(input);
    const response = await this.doRequest(() => client.send(command));
    if (response.HostedZones.length === 0) {
      throw new Error(`找不到 HostedZone ${name}`);
    }
    this.logger.info(`获取到hostedZoneId:${JSON.stringify(response.HostedZones)}`);
    return response.HostedZones;
  }

  async route53ListHostedZonesPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const { ListHostedZonesByNameCommand } = await import("@aws-sdk/client-route-53"); // ES Modules import

    const client = await this.route53ClientGet();
    const input: any = {
      // ListHostedZonesByNameRequest
      MaxItems: req.pageSize,
    };
    if (req.searchKey) {
      input.DNSName = req.searchKey;
    }
    const command = new ListHostedZonesByNameCommand(input);
    const response = await this.doRequest(() => client.send(command));
    let list: any[] = response.HostedZones || [];
    list = list.map((item: any) => ({
      id: item.Id.replace("/hostedzone/", ""),
      domain: item.Name,
    }));
    return {
      total: list.length,
      list,
    };
  }

  async route53ChangeRecord(req: { hostedZoneId: string; fullRecord: string; type: string; value: string; action: "UPSERT" | "DELETE" }) {
    const { ChangeResourceRecordSetsCommand } = await import("@aws-sdk/client-route-53"); // ES Modules import
    // const { Route53Client, ChangeResourceRecordSetsCommand } = require("@aws-sdk/client-route-53"); // CommonJS import
    // import type { Route53ClientConfig } from "@aws-sdk/client-route-53";
    const client = await this.route53ClientGet();
    const input = {
      // ChangeResourceRecordSetsRequest
      HostedZoneId: req.hostedZoneId, // required
      ChangeBatch: {
        // ChangeBatch
        Changes: [
          // Changes // required
          {
            // Change
            Action: req.action as any, // required
            ResourceRecordSet: {
              // ResourceRecordSet
              Name: req.fullRecord, // required
              Type: req.type.toUpperCase() as any,
              ResourceRecords: [
                // ResourceRecords
                {
                  // ResourceRecord
                  Value: `"${req.value}"`, // required
                },
              ],
              TTL: 60,
            },
          },
        ],
      },
    };
    this.logger.info(`设置域名解析参数：${JSON.stringify(input)}`);
    const command = new ChangeResourceRecordSetsCommand(input);
    const response = await this.doRequest(() => client.send(command));
    console.log("Add record successful:", JSON.stringify(response));
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

  async doRequest<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (err) {
      this.logger.error(`调用接口失败:${err.Error?.Message || err.message},requestId:${err.requestId}`);
      throw err;
    }
  }
}
