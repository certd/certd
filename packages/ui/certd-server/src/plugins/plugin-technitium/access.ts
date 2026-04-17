import { AccessInput, BaseAccess, IsAccess, Pager, PageRes, PageSearch } from '@certd/pipeline';
import { DomainRecord } from '@certd/plugin-lib';

/**
 * Technitium DNS Server 授权配置
 */
@IsAccess({
  name: 'technitium',
  title: 'Technitium DNS Server',
  icon: 'clarity:server-line',
  desc: 'Technitium DNS Server 自建DNS服务器授权',
})
export class TechnitiumAccess extends BaseAccess {

  /**
   * API地址
   */
  @AccessInput({
    title: 'API地址',
    value: 'http://localhost:5380',
    component: {
      name: "a-input",
      allowClear: true,
      placeholder: 'http://localhost:5380',
    },
    required: true,
  })
  apiUrl = 'http://localhost:5380';





  /**
   * 用户名
   */
  @AccessInput({
    title: '用户名',
    component: {
      name: "a-input",
      allowClear: true,
      placeholder: 'admin',
    },
    required: false,
  })
  username = 'admin';

  /**
   * 密码
   */
  @AccessInput({
    title: '密码',
    component: {
      name: "a-input",
      type: "password",
      allowClear: true,
      placeholder: '密码',
    },
    required: false,
    encrypt: true,
  })
  password = '';

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

  token = '';

  /**
   * 通用API调用方法
   */
  async doRequest(options: { url: string; method: 'get' | 'post'; params?: URLSearchParams }) {
    // 每次请求前都获取最新的token
    if (!options.url.includes('/api/user/login')) {
      await this.getToken();
    }
    
    // 复制参数并添加token
    const params = new URLSearchParams(options.params || '');
    if (this.token && !options.url.includes('/api/user/login')) {
      params.append('token', this.token);
    }
    
    let fullUrl = options.url;
    if (params.toString()) {
      fullUrl = `${options.url}?${params.toString()}`;
    }
    
    const response = await this.ctx.http.request({
      url: fullUrl,
      method: options.method,
    });
    
    if (response.status !== 'ok') {
      throw new Error(`${response.errorMessage || 'API调用失败'}`);
    }
    
    return response;
  }

  /**
   * 测试API连接
   */
  async onTestRequest() {
    // 测试获取区域列表
    await this.GetDomainList({});
    return "连接成功";
  }

  /**
   * 获取域名列表
   */
  async GetDomainList(req: PageSearch): Promise<PageRes<DomainRecord>> {
    this.ctx.logger.info(`获取域名列表，req:${JSON.stringify(req)}`);
    const pager = new Pager(req);
    
    // 构建API URL
    const apiUrl = `${this.apiUrl}/api/zones/list`;
    
    // 构建查询参数
    const params = new URLSearchParams();
    
    // 调用API获取区域列表
    const response = await this.doRequest({ url: apiUrl, method: 'get', params: params });
    
    const zones = response.response.zones || [];
    const total = zones.length;
    
    // 转换为DomainRecord格式
    let list = zones.map((zone: any) => ({
      id: zone.name,
      domain: zone.name,
    }));
    
    // 应用分页
    list = list.slice(pager.getOffset(), pager.getOffset() + pager.pageSize);
    
    return {
      total,
      list
    };
  }

  /**
   * 获取API Token
   */
  async getToken() {
    const apiUrl = `${this.apiUrl}/api/user/login`;
    
    const params = new URLSearchParams({
      user: this.username,
      pass: this.password,
    });
    
    // 直接使用ctx.http.request，避免递归调用doRequest
    const response = await this.ctx.http.request({
      url: `${apiUrl}?${params.toString()}`,
      method: 'post',
    });
    
    if (response.status !== 'ok') {
      throw new Error(`登录失败: ${response.errorMessage || '未知错误'}`);
    }
    
    this.token = response.token;
    return this.token;
  }

}
