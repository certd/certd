import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";

/**
 * HiPM DNSMgr Access
 * 使用 API Token 认证（Bearer Token）
 */
@IsAccess({
  name: "hipmdnsmgr",
  title: "HiPM DNSMgr",
  icon: "svg:icon-dns",
  desc: "HiPM DNSMgr API Token 授权",
})
export class HipmDnsmgrAccess extends BaseAccess {
  @AccessInput({
    title: "服务器地址",
    component: {
      name: "a-input",
      allowClear: true,
      placeholder: "http://localhost:3001",
    },
    required: true,
    helper: "HiPM DNSMgr 服务器地址，例如: http://localhost:3001",
  })
  endpoint = "";

  @AccessInput({
    title: "API Token",
    required: true,
    encrypt: true,
    helper: "在 DNSMgr 设置 > API Token 中创建的令牌",
  })
  apiToken = "";

  @AccessInput({
    title: "测试连接",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "点击测试接口是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    await this.getDomainList();
    return "连接成功";
  }

  /**
   * 获取域名 ID（双层查询策略）
   * 方案1: 使用 keyword 参数直接查询（高效）
   * 方案2: 列表匹配作为冗余（兼容旧版本 API）
   */
  async getDomainId(domainName: string): Promise<string> {
    this.ctx.logger.info(`[HiPM DNSMgr] 尝试通过keyword查询域名: ${domainName}`);
    
    // 方案1: 使用 keyword 参数直接查询
    try {
      const resp = await this.doRequest({
        method: 'GET',
        path: '/domains',
        params: {
          page: 1,
          pageSize: 1,
          keyword: domainName,
        },
      });

      // 检查是否找到精确匹配的域名
      if (resp && Array.isArray(resp) && resp.length > 0) {
        const domain = resp.find((item: any) => item.name === domainName);
        if (domain) {
          this.ctx.logger.info(`[HiPM DNSMgr] 通过keyword查询成功: domain=${domainName}, id=${domain.id}`);
          return String(domain.id);
        }
      }
    } catch (error: any) {
      this.ctx.logger.warn(`[HiPM DNSMgr] keyword查询失败，尝试列表匹配: ${error.message}`);
    }

    // 方案2: 如果 keyword 查询未找到，使用列表匹配作为冗余
    this.ctx.logger.info(`[HiPM DNSMgr] keyword查询未找到，尝试列表匹配: ${domainName}`);
    
    const domainList = await this.getDomainList();
    const domainInfo = domainList.find((item: any) => item.domain === domainName);

    if (!domainInfo) {
      throw new Error(`[HiPM DNSMgr] 未找到域名：${domainName}`);
    }

    this.ctx.logger.info(`[HiPM DNSMgr] 通过列表匹配成功: domain=${domainName}, id=${domainInfo.id}`);
    return String(domainInfo.id);
  }

  /**
   * 获取域名列表（保留用于向后兼容）
   */
  async getDomainList() {
    this.ctx.logger.info(`[HiPM DNSMgr] 获取域名列表`);

    const resp = await this.doRequest({
      method: "GET",
      path: "/domains",
      params: {
        page: 1,
        pageSize: 100,
      },
    });

    // DNSMgr 返回数组格式
    return (
      resp?.map((item: any) => ({
        id: String(item.id),
        domain: item.name,
        ...item,
      })) || []
    );
  }

  /**
   * 获取域名记录列表
   */
  async getDomainRecords(domainId: string, params?: { type?: string; subdomain?: string; value?: string }) {
    this.ctx.logger.info(`[HiPM DNSMgr] 获取域名记录列表：domainId=${domainId}`);

    let path = `/domains/${domainId}/records?page=1&pageSize=100`;
    if (params?.type) path += `&type=${encodeURIComponent(params.type)}`;
    if (params?.subdomain) path += `&subdomain=${encodeURIComponent(params.subdomain)}`;
    if (params?.value) path += `&value=${encodeURIComponent(params.value)}`;

    const resp = await this.doRequest({
      method: "GET",
      path,
    });

    return resp;
  }

  /**
   * 创建 DNS 记录
   */
  async createDnsRecord(domainId: string, name: string, value: string, type: string) {
    this.ctx.logger.info(`[HiPM DNSMgr] 创建DNS记录：${name} ${type} ${value}`);

    const resp = await this.doRequest({
      method: "POST",
      path: `/domains/${domainId}/records`,
      data: {
        name,
        type,
        value,
        ttl: 600,
        line: "0",
      },
    });

    return resp;
  }

  /**
   * 删除 DNS 记录
   */
  async deleteDnsRecord(domainId: string, recordId: string) {
    this.ctx.logger.info(`[HiPM DNSMgr] 删除DNS记录：domainId=${domainId}, recordId=${recordId}`);

    const resp = await this.doRequest({
      method: "DELETE",
      path: `/domains/${domainId}/records/${recordId}`,
    });

    return resp;
  }

  /**
   * 发送 HTTP 请求
   */
  async doRequest(req: { method: string; path: string; data?: any; params?: any }) {
    // 处理 URL
    let baseUrl = this.endpoint.trim();
    baseUrl = baseUrl.replace(/\/$/, "");
    baseUrl = baseUrl.replace(/\/api$/, "");

    let url = `${baseUrl}/api${req.path}`;

    // 添加查询参数
    if (req.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(req.params)) {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    this.ctx.logger.debug(`[HiPM DNSMgr] 请求: ${req.method} ${url}`);

    const res = await this.ctx.http.request({
      url,
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiToken}`,
      },
      data: req.data,
    });

    this.ctx.logger.debug(`[HiPM DNSMgr] 响应:`, res);

    // DNSMgr API 返回格式: { code: 0, data: ..., msg: ... }
    if (res.code !== undefined && res.code !== 0) {
      throw new Error(res.msg || "请求失败");
    }

    return res.data;
  }
}
