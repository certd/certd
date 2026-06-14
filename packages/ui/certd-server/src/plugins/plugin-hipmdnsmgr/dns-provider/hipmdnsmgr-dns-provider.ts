import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { HipmDnsmgrAccess } from "../access/hipmdnsmgr-access.js";

/**
 * HiPM DNSMgr DNS Provider
 * 用于 ACME DNS-01 挑战验证
 */
@IsDnsProvider({
  name: "hipmdnsmgr",
  title: "HiPM DNSMgr",
  desc: "HiPM DNSMgr DNS 解析提供商",
  accessType: "hipmdnsmgr",
  icon: "svg:icon-dns",
})
export class HipmDnsmgrDnsProvider extends AbstractDnsProvider<{ domainId: string; recordId: string; name: string; value: string }> {
  access!: HipmDnsmgrAccess;

  async onInstance() {
    this.access = this.ctx.access as HipmDnsmgrAccess;
    this.logger.debug("[HiPM DNSMgr] 初始化完成");
  }

  /**
   * 创建 DNS 记录（用于 ACME DNS-01 验证）
   */
  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, hostRecord, value, type, domain } = options;
    this.logger.info("[HiPM DNSMgr] 添加域名解析：", fullRecord, value, type, domain);

    // 1. 获取域名 ID（双层查询策略）
    const domainId = await this.access.getDomainId(domain);
    this.logger.debug("[HiPM DNSMgr] 找到域名:", domain, "ID:", domainId);

    // 2. 创建 DNS 记录
    const name = hostRecord; // 使用子域名，如 _acme-challenge
    const res = await this.access.createDnsRecord(domainId, name, value, type);

    this.logger.info("[HiPM DNSMgr] 添加域名解析成功:", JSON.stringify(options), res?.id);

    // 返回记录信息，用于后续删除
    return {
      domainId,
      recordId: res?.id,
      name,
      value,
    };
  }

  /**
   * 删除 DNS 记录（ACME 验证完成后清理）
   */
  async removeRecord(options: RemoveRecordOptions<{ domainId: string; recordId: string; name: string; value: string }>): Promise<void> {
    const { fullRecord, value } = options.recordReq;
    const record = options.recordRes;

    this.logger.info("[HiPM DNSMgr] 删除域名解析：", fullRecord, value, record);

    if (record && record.domainId && record.recordId) {
      try {
        await this.access.deleteDnsRecord(record.domainId, record.recordId);
        this.logger.info("[HiPM DNSMgr] 删除域名解析成功:", fullRecord, value);
      } catch (e: any) {
        // 记录可能已经被删除，忽略错误
        this.logger.warn("[HiPM DNSMgr] 删除域名解析失败（可能已不存在）:", e.message);
      }
    } else {
      this.logger.warn("[HiPM DNSMgr] 无法删除记录，缺少 domainId 或 recordId");
    }
  }
}
