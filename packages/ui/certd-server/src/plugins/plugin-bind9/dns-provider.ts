import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { Bind9Access } from "./access.js";
import { SshClient } from "../plugin-lib/ssh/index.js";

export type Bind9Record = {
  fullRecord: string;
  value: string;
  type: string;
  domain: string;
};

@IsDnsProvider({
  name: "bind9",
  title: "BIND9 DNS",
  desc: "通过 SSH 连接到 BIND9 服务器，使用 nsupdate 命令管理 DNS 记录",
  icon: "clarity:host-line",
  accessType: "bind9",
})
export class Bind9DnsProvider extends AbstractDnsProvider<Bind9Record> {
  access!: Bind9Access;
  sshClient!: SshClient;

  async onInstance() {
    this.access = this.ctx.access as Bind9Access;
    this.sshClient = new SshClient(this.logger);
  }

  /**
   * 获取 SSH 连接配置
   */
  private async getSshAccess() {
    // 从 accessService 获取 SSH 授权配置
    const sshAccess = await this.ctx.accessGetter.getById(this.access.sshAccessId);
    if (!sshAccess) {
      throw new Error("SSH 授权不存在");
    }
    return sshAccess;
  }

  /**
   * 构建 nsupdate 命令
   */
  private buildNsupdateCommand(commands: string[]): string {
    const { dnsServer, dnsPort } = this.access;
    const nsupdateScript = [`server ${dnsServer} ${dnsPort}`, ...commands, "send"].join("\n");

    // 使用 heredoc 方式执行 nsupdate
    return `nsupdate << 'EOF'
${nsupdateScript}
EOF`;
  }

  /**
   * 创建 DNS 解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions): Promise<Bind9Record> {
    const { fullRecord, value, type, domain } = options;
    this.logger.info("添加域名解析：", fullRecord, value, type, domain);

    // 构建 nsupdate 命令
    // 格式: update add <name> <ttl> <type> <value>
    const updateCommand = `update add ${fullRecord} 60 ${type} "${value}"`;
    const nsupdateCmd = this.buildNsupdateCommand([updateCommand]);

    this.logger.info("执行 nsupdate 命令添加记录");

    try {
      const sshAccess = await this.getSshAccess();
      await this.sshClient.exec({
        connectConf: sshAccess,
        script: nsupdateCmd,
        throwOnStdErr: true,
      });

      this.logger.info(`添加域名解析成功: fullRecord=${fullRecord}, value=${value}`);
    } catch (error: any) {
      this.logger.error("添加域名解析失败:", error.message);
      throw new Error(`添加 DNS 记录失败: ${error.message}`);
    }

    // 返回记录信息，用于后续删除
    const record: Bind9Record = {
      fullRecord,
      value,
      type,
      domain,
    };

    return record;
  }

  /**
   * 删除 DNS 解析记录，清理申请痕迹
   */
  async removeRecord(options: RemoveRecordOptions<Bind9Record>): Promise<void> {
    const { fullRecord, value, type, domain } = options.recordRes;
    this.logger.info("删除域名解析：", fullRecord, value, type, domain);

    // 构建 nsupdate 命令
    // 格式: update delete <name> <type> <value>
    const updateCommand = `update delete ${fullRecord} ${type} "${value}"`;
    const nsupdateCmd = this.buildNsupdateCommand([updateCommand]);

    this.logger.info("执行 nsupdate 命令删除记录");

    try {
      const sshAccess = await this.getSshAccess();
      await this.sshClient.exec({
        connectConf: sshAccess,
        script: nsupdateCmd,
        throwOnStdErr: false, // 删除时忽略错误（记录可能已不存在）
      });

      this.logger.info(`删除域名解析成功: fullRecord=${fullRecord}, value=${value}`);
    } catch (error: any) {
      // 删除失败只记录警告，不抛出异常（清理操作不应影响主流程）
      this.logger.warn("删除域名解析时出现警告:", error.message);
    }
  }
}

// 实例化这个 provider，将其自动注册到系统中
new Bind9DnsProvider();
