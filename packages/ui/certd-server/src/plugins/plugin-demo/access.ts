import { AccessInput, BaseAccess, IsAccess, Pager, PageRes, PageSearch } from '@certd/pipeline';
import { DomainRecord } from '@certd/plugin-lib';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'demo',
  title: '授权插件示例',
  icon: 'clarity:plugin-line', //插件图标
  desc: '这是一个示例授权插件，用于演示如何实现一个授权插件',
})
export class DemoAccess extends BaseAccess {

   /**
   * 授权属性配置
   */
  @AccessInput({
    title: '授权方式',
    value: 'apiKey', //默认值
    component: {
      name: "a-select", //基于antdv的输入组件
      vModel: "value", // v-model绑定的属性名
      options: [ //组件参数
        { label: "API密钥（推荐）", value: "apiKey" },
        { label: "账号密码", value: "account" },
      ],
      placeholder: 'demoKeyId',
    },
    required: true,
  })
  apiType = '';

  /**
   * 授权属性配置
   */
  @AccessInput({
    title: '密钥Id',
    component: {
      name:"a-input",
      allowClear: true,
      placeholder: 'demoKeyId',
    },
    required: true,
  })
  demoKeyId = '';

  @AccessInput({
    title: '密钥',//标题
    required: true,  //text组件可以省略
    encrypt: true, //该属性是否需要加密
  })
  demoKeySecret = '';


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
   * 会通过上面的testRequest参数在ui界面上生成测试按钮，供用户测试接口调用是否正常
   */
  async onTestRequest() {
    await this.GetDomainList({});
    return "ok"
  }

  /**
   * 获api接口示例 取域名列表，
   */
  async GetDomainList(req: PageSearch): Promise<PageRes<DomainRecord>> {
    //输出日志必须使用ctx.logger
    this.ctx.logger.info(`获取域名列表，req:${JSON.stringify(req)}`);
    const pager = new Pager(req);
    const resp = await this.doRequest({
      action: "ListDomains",
      data: {
        domain: req.searchKey,
        offset: pager.getOffset(),
        limit: pager.pageSize,
      }
    });
    const total = resp?.TotalCount || 0;
    let list = resp?.DomainList?.map((item) => {
      item.domain = item.Domain;
      item.id = item.DomainId;
      return item;
    })
    return {
      total,
      list
    };
  }

  // 还可以继续编写API

  /**
   *  通用api调用方法, 具体如何构造请求体，需参考对应应用的API文档
   */
  async doRequest(req: { action: string, data?: any }) {
    /**
        this.ctx中包含很多有用的工具类
        type AccessContext = {
          http: HttpClient;
          logger: ILogger;
          utils: typeof utils;
          accessService: IAccessService;
        }
     */
    const res = await this.ctx.http.request({
      url: "https://api.demo.cn/api/",
      method: "POST",
      data: {
        Action: req.action,
        Body: req.data
      }
    });

    if (res.Code !== 0) {
      //异常处理 
      throw new Error(res.Message || "请求失败");
    }
    return res.Resp;
  }
}
