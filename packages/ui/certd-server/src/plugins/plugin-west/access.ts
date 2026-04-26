import { HttpRequestConfig } from '@certd/basic';
import { IsAccess, AccessInput, BaseAccess, PageSearch, Pager } from '@certd/pipeline';
import qs from 'qs';
import iconv from 'iconv-lite';
/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'west',
  title: '西部数码授权',
  desc: '',
  icon: 'tabler:map-west',
})
export class WestAccess extends BaseAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: '权限范围',
    component: {
      name: 'a-select',
      vModel: 'value',
      options: [
        { value: 'account', label: '账户级别，对所有域名都有权限管理' },
        { value: 'domain', label: '域名级别，仅能管理单个域名' },
      ],
    },
    helper: '选择权限范围',
    required: true,
  })
  scope = '';

  /**
   * 授权属性配置
   */
  @AccessInput({
    title: '账号',
    helper: '你的登录账号',
    encrypt: false,
    required: false,
    mergeScript: `
    return {
      show:ctx.compute(({form})=>{
        return form.access.scope === 'account'
      })
    }
    `,
  })
  username = '';

  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'ApiKey',
    component: {
      placeholder: '账户级别的key，对整个账户都有管理权限',
    },
    helper: '账户级别的key，对整个账户都有管理权限\n前往[API接口配置](https://www.west.cn/manager/API/APIconfig.asp)，手动设置“api连接密码”',
    encrypt: true,
    required: false,
    mergeScript: `
    return {
      show:ctx.compute(({form})=>{
        return form.access.scope === 'account'
      })
    }
    `,
  })
  apikey = '';

  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'apidomainkey',
    component: {
      placeholder: '域名级别的key，仅对单个域名有权限',
    },
    helper: '域名级别的key，仅对单个域名有权限。 \n前往[西部数据域名管理](https://www.west.cn/manager/domain/)，点击域名，右上方点击ApiKey获取密钥',
    encrypt: true,
    required: false,
    mergeScript: `
    return {
      show:ctx.compute(({form})=>{
        return form.access.scope === 'domain'
      })
    }
    `,
  })
  apidomainkey = '';


   /**
   * 授权属性配置
   */
  @AccessInput({
    title: '域名',
    component: {
      placeholder: '域名级别的key对应的域名',
    },
    encrypt: false,
    required: false,
    mergeScript: `
    return {
      show:ctx.compute(({form})=>{
        return form.access.scope === 'domain'
      })
    }
    `,
  })
  domain = '';


  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "点击测试接口是否正常"
  })
  testRequest = true;

  async onTestRequest() {

    if(this.scope === 'domain'){
      if(!this.domain){
        throw new Error('domain 必填');
      }
      await this.getDomainRecordList({limit:1});
      return "ok";
    }

    await this.getDomainList({pageNo:1,pageSize:1});
    return "ok";
  }

  async getDomainRecordList(req:{limit:number}){
     // 获取域名解析记录列表
    return await this.doDoimainApiRequest('https://api.west.cn/API/v2/domain/dns/',{
      act:'dnsrec.list',
      domain:this.domain,
      limit: req.limit || 10,
     })
  }


  async doDoimainApiRequest(url: string, data: any = null, method = 'post') {
    data.apidomainkey = this.apidomainkey;
    const res = await this.ctx.http.request<any, any>({
      url,
      method,
      data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    if (res.msg !== 'success') {
      if(res.msg.includes('500 already exists')){
        return res;
      }
      throw new Error(`${JSON.stringify(res.msg)}`);
    }
    return res;
  }

  async getDomainList(req: PageSearch) {
    const pager = new Pager(req)
    const res = await this.doRequest({
      url: '/v2/domain',
      method: 'GET',
      data:{
        act:'getdomains',
        limit: pager.pageSize,
        page: pager.pageNo,
      }
    });
    return res;
  }



  public async doRequest(req: HttpRequestConfig) {
    let { url, method, data } = req;
    if (data == null) {
      data = {};
    }
    if (!method) {
      method = 'POST';
    }

    if (this.scope === 'account') {
      /**
 * token	text	身份验证字符串，取值为：md5(username+api_password+timestamp),其中：
username：您在我司注册的用户名。
api_password：您设置的API密码。您可登录官网管理中心，在“代理商管理”-<API接口配置>""页面查看您的api密码。
timestamp：当前时间的毫秒时间戳。
将字符串username与字符串api_password连接，再与timestamp连接，然后将生成的字符串进行md5求值，md5算法要求为：
32位16进制字符串，小写格式。
身份验证串有效期10分钟。

比如，您的用户名为：zhangsan，您的API密码为：5dh232kfg!* ,当前毫秒时间戳为：1554691950854，则：
token=md5(zhangsan + 5dh232kfg!* + 1554691950854)=cfcd208495d565ef66e7dff9f98764da
 */
      // data.apikey = this.ctx.utils.hash.md5(this.apikey);
      data.username = this.username;
      const timestamp = new Date().getTime();
      const token = this.ctx.utils.hash.md5(`${this.username}${this.apikey}${timestamp}`).toLowerCase();
      data.token = token;
      data.time = timestamp;
    } else {
      data.apidomainkey = this.apidomainkey;
    }


    const headers = {}
    const body: any = {}
    if (method.toUpperCase() === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
      body.data = data
    } else if (method.toUpperCase() === 'GET') {
      let queryString = '';
      if (method.toUpperCase() === 'GET') {
        queryString = qs.stringify(data);
      }
      url = `${url}?${queryString}`
    }


    const res = await this.ctx.http.request<any, any>({
      baseURL: 'https://api.west.cn/api',
      url,
      method,
      ...body,
      headers,
      responseType: 'arraybuffer', // 关键：获取原始二进制数据
      transformResponse: [
        function(data, headers) { // headers 参数包含响应头
          try {
            const contentType = headers['content-type'] || '';
            // 判断是否是 GB2312/GBK 编码
            //@ts-ignore
            if (contentType.includes('gb2312') || contentType.includes('gbk')) {
              // 使用 iconv-lite 解码
              data = iconv.decode(data, 'gb2312');
            }else{
              // 默认按 UTF-8 处理
              data = data.toString('utf-8');
            }
          } catch (error) {
            console.error('解码失败:', error);
          }
          return JSON.parse(data);
        }
      ]
    });
    this.ctx.logger.info(`request ${url} ${method} res:${JSON.stringify(res)}`);
    if (res.msg !== 'success' && res.result!= 200) {
      if(res.msg.includes('500 already exists')){
        return res;
      }
      throw new Error(`${JSON.stringify(res.msg)}`);
    }
    return res;
  }

}

new WestAccess();
