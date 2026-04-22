import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import FormData from "form-data";
import { authenticator } from "otplib";

export interface ProxyHost {
  id: number;
  domain_names?: string[];
  certificate_id?: number;
  proxy_hosts?: unknown[];
  redirection_hosts?: unknown[];
  dead_hosts?: unknown[];
  streams?: unknown[];
}

export interface Certificate {
  id: number;
  nice_name: string;
  provider: string;
  domain_names?: string[];
  proxy_hosts?: unknown[];
  redirection_hosts?: unknown[];
  dead_hosts?: unknown[];
  streams?: unknown[];
}

interface TokenResponse {
  token?: string;
  requires_2fa?: boolean;
  challenge_token?: string;
}

@IsAccess({
  name: "nginxProxyManager",
  title: "Nginx Proxy Manager 授权",
  desc: "用于登录 Nginx Proxy Manager，并为代理主机证书部署提供授权。",
  icon: "logos:nginx",
})
export class NginxProxyManagerAccess extends BaseAccess {
  @AccessInput({
    title: "NPM 地址",
    component: {
      name: "a-input",
      allowClear: true,
      placeholder: "https://npm.example.com",
    },
    helper: "请输入 Nginx Proxy Manager 根地址，不要带 /api 后缀。",
    required: true,
  })
  endpoint = "";

  @AccessInput({
    title: "邮箱",
    component: {
      name: "a-input",
      allowClear: true,
      placeholder: "admin@example.com",
    },
    required: true,
  })
  email = "";

  @AccessInput({
    title: "密码",
    component: {
      name: "a-input-password",
      allowClear: true,
      placeholder: "请输入密码",
    },
    required: true,
    encrypt: true,
  })
  password = "";

  @AccessInput({
    title: "TOTP 密钥",
    component: {
      name: "a-input-password",
      allowClear: true,
      placeholder: "Optional base32 TOTP secret",
    },
    helper: "当 Nginx Proxy Manager 账号开启 2FA 时必填。",
    required: false,
    encrypt: true,
  })
  totpSecret = "";

