import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo, CertReader, createCertDomainGetterInputDefine } from "@certd/plugin-cert";
import { NginxProxyManagerAccess, ProxyHost } from "../access.js";

interface ProxyHostOption {
  label: string;
  value: string;
  domain: string;
}

@IsTaskPlugin({
  name: "NginxProxyManagerDeploy",
  title: "Nginx Proxy Manager-部署到主机",
  desc: "上传自定义证书到 Nginx Proxy Manager，并绑定到所选主机。",
  icon: "logos:nginx",
  group: pluginGroups.panel.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class NginxProxyManagerDeploy extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务产出的证书。",
    component: {
      name: "output-selector",
      from: [":cert:"],
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine())
  certDomains!: string[];

  @TaskInput({
    title: "NPM授权",
    component: {
      name: "access-selector",
      type: "nginxProxyManager",
    },
    helper: "选择用于部署的 Nginx Proxy Manager 授权。",
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: "代理主机",
    component: {
      name: "remote-select",
      vModel: "value",
      mode: "tags",
      type: "plugin",
      action: "onGetProxyHostOptions",
      search: true,
      pager: false,
      single: false,
      watches: ["certDomains", "accessId"],
    },
    helper: "选择要绑定此证书的一个或多个代理主机。",
    required: true,
  })
  proxyHostIds!: string | string[];

  @TaskInput({
    title: "证书标识",
    component: {
      name: "a-input",
      allowClear: true,
      placeholder: "certd_npm_example_com",
    },
    helper: "可选。留空时默认使用 certd_npm_<主域名规范化>。",
    required: false,
  })
  certificateLabel?: string;

  @TaskInput({
    title: "自动清理未使用证书",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "部署成功后，自动删除除当前证书外所有未被任何主机引用的证书。",
    required: false,
  })
  cleanupMatchingCertificates = false;

  private normalizeDomain(domain: string): string {
    return String(domain ?? "")
      .trim()
      .toLowerCase();
  }

  private wildcardMatches(pattern: string, candidate: string): boolean {
    if (!pattern.startsWith("*.")) {
      return false;
    }

    const suffix = pattern.slice(1).toLowerCase();
    return candidate.endsWith(suffix);
  }

  private isDomainMatch(left: string, right: string): boolean {
    const normalizedLeft = this.normalizeDomain(left);
    const normalizedRight = this.normalizeDomain(right);

    return normalizedLeft === normalizedRight || this.wildcardMatches(normalizedLeft, normalizedRight) || this.wildcardMatches(normalizedRight, normalizedLeft);
  }

  private sanitizeDomainSegment(value: string): string {
    const sanitized = String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_");

    return sanitized || "unknown";
  }

  private buildDefaultCertificateLabel(cert: CertInfo): string {
    const mainDomain = CertReader.getMainDomain(cert.crt);
    return `certd_npm_${this.sanitizeDomainSegment(mainDomain)}`;
  }

  private normalizeStringList(input: string | string[] | null | undefined): string[] {
    if (Array.isArray(input)) {
      return input;
    }

    if (input == null || input === "") {
      return [];
    }

    return [input];
  }

  private resolveCertificateDomains(cert: CertInfo, configuredDomains: string | string[] | null | undefined): string[] {
    const configured = this.normalizeStringList(configuredDomains)
      .map(value => String(value).trim())
      .filter(Boolean);

    if (configured.length > 0) {
      return Array.from(new Set(configured));
    }

    return new CertReader(cert).getAllDomains();
  }

  private buildProxyHostLabel(host: ProxyHost): string {
    const domains = host.domain_names?.length ? host.domain_names.join(", ") : "(no domains)";
    return `${domains} <#${host.id}>`;
  }

  private hasAnyCertDomainMatch(host: ProxyHost, certDomains: string[]): boolean {
    if (!certDomains.length) {
      return false;
    }

    const hostDomains = host.domain_names ?? [];
    return hostDomains.some(hostDomain => certDomains.some(certDomain => this.isDomainMatch(hostDomain, certDomain)));
  }

  private buildProxyHostOptions(hosts: ProxyHost[], certDomains: string[]) {
    const sortedHosts = [...hosts].sort((left, right) => {
      return this.buildProxyHostLabel(left).localeCompare(this.buildProxyHostLabel(right));
    });

    const matched: { label: string; value: string; domain: string }[] = [];
    const unmatched: { label: string; value: string; domain: string }[] = [];

    for (const host of sortedHosts) {
      const option = {
        label: this.buildProxyHostLabel(host),
        value: String(host.id),
        domain: host.domain_names?.[0] ?? "",
      };

      if (this.hasAnyCertDomainMatch(host, certDomains)) {
        matched.push(option);
      } else {
        unmatched.push(option);
      }
    }

    if (matched.length && unmatched.length) {
      return [
        {
          label: "匹配证书域名的主机",
          options: matched,
        },
        {
          label: "其他代理主机",
          options: unmatched,
        },
      ];
    }

    return matched.length ? matched : unmatched;
  }

  private normalizeProxyHostIds(proxyHostIds: string | string[] | number | null | undefined): number[] {
    return Array.from(
      new Set(
        this.normalizeStringList(proxyHostIds as string | string[] | null | undefined)
          .map(value => Number.parseInt(String(value), 10))
          .filter(value => Number.isInteger(value) && value > 0)
      )
    );
  }

  private certificateHasBindings(certificate: { proxy_hosts?: unknown[]; redirection_hosts?: unknown[]; dead_hosts?: unknown[]; streams?: unknown[] }): boolean {
    return (certificate.proxy_hosts?.length ?? 0) > 0 || (certificate.redirection_hosts?.length ?? 0) > 0 || (certificate.dead_hosts?.length ?? 0) > 0 || (certificate.streams?.length ?? 0) > 0;
  }

  async execute(): Promise<void> {
    const access = await this.getAccess<NginxProxyManagerAccess>(this.accessId);
    const proxyHostIds = this.normalizeProxyHostIds(this.proxyHostIds);

    if (proxyHostIds.length === 0) {
      throw new Error("请至少选择一个 Nginx Proxy Manager 代理主机");
    }

    const certificateLabel = this.certificateLabel?.trim() || this.buildDefaultCertificateLabel(this.cert);
    const certificateDomains = this.resolveCertificateDomains(this.cert, this.certDomains);

    let certificate = await access.findCustomCertificateByNiceName(certificateLabel);
    if (!certificate) {
      this.logger.info(`在 Nginx Proxy Manager 中创建自定义证书 "${certificateLabel}"`);
      certificate = await access.createCustomCertificate(certificateLabel, certificateDomains);
    } else {
      this.logger.info(`复用已有自定义证书 "${certificateLabel}" (#${certificate.id})`);
    }

    await access.uploadCertificate(certificate.id, {
      certificate: this.cert.crt,
      certificateKey: this.cert.key,
      intermediateCertificate: this.cert.ic,
    });
    this.logger.info(`证书内容已上传到 Nginx Proxy Manager 证书 #${certificate.id}`);

    for (const proxyHostId of proxyHostIds) {
      this.logger.info(`将证书 #${certificate.id} 绑定到代理主机 #${proxyHostId}`);
      try {
        await access.assignCertificateToProxyHost(proxyHostId, certificate.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`为代理主机 #${proxyHostId} 绑定证书失败：${message}`);
      }
    }

    if (this.cleanupMatchingCertificates === true) {
      await this.cleanupOldCertificates(access, certificate.id);
    }

    this.logger.info(`部署完成，共更新 ${proxyHostIds.length} 个代理主机`);
  }

  async onGetProxyHostOptions(req: { searchKey?: string } = {}): Promise<ProxyHostOption[] | { label: string; options: ProxyHostOption[] }[]> {
    if (!this.accessId) {
      throw new Error("请先选择 Nginx Proxy Manager 授权");
    }

    const access = await this.getAccess<NginxProxyManagerAccess>(this.accessId);
    const proxyHosts = await access.getProxyHostList(req);
    return this.buildProxyHostOptions(proxyHosts, this.normalizeStringList(this.certDomains));
  }

  private async cleanupOldCertificates(access: NginxProxyManagerAccess, currentCertificateId: number): Promise<void> {
    const certificates = await access.getCertificatesWithExpand(undefined, ["proxy_hosts", "redirection_hosts", "dead_hosts", "streams"]);
    const candidates = certificates.filter(certificate => {
      return certificate.id !== currentCertificateId;
    });

    if (candidates.length === 0) {
      this.logger.info("未发现可自动清理的旧证书");
      return;
    }

    const deletedIds: number[] = [];
    const skippedInUse: string[] = [];
    const failedDeletes: string[] = [];

    for (const candidate of candidates) {
      if (this.certificateHasBindings(candidate)) {
        skippedInUse.push(`#${candidate.id} ${candidate.nice_name}`);
        continue;
      }

      this.logger.info(`自动清理旧证书 #${candidate.id} ${candidate.nice_name}`);
      try {
        await access.deleteCertificate(candidate.id);
        deletedIds.push(candidate.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failedDeletes.push(`#${candidate.id} ${candidate.nice_name}: ${message}`);
      }
    }

    if (deletedIds.length > 0) {
      this.logger.info(`自动清理完成，共删除 ${deletedIds.length} 张旧证书：${deletedIds.map(id => `#${id}`).join(", ")}`);
    } else {
      this.logger.info("未删除任何旧证书");
    }

    if (skippedInUse.length > 0) {
      this.logger.info(`以下旧证书仍被其他资源引用，已跳过清理：${skippedInUse.join(", ")}`);
    }

    if (failedDeletes.length > 0) {
      this.logger.warn(`以下旧证书清理失败，已跳过：${failedDeletes.join(", ")}`);
    }
  }
}

new NginxProxyManagerDeploy();
