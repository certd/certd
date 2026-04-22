import { AccessInput, BaseAccess, IsAccess, Pager, PageRes, PageSearch } from '@certd/pipeline';

/**
 * Next Terminal 授权配置
 */
@IsAccess({
  name: 'nextTerminal',
  title: 'Next Terminal 授权',
  icon: 'clarity:plugin-line',
  desc: '用于访问 Next Terminal API 的授权配置',
})
export class NextTerminalAccess extends BaseAccess {

  /**
   * Next Terminal 系统地址
   */
  @AccessInput({
    title: '系统地址',
    component: {
      name: "a-input",
      allowClear: true,
      placeholder: 'https://nt.example.com:8088',
    },
    required: true,
  })
  baseUrl = '';

  /**
   * API 令牌
   */
  @AccessInput({
    title: 'API 令牌',
    helper: '个人中心->授权令牌->创建令牌',
    component: {
      name: "a-input",
      allowClear: true,
      placeholder: 'NT_xxxxx',
    },
    required: true,
    encrypt: true,
  })
  apiToken = '';

  /**
   * 测试按钮
   */
  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "点击测试接口是否正常"
  })
  testRequest = true;

  /**
   * 测试接口连接
   */
  async onTestRequest() {
    await this.GetCertificateList({});
    return "ok";
  }

  /**
   * 获取证书列表
   */
  async GetCertificateList(req: PageSearch): Promise<PageRes<any>> {
    this.ctx.logger.info(`获取 Next Terminal 证书列表，req:${JSON.stringify(req)}`);
    const pager = new Pager(req);
    const resp = await this.doRequest({
      url: '/api/admin/certificates/paging',
      method: 'GET',
      params: {
        pageIndex: pager.pageNo,
        pageSize: pager.pageSize,
        sortOrder: 'ascend',
        sortField: 'notAfter',
      }
    });
    
    const total = resp?.total || 0;
    const list = resp?.items || [];
    
    return {
      total,
      list
    };
  }

  /**
   * 更新证书
   */
  async UpdateCertificate(req: {
    certId: string;
    commonName: string;
    crt: string;
    key: string;
  }) {
    this.ctx.logger.info(`更新 Next Terminal 证书，certId:${req.certId}, commonName:${req.commonName}`);
    await this.doRequest({
      url: `/api/admin/certificates/${req.certId}`,
      method: 'PUT',
      data: {
        commonName: req.commonName,
        type: 'imported',
        id: req.certId,
        certificate: req.crt,
        privateKey: req.key,
        renewBefore: 30,
      }
    });
  }

  /**
   * 通用 API 调用方法
   */
  async doRequest(req: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    params?: any;
    data?: any;
  }) {
    const headers = {
      'X-Auth-Token': `${this.apiToken}`,
      'Content-Type': 'application/json',
    };

    const baseUrl = this.normalizeEndpoint(this.baseUrl);
    this.ctx.logger.debug(`Next Terminal API 请求: ${req.method} ${baseUrl}${req.url}`);
  
    const resp = await this.ctx.http.request({
      url: req.url,
      baseURL: baseUrl,
      method: req.method,
      headers,
      params: req.params,
      data: req.data,
      validateStatus: () => true, // 不自动抛出异常，让我们自己处理
    });

    if (resp.code >0) {
      throw new Error(resp.message);
    } 
    return resp
  }
}

new NextTerminalAccess()