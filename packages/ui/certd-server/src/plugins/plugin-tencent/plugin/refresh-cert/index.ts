import {
  AbstractTaskPlugin,
  IsTaskPlugin,
  Pager,
  PageSearch,
  pluginGroups,
  RunStrategy,
  TaskInput
} from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { TencentAccess } from "../../../plugin-lib/tencent/access.js";
import { TencentSslClient } from "../../../plugin-lib/tencent/index.js";
import { omit } from "lodash-es";
@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "TencentRefreshCert",
  title: "腾讯云-更新证书(Id不变)",
  desc: "根据证书id一键更新腾讯云证书并自动部署（Id不变），注意该接口为腾讯云白名单功能，非白名单用户无法使用该功能",
  icon: "svg:icon-tencentcloud",
  //插件分组
  group: pluginGroups.tencent.key,
  needPlus: false,
  default: {
    //默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed
    }
  }
})
//类名规范，跟上面插件名称（name）一致
export class TencentRefreshCert extends AbstractTaskPlugin {
  //证书选择，此项必须要有
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames]
    }
    // required: true, // 必填
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "腾讯云授权",
    component: {
      name: "access-selector",
      type: "tencent" //固定授权类型
    },
    required: true //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书Id",
      helper: "要更新的证书id，如果这里没有，请先给手动绑定一次证书",
      action: TencentRefreshCert.prototype.onGetCertList.name,
      pager: false,
      search: false
    })
  )
  certList!: string[];

  // @TaskInput({
  //   title: '资源类型',
  //   component: {
  //     name: 'a-select',
  //     vModel: 'value',
  //     allowClear: true,
  //     mode: "tags",
  //     options: [
  //       { value: 'clb',label: '负载均衡'},
  //       { value: 'cdn',label: 'CDN'},
  //       { value: 'ddos',label: 'DDoS'},
  //       { value: 'live',label: '直播'},
  //       { value: 'vod',label: '点播'},
  //       { value: 'waf',label: 'Web应用防火墙'},
  //       { value: 'apigateway',label: 'API网关'},
  //       { value: 'teo',label: 'TEO'},
  //       { value: 'tke',label: '容器服务'},
  //       { value: 'cos',label: '对象存储'},
  //       { value: 'lighthouse',label: '轻应用服务器'},
  //       { value: 'tse',label: '云原生微服务'},
  //       { value: 'tcb',label: '云开发'},
  //     ]
  //   },
  //   helper: '',
  //   required: true,
  // })
  // resourceTypes!: string[];

  @TaskInput({
    title: '资源区域',
    helper:"如果云资源类型区分区域，请选择区域，如果区域在选项中不存在，请手动输入",
    component: {
      name: 'remote-tree-select',
      vModel: 'value',
      action: TencentRefreshCert.prototype.onGetRegionsTree.name,
      pager: false,
      search: false,
      watches: ['certList'],
    },
    required: false,
  })
  resourceTypesRegions!: string[];
  //插件实例化时执行的方法
  async onInstance() {
  }

  //插件执行方法
  async execute(): Promise<void> {
    const access = await this.getAccess<TencentAccess>(this.accessId);
    const sslClient = new TencentSslClient({
      access:access,
      logger: this.logger,
    });
    // await access.createCert({cert:this.cert})

    let resourceTypes = []
    const resourceTypesRegions = []
    if(!this.resourceTypesRegions){
      this.resourceTypesRegions = []
    }
    for (const item of this.resourceTypesRegions) {
      const [type,region] = item.split("_")
      if (!resourceTypes.includes( type)){
        resourceTypes.push(type)
      }
      if (!region){
        continue;
      }
      const resourceType = resourceTypesRegions.find(item => item.ResourceType ==  type)
      if (!resourceType){
        resourceTypesRegions.push({
          ResourceType: type,
          Regions: [region]
        })
      }else{
        resourceType.Regions.push(region)
      }
    }
    // resourceTypes = ["clb"] //固定clb
    const maxRetry = 10
    for (const certId of this.certList) {
      this.logger.info(`----------- 开始更新证书：${certId}`);

      let deployRes = null

      let retryCount = 0
      while(true){
        if (retryCount>maxRetry){
          this.logger.error(`任务创建失败`);
          break;
        }
        retryCount++
        const params = {
          "OldCertificateId": certId,
          "ResourceTypes": resourceTypes,
          "CertificatePublicKey": "xxx",
          "CertificatePrivateKey": "xxx",
          "ResourceTypesRegions":resourceTypesRegions
        }
        this.logger.info(`请求参数：${JSON.stringify(params)}`);
        params.CertificatePublicKey = this.cert.crt
        params.CertificatePrivateKey = this.cert.key
        deployRes = await sslClient.UploadUpdateCertificateInstance(params);
        if (deployRes && deployRes.DeployRecordId>0){
          this.logger.info(`任务创建成功，开始检查结果：${JSON.stringify(deployRes)}`);
          break;
        }else{
          this.logger.info(`任务创建中，稍后查询：${JSON.stringify(deployRes)}`);
        }
        await this.ctx.utils.sleep(3000);
      }
      this.logger.info(`开始查询部署结果`);

      retryCount=0
      while(true){
        if (retryCount>maxRetry){
          this.logger.error(`任务结果检查失败`);
          break;
        }
        retryCount++
        //查询部署状态
        const deployStatus = await sslClient.DescribeHostUploadUpdateRecordDetail({
          "DeployRecordId":deployRes.DeployRecordId
        })
        const details = deployStatus.DeployRecordDetail
        let allSuccess = true
        for (const item of details) {
          this.logger.info(`查询结果：${JSON.stringify(omit(item,"RecordDetailList"))}`);
          if (item.Status === 2) {
            throw new Error(`任务失败：${JSON.stringify(item.RecordDetailList)}`)
          }else if (item.Status !== 1) {
            //如果不是成功状态
            allSuccess = false
          }
        }
        if (allSuccess) {
          break;
        }
        await this.ctx.utils.sleep(10000);
      }
      this.logger.info(`----------- 更新证书${certId}成功`);
    }

  }

  async onGetRegionsTree(data: PageSearch = {}){

    const commonRegions = [
      /**
       * 华南地区（广州）	waf.ap-guangzhou.tencentcloudapi.com
       * 华东地区（上海）	waf.ap-shanghai.tencentcloudapi.com
       * 华东地区（南京）	waf.ap-nanjing.tencentcloudapi.com
       * 华北地区（北京）	waf.ap-beijing.tencentcloudapi.com
       * 西南地区（成都）	waf.ap-chengdu.tencentcloudapi.com
       * 西南地区（重庆）	waf.ap-chongqing.tencentcloudapi.com
       * 港澳台地区（中国香港）	waf.ap-hongkong.tencentcloudapi.com
       * 亚太东南（新加坡）	waf.ap-singapore.tencentcloudapi.com
       * 亚太东南（雅加达）	waf.ap-jakarta.tencentcloudapi.com
       * 亚太东南（曼谷）	waf.ap-bangkok.tencentcloudapi.com
       * 亚太东北（首尔）	waf.ap-seoul.tencentcloudapi.com
       * 亚太东北（东京）	waf.ap-tokyo.tencentcloudapi.com
       * 美国东部（弗吉尼亚）	waf.na-ashburn.tencentcloudapi.com
       * 美国西部（硅谷）	waf.na-siliconvalley.tencentcloudapi.com
       * 南美地区（圣保罗）	waf.sa-saopaulo.tencentcloudapi.com
       * 欧洲地区（法兰克福）	waf.eu-frankfurt.tencentcloudapi.com
       */
      {value:"ap-guangzhou", label:"广州"},
      {value:"ap-shanghai", label:"上海"},
      {value:"ap-nanjing", label:"南京"},
      {value:"ap-beijing", label:"北京"},
      {value:"ap-chengdu", label:"成都"},
      {value:"ap-chongqing", label:"重庆"},
      {value:"ap-hongkong", label:"香港"},
      {value:"ap-singapore", label:"新加坡"},
      {value:"ap-jakarta", label:"雅加达"},
      {value:"ap-bangkok", label:"曼谷"},
      {value:"ap-tokyo", label:"东京"},
      {value:"ap-seoul", label:"首尔"},
      {value:"na-ashburn", label:"弗吉尼亚"},
      {value:"na-siliconvalley", label:"硅谷"},
      {value:"sa-saopaulo", label:"圣保罗"},
      {value:"eu-frankfurt", label:"法兰克福"},
    ]

    function buildTypeRegions(type: string) {
      const options :any[]= []
      for (const region of commonRegions) {
        options.push({
          label:  type + "_" + region.label,
          value: type + "_" + region.value,
        });
      }
      return  options
    }

    return [
      { value: 'cdn',label: 'CDN'},
      { value: 'ddos',label: 'DDoS'},
      { value: 'live',label: '直播'},
      { value: 'vod',label: '点播'},
      { value: 'teo',label: 'TEO'},
      { value: 'lighthouse',label: '轻应用服务器'},
      {
        label: "负载均衡(clb)",
        value: "clb",
        children: buildTypeRegions("clb"),
      },
      {
        label: "Web应用防火墙(waf)",
        value: "waf",
        children: buildTypeRegions("waf"),
      },
      {
        label: "API网关(apigateway)",
        value: "apigateway",
        children: buildTypeRegions("apigateway"),
      },
      {
        label: "对象存储(COS)",
        value: "cos",
        children: buildTypeRegions("cos"),
      },
      {
        label: "容器服务(tke)",
        value: "tke",
        children: buildTypeRegions("tke"),
      },
      {
        label: "云原生微服务(tse)",
        value: "tse",
        children: buildTypeRegions("tse"),
      },
      {
        label: "云开发(tcb)",
        value: "tcb",
        children: buildTypeRegions("tcb"),
      },
    ]
  }

  async onGetCertList(data: PageSearch = {}) {

    const access = await this.getAccess<TencentAccess>(this.accessId)
    const sslClient = new TencentSslClient({
      access:access,
      logger: this.logger,
    });

    const pager = new Pager(data);
    const offset = pager.getOffset();
    const limit = pager.pageSize
    const res = await sslClient.DescribeCertificates({Limit:limit,Offset:offset,SearchKey:data.searchKey})
    const list = res.Certificates
    if (!list || list.length === 0) {
      throw new Error("没有找到证书，你可以直接手动输入id");
    }


    /**
     * certificate-id
     * name
     * dns-names
     */
    const options = list.map((item: any) => {
      return {
        label: `${item.CertificateId}<${item.Domain}_${item.Alias}_${item.BoundResource.length}>`,
        value: item.CertificateId,
        domain: item.SubjectAltName,
      };
    });
    return {
      list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
    };
  }
}

//实例化一下，注册插件
new TencentRefreshCert();