  @AccessInput({
    title: "忽略无效 TLS",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "仅在 Nginx Proxy Manager 使用自签 HTTPS 证书时开启。",
    required: false,
  })
  ignoreTls = false;

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "onTestRequest",
    },
    helper: "测试登录并拉取代理主机列表。",
  })
  testRequest = true;

  private token: string | undefined;
  private tokenPromise: Promise<string> | undefined;

  normalizeEndpoint(endpoint: string): string {
    const trimmed = String(endpoint ?? "").trim();
    if (!trimmed) {
      throw new Error("Nginx Proxy Manager 地址不能为空");
    }

    const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
    return withoutTrailingSlash.endsWith("/api")
      ? withoutTrailingSlash.slice(0, -4)
      : withoutTrailingSlash;
  }

  private describeError(error: unknown, action: string): Error {
    if (error instanceof Error) {
      return new Error(`${action} failed: ${error.message}`);
    }
    return new Error(`${action} failed`);
  }

  private get apiBaseUrl(): string {
    const endpoint = this.normalizeEndpoint(this.endpoint);
    return `${endpoint}/api`;
  }

  async verifyAccess(): Promise<{ proxyHostCount: number }> {
    const proxyHosts = await this.getProxyHosts();
    return {
      proxyHostCount: proxyHosts.length,
    };
  }

  async getProxyHosts(searchQuery?: string): Promise<ProxyHost[]> {
    return await this.requestWithAuth<ProxyHost[]>({
      method: "GET",
      url: "/nginx/proxy-hosts",
      params: {
        expand: "certificate",
        ...(searchQuery ? { query: searchQuery } : {}),
      },
    });
  }

  async getCertificates(searchQuery?: string): Promise<Certificate[]> {
    return await this.requestWithAuth<Certificate[]>({
      method: "GET",
      url: "/nginx/certificates",
      params: searchQuery ? { query: searchQuery } : undefined,
    });
  }

  async getCertificatesWithExpand(
    searchQuery?: string,
    expand: string[] = []
  ): Promise<Certificate[]> {
    return await this.requestWithAuth<Certificate[]>({
      method: "GET",
      url: "/nginx/certificates",
      params: {
        ...(searchQuery ? { query: searchQuery } : {}),
        ...(expand.length > 0 ? { expand: expand.join(", ") } : {}),
      },
    });
  }

  async findCustomCertificateByNiceName(niceName: string): Promise<Certificate | undefined> {
    const certificates = await this.getCertificates(niceName);
    return certificates.find((certificate) => {
      return certificate.provider === "other" && certificate.nice_name === niceName;
    });
  }

  async createCustomCertificate(
    niceName: string,
    domainNames: string[] = []
  ): Promise<Certificate> {
    return await this.requestWithAuth<Certificate>({
      method: "POST",
      url: "/nginx/certificates",
      data: {
        provider: "other",
        nice_name: niceName,
        domain_names: domainNames,
      },
    });
  }

  async deleteCertificate(certificateId: number): Promise<void> {
    await this.requestWithAuth<void>({
      method: "DELETE",
      url: `/nginx/certificates/${certificateId}`,
    });
  }

  async uploadCertificate(
    certificateId: number,
    payload: {
      certificate: string;
      certificateKey: string;
      intermediateCertificate?: string;
    }
  ): Promise<void> {
    const form = new FormData();
    form.append("certificate", Buffer.from(payload.certificate, "utf8"), {
      filename: "fullchain.pem",
      contentType: "application/x-pem-file",
    });
    form.append("certificate_key", Buffer.from(payload.certificateKey, "utf8"), {
      filename: "privkey.pem",
      contentType: "application/x-pem-file",
    });
    if (payload.intermediateCertificate) {
      form.append("intermediate_certificate", Buffer.from(payload.intermediateCertificate, "utf8"), {
        filename: "chain.pem",
        contentType: "application/x-pem-file",
      });
    }

    await this.requestWithAuth<void>({
      method: "POST",
      url: `/nginx/certificates/${certificateId}/upload`,
      data: form,
      headers: form.getHeaders(),
    });
  }

  async assignCertificateToProxyHost(hostId: number, certificateId: number): Promise<void> {
    await this.requestWithAuth<void>({
      method: "PUT",
      url: `/nginx/proxy-hosts/${hostId}`,
      data: {
        certificate_id: certificateId,
      },
    });
  }

  private async login(): Promise<string> {
    if (this.token) {
      return this.token;
    }

    if (!this.tokenPromise) {
      this.tokenPromise = this.performLogin().finally(() => {
        this.tokenPromise = undefined;
      });
    }

    this.token = await this.tokenPromise;
    return this.token;
  }

  private async performLogin(): Promise<string> {
    const initialLogin = await this.request<TokenResponse>({
      method: "POST",
      url: "/tokens",
      data: {
        identity: this.email,
        secret: this.password,
      },
    });

    if (initialLogin.token) {
      return initialLogin.token;
    }

    if (!initialLogin.requires_2fa || !initialLogin.challenge_token) {
      throw new Error("登录失败：Nginx Proxy Manager 未返回访问令牌");
    }

    if (!this.totpSecret) {
      throw new Error(
        "登录失败：该 Nginx Proxy Manager 账号启用了 2FA，但未配置 totpSecret"
      );
    }

    let code: string;
    try {
      code = authenticator.generate(this.totpSecret);
    } catch (error) {
      throw this.describeError(error, "Generating TOTP code");
    }

    const completedLogin = await this.request<TokenResponse>({
      method: "POST",
      url: "/tokens/2fa",
      data: {
        challenge_token: initialLogin.challenge_token,
        code,
      },
    });

    if (!completedLogin.token) {
      throw new Error("2FA 登录失败：Nginx Proxy Manager 未返回访问令牌");
    }

    return completedLogin.token;
  }

  private async requestWithAuth<T>(config: {
    method: string;
    url: string;
    params?: Record<string, unknown>;
    data?: unknown;
    headers?: Record<string, string>;
  }): Promise<T> {
    const token = await this.login();
    const headers = {
      ...(config.headers ?? {}),
      Authorization: `Bearer ${token}`,
    };

    return await this.request<T>({
      ...config,
      headers,
    });
  }

  private async request<T>(config: {
    method: string;
    url: string;
    params?: Record<string, unknown>;
    data?: unknown;
    headers?: Record<string, string>;
  }): Promise<T> {
    const action = `${config.method ?? "GET"} ${config.url ?? "/"}`;
    try {
      const response = await this.ctx.http.request({
        url: `${this.apiBaseUrl}${config.url}`,
        method: config.method,
        params: config.params,
        data: config.data,
        headers: config.headers,
        timeout: 30000,
        httpsAgent: this.ignoreTls ? {
          rejectUnauthorized: false
        } : undefined,
      });
      return response;
    } catch (error) {
      throw this.describeError(error, action);
    }
  }

  async onTestRequest(): Promise<string> {
    const result = await this.verifyAccess();
    this.ctx.logger.info(
      `Nginx Proxy Manager 授权验证成功，找到 ${result.proxyHostCount} 个代理主机`
    );
    return `成功（${result.proxyHostCount} 个代理主机）`;
  }

  async getProxyHostList(req: { searchKey?: string } = {}): Promise<ProxyHost[]> {
    return await this.getProxyHosts(req.searchKey);
  }
}

new NginxProxyManagerAccess();