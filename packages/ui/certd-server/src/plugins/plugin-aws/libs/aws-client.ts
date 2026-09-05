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
    const { ACMClient, ImportCertificateCommand } = await this.access.importRuntime("@aws-sdk/client-acm");
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
    const chain = pemBlocks.slice(1).join("").trim();

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
    const { STSClient, GetCallerIdentityCommand } = await this.access.importRuntime("@aws-sdk/client-sts");

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
    const { Route53Client } = await this.access.importRuntime("@aws-sdk/client-route-53");
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
    const { ListHostedZonesByNameCommand } = await this.access.importRuntime("@aws-sdk/client-route-53"); // ES Modules import

    const client = await this.route53ClientGet();
    const input = {
      // ListHostedZonesByNameRequest
      DNSName: name,
    };
    const command = new ListHostedZonesByNameCommand(input);
    const response: any = await this.doRequest(() => client.send(command));
    if (response.HostedZones.length === 0) {
      throw new Error(`找不到 HostedZone ${name}`);
    }
    this.logger.info(`获取到hostedZoneId:${JSON.stringify(response.HostedZones)}`);
    return response.HostedZones;
  }

  async route53ListHostedZonesPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const { ListHostedZonesByNameCommand } = await this.access.importRuntime("@aws-sdk/client-route-53"); // ES Modules import

    const client = await this.route53ClientGet();
    const input: any = {
      // ListHostedZonesByNameRequest
      MaxItems: req.pageSize,
    };
    if (req.searchKey) {
      input.DNSName = req.searchKey;
    }
    const command = new ListHostedZonesByNameCommand(input);
    const response: any = await this.doRequest(() => client.send(command));
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
    const recordType = req.type.toUpperCase();
    const recordValue = `"${req.value}"`;
    const existingRecord = await this.route53GetRecord(req.hostedZoneId, req.fullRecord, recordType);
    const existingValues = existingRecord?.ResourceRecords || [];

    let action: "UPSERT" | "DELETE" = "UPSERT";
    let values = existingValues;
    if (req.action === "UPSERT") {
      if (existingValues.some(item => item.Value === recordValue)) {
        return;
      }
      values = [...existingValues, { Value: recordValue }];
    } else {
      const remainingValues = existingValues.filter(item => item.Value !== recordValue);
      if (remainingValues.length === existingValues.length) {
        return;
      }
      if (remainingValues.length === 0) {
        action = "DELETE";
      } else {
        values = remainingValues;
      }
    }

    const { ChangeResourceRecordSetsCommand } = await this.access.importRuntime("@aws-sdk/client-route-53");
    const client = await this.route53ClientGet();
    const input = {
      HostedZoneId: req.hostedZoneId,
      ChangeBatch: {
        Changes: [
          {
            Action: action as any,
            ResourceRecordSet: {
              Name: req.fullRecord,
              Type: recordType as any,
              ResourceRecords: values,
              TTL: existingRecord?.TTL || 60,
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
  }

  private async route53GetRecord(hostedZoneId: string, fullRecord: string, type: string): Promise<any> {
    const { ListResourceRecordSetsCommand } = await this.access.importRuntime("@aws-sdk/client-route-53");
    const client = await this.route53ClientGet();
    const command = new ListResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
      StartRecordName: fullRecord,
      StartRecordType: type,
      MaxItems: "1",
    });
    const response: any = await this.doRequest(() => client.send(command));
    const record = response.ResourceRecordSets?.[0];
    if (!record || record.Type !== type || !this.route53RecordNamesMatch(record.Name, fullRecord)) {
      return undefined;
    }
    return record;
  }

  private route53RecordNamesMatch(left: string, right: string): boolean {
    return left.replace(/\.$/, "").toLowerCase() === right.replace(/\.$/, "").toLowerCase();
  }

  async doRequest<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await this.withRetry(call);
    } catch (err: any) {
      this.logger.error(`请求失败:${err.Error?.Message || err.message},requestId:${err.requestId}`);
      throw err;
    }
  }

  /**
   * Retries an AWS SDK call with exponential backoff when throttled.
   * Handles: TooManyRequestsException, ThrottlingException, RequestLimitExceeded, Throttling
   */
  async withRetry<T>(call: () => Promise<T>, maxAttempts = 5, baseDelayMs = 2000): Promise<T> {
    const throttlingCodes = new Set([
      "TooManyRequestsException",
      "ThrottlingException",
      "RequestLimitExceeded",
      "Throttling",
    ]);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await call();
      } catch (err: any) {
        const code = err?.name || err?.Code || err?.code || "";
        const isThrottle = throttlingCodes.has(code) || err?.message?.toLowerCase().includes("rate exceeded");
        if (isThrottle && attempt < maxAttempts) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1); // 2s, 4s, 8s, 16s …
          this.logger.warn(`AWS rate limit hit (${code}), attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms…`);
          await utils.sleep(delay);
        } else {
          throw err;
        }
      }
    }
    throw new Error("Unreachable");
  }

  /**
   * Polls a CloudFront distribution until its Status becomes "Deployed".
   * CloudFront propagates changes globally and can take several minutes.
   */
  async waitForDistributionDeployed(cloudFrontClient: any, distributionId: string, timeoutMs = 600_000, pollIntervalMs = 15_000): Promise<void> {
    const { GetDistributionCommand } = await this.access.importRuntime("@aws-sdk/client-cloudfront");
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const res = await this.withRetry(() => cloudFrontClient.send(new GetDistributionCommand({ Id: distributionId })));
      const status = res?.Distribution?.Status;
      this.logger.info(`CloudFront distribution ${distributionId} status: ${status}`);
      if (status === "Deployed") {
        return;
      }
      await utils.sleep(pollIntervalMs);
    }
    throw new Error(`Timed out waiting for CloudFront distribution ${distributionId} to reach Deployed status`);
  }
}
