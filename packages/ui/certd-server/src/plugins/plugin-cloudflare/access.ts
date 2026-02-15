import { IsAccess, AccessInput, BaseAccess } from '@certd/pipeline';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'cloudflare',
  title: 'cloudflare授权',
  icon: 'simple-icons:cloudflare',
  desc: '',
})
export class CloudflareAccess extends BaseAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'API Token',
    component: {
      placeholder: 'api token，用户 API 令牌',
    },
    helper:
      '前往 [获取API令牌](https://dash.cloudflare.com/profile/api-tokens)，注意是令牌，不是密钥。\n token权限必须包含：[Zone区域-Zone区域-Edit编辑], [Zone区域-DNS-Edit编辑]',
    required: true,
    encrypt: true,
  })
  apiToken = '';

  @AccessInput({
    title: 'HTTP代理',
    component: {
      placeholder: 'http://xxxx.xxx.xx:10811',
    },
    helper:
      '是否使用http代理',
    required: false,
    encrypt: false,
  })
  proxy = '';

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "测试授权是否正确"
  })
  testRequest = true;

  async onTestRequest() {
    await this.getZoneList();
    return "ok";
  }


  async getZoneList() {
    const url = `https://api.cloudflare.com/client/v4/zones`;
    const res = await this.doRequestApi(url, null, 'get');
    return res.result
  }

  async doRequestApi(url: string, data: any = null, method = 'post') {
    try {
      const res = await this.ctx.http.request<any, any>({
        url,
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
        },
        data,
        httpProxy: this.proxy,
      });

      if (!res.success) {
        throw new Error(`${JSON.stringify(res.errors)}`);
      }
      return res;
    } catch (e: any) {
      const data = e.response?.data;
      if (data && data.success === false && data.errors && data.errors.length > 0) {
        if (data.errors[0].code === 81058) {
          this.ctx.logger.info('dns解析记录重复');
          return null;
        }
      }
      throw e;
    }
  }

}

new CloudflareAccess();
