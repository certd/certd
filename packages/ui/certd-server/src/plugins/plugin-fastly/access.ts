import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";

/**
 * Fastly Access Plugin
 * Provides API authentication and HTTP helper for Fastly API endpoints.
 */
@IsAccess({
  name: "fastly",
  title: "Fastly授权",
  icon: "simple-icons:fastly",
  desc: "Fastly CDN / TLS Custom Certificates API 授权",
})
export class FastlyAccess extends BaseAccess {
  @AccessInput({
    title: "API Token",
    component: {
      placeholder: "Fastly API Key / Token",
    },
    helper: "前往 Fastly Account Settings -> Personal Access Tokens 创建 Token",
    required: true,
    encrypt: true,
  })
  apiKey = "";

  @AccessInput({
    title: "HTTP代理",
    component: {
      placeholder: "http://xxxx.xxx.xx:10811",
    },
    helper: "可选：是否使用 HTTP 代理访问 Fastly API",
    required: false,
    encrypt: false,
  })
  proxy = "";

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "测试授权是否正确",
  })
  testRequest = true;

  async onTestRequest() {
    await this.doRequestApi("/tls/certificates?page[size]=1", null, "get");
    return "ok";
  }

  async doRequestApi(url: string, data: any = null, method = "post") {
    const baseUrl = "https://api.fastly.com";
    const requestUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;

    const headers: Record<string, string> = {
      "Fastly-Key": this.apiKey,
      Accept: "application/vnd.api+json",
    };

    if (data && (method.toLowerCase() === "post" || method.toLowerCase() === "patch" || method.toLowerCase() === "put")) {
      headers["Content-Type"] = "application/vnd.api+json";
    }

    try {
      const res = await this.ctx.http.request<any, any>({
        url: requestUrl,
        method,
        headers,
        data,
        httpProxy: this.proxy,
      });

      return res;
    } catch (e: any) {
      const errorData = e.response?.data;
      if (errorData) {
        const errorsStr = JSON.stringify(errorData);
        this.ctx.logger.error(`Fastly API Error: ${errorsStr}`);
        throw new Error(`Fastly API 请求失败: ${errorsStr}`);
      }
      throw e;
    }
  }

  /**
   * Fetches every page of a Fastly JSON:API list endpoint.
   * ctx.http already unwraps the response to its body, so the item array is at `body.data`.
   * Fastly paginates these endpoints at 20 items/page by default; without looping only the
   * first page would be visible in the selectors.
   */
  async listAllJsonApi(path: string, pageSize = 100): Promise<any[]> {
    const all: any[] = [];
    const maxPages = 100; // hard cap to avoid an infinite loop if the API misbehaves
    for (let page = 1; page <= maxPages; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const body = await this.doRequestApi(`${path}${sep}page[number]=${page}&page[size]=${pageSize}`, null, "get");
      const items = body?.data;
      if (!Array.isArray(items) || items.length === 0) {
        break;
      }
      all.push(...items);
      const totalPages = body?.meta?.total_pages;
      if (totalPages != null ? page >= totalPages : items.length < pageSize) {
        break;
      }
    }
    return all;
  }

  async getServices() {
    // legacy /service endpoint returns a bare array of objects (not JSON:API)
    const res = await this.doRequestApi("/service?per_page=200", null, "get");
    return Array.isArray(res) ? res : res?.data || [];
  }

  /**
   * Every domain configured on the active version of each Fastly service.
   * These are the names you can actually create a TLS activation for — unlike
   * `/tls/domains`, which just echoes the SAN entries of your certificates
   * (so a wildcard cert shows "*.example.com" that no service serves directly).
   */
  async getServiceDomains(): Promise<string[]> {
    const services = await this.getServices();
    const domains = new Set<string>();
    for (const svc of services) {
      if (!svc?.id) {
        continue;
      }
      try {
        const activeVersion = this.resolveActiveVersion(svc);
        if (activeVersion == null) {
          continue;
        }
        const list = await this.doRequestApi(`/service/${svc.id}/version/${activeVersion}/domain`, null, "get");
        const items: any[] = Array.isArray(list) ? list : list?.data || [];
        for (const d of items) {
          if (d?.name) {
            domains.add(d.name);
          }
        }
      } catch (e: any) {
        this.ctx.logger.error(`获取 Fastly 服务 ${svc.id} 域名失败: ${e?.message}`);
      }
    }
    return [...domains];
  }

  private resolveActiveVersion(svc: any): number | undefined {
    const versions: any[] = Array.isArray(svc?.versions) ? svc.versions : [];
    const active = versions.find((v: any) => v?.active === true);
    if (active?.number != null) {
      return active.number;
    }
    if (typeof svc?.version === "number") {
      return svc.version;
    }
    const numbers = versions.map((v: any) => v?.number).filter((n: any) => typeof n === "number");
    return numbers.length ? Math.max(...numbers) : undefined;
  }

  async getTlsConfigurations() {
    return this.listAllJsonApi("/tls/configurations");
  }

  async getTlsDomains() {
    return this.listAllJsonApi("/tls/domains");
  }

  async getCertificates() {
    return this.listAllJsonApi("/tls/certificates");
  }

  /**
   * Creates a brand new custom TLS certificate on Fastly.
   * Fastly requires the private key to exist first, so this is a 2-step flow:
   * upload (or reuse) the key at /tls/private_keys, then create the certificate
   * referencing it. Returns the new tls_certificate id.
   */
  async createCertificate(certPem: string, keyPem: string, name?: string): Promise<string> {
    const privateKeyId = await this.ensurePrivateKey(keyPem, name);

    this.ctx.logger.info("开始上传证书到 Fastly...");
    const certPayload = {
      data: {
        type: "tls_certificate",
        attributes: {
          cert_blob: certPem,
          ...(name && { name }),
        },
        relationships: {
          tls_private_key: {
            data: {
              type: "tls_private_key",
              id: privateKeyId,
            },
          },
        },
      },
    };

    try {
      const certRes = await this.doRequestApi("/tls/certificates", certPayload, "post");
      return certRes?.data?.id || "";
    } catch (e: any) {
      // Fastly also rejects a byte-identical certificate that is already stored.
      const message: string = e?.message || "";
      if (!/already exists|already in use/i.test(message)) {
        throw e;
      }
      const existingId = FastlyAccess.extractExistingId(message);
      if (existingId) {
        this.ctx.logger.info(`Fastly 已存在相同证书，复用 certId: ${existingId}`);
        return existingId;
      }
      throw new Error(
        `Fastly 证书已存在：${message}。` +
          "该证书可能此前已上传。请在【Fastly-上传证书到Fastly】任务中填写该证书ID以走更新(PATCH)流程。"
      );
    }
  }

  /**
   * Updates an existing custom TLS certificate on Fastly (PATCH).
   * Only cert_blob is sent; the private key stays linked to the certificate.
   * Fastly requires the replacement certificate to use the same private key as the
   * original, so renewals feeding this must reuse their key.
   * Returns the tls_certificate id (falls back to the passed id if the API omits it).
   */
  async updateCertificate(certificateId: string, certPem: string, name?: string): Promise<string> {
    const payload = {
      data: {
        type: "tls_certificate",
        id: certificateId,
        attributes: {
          cert_blob: certPem,
          ...(name && { name }),
        },
      },
    };
    const res = await this.doRequestApi(`/tls/certificates/${certificateId}`, payload, "patch");
    return res?.data?.id || certificateId;
  }

  /**
   * Binds a certificate to one TLS domain under a TLS configuration.
   * A tls_activation is per (certificate, configuration, domain), and only one may
   * exist per domain+configuration. If one is already there (e.g. on renewal) we
   * PATCH it onto the new certificate instead of failing on a duplicate POST.
   */
  async deployActivation(certificateId: string, configurationId: string, domainId: string): Promise<{ id: string; action: "created" | "updated" }> {
    const existing = await this.findActivation(configurationId, domainId);
    if (existing?.id) {
      const res = await this.doRequestApi(
        `/tls/activations/${existing.id}`,
        {
          data: {
            type: "tls_activation",
            id: existing.id,
            relationships: {
              tls_certificate: { data: { type: "tls_certificate", id: certificateId } },
            },
          },
        },
        "patch"
      );
      return { id: res?.data?.id || existing.id, action: "updated" };
    }

    const res = await this.doRequestApi(
      "/tls/activations",
      {
        data: {
          type: "tls_activation",
          relationships: {
            tls_certificate: { data: { type: "tls_certificate", id: certificateId } },
            tls_configuration: { data: { type: "tls_configuration", id: configurationId } },
            tls_domain: { data: { type: "tls_domain", id: domainId } },
          },
        },
      },
      "post"
    );
    return { id: res?.data?.id || "", action: "created" };
  }

  private async findActivation(configurationId: string, domainId: string): Promise<any | undefined> {
    // encodeURIComponent 按规范保留 `*`，但 Fastly 过滤条件要求通配符编码为 `%2A`。
    const encodedDomainId = encodeURIComponent(domainId).replace(/\*/g, "%2A");
    const body = await this.doRequestApi(
      `/tls/activations?filter[tls_domain.id]=${encodedDomainId}&page[size]=100`,
      null,
      "get"
    );
    const items: any[] = Array.isArray(body?.data) ? body.data : [];
    if (items.length === 0) {
      return undefined;
    }
    // Prefer the activation tied to this configuration; fall back to the sole match.
    return items.find((a: any) => a?.relationships?.tls_configuration?.data?.id === configurationId) ?? (items.length === 1 ? items[0] : undefined);
  }

  /**
   * Uploads the private key, or reuses the one Fastly already stores.
   * Fastly deduplicates TLS private keys by content: re-uploading an existing key
   * fails with 400 "Key already exists: '<id>'" (common on renewal when the key is
   * reused). That id is the existing tls_private_key resource, so recover and use it.
   */
  private async ensurePrivateKey(keyPem: string, name?: string): Promise<string> {
    this.ctx.logger.info("开始上传私钥到 Fastly...");
    try {
      const keyRes = await this.doRequestApi(
        "/tls/private_keys",
        { data: { type: "tls_private_key", attributes: { key: keyPem, ...(name && { name }) } } },
        "post"
      );
      const id = keyRes?.data?.id;
      if (!id) {
        throw new Error("Fastly 私钥上传失败，未获取到 private key ID");
      }
      this.ctx.logger.info(`Fastly 私钥上传成功, privateKeyId: ${id}`);
      return id;
    } catch (e: any) {
      const message: string = e?.message || "";
      if (!/already exists/i.test(message)) {
        throw e;
      }
      const idFromError = FastlyAccess.extractExistingId(message);
      if (idFromError) {
        this.ctx.logger.info(`Fastly 已存在相同私钥，复用 privateKeyId: ${idFromError}`);
        return idFromError;
      }
      if (name) {
        const keys = await this.listAllJsonApi("/tls/private_keys");
        const matched = keys.filter((k: any) => k?.attributes?.name === name);
        if (matched.length === 1) {
          this.ctx.logger.info(`Fastly 已存在同名私钥，复用 privateKeyId: ${matched[0].id}`);
          return matched[0].id;
        }
      }
      throw new Error(
        `Fastly 私钥已存在但无法确定其ID：${message}。` +
          "请在【Fastly-上传证书到Fastly】任务中填写已有证书ID以走更新(PATCH)流程，" +
          "或在 Fastly 控制台删除该孤立私钥后重试。"
      );
    }
  }

  /**
   * Pulls the existing resource id out of a Fastly "already exists" error, e.g.
   * `... Key already exists: 'EO8Drv7EYjThQ4DUPo4Ot0'`. Returns undefined when the
   * message carries no id (the caller then falls back or surfaces guidance).
   */
  private static extractExistingId(message: string): string | undefined {
    return message.match(/already exists:\s*['"]?([A-Za-z0-9_-]{8,})['"]?/i)?.[1];
  }
}

new FastlyAccess();
