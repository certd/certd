import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import dayjs from 'dayjs';
import { TencentAccess } from '../../../plugin-lib/tencent/index.js';
import { CertApplyPluginNames, CertInfo } from '@certd/plugin-cert';
@IsTaskPlugin({
  name: 'DeployCertToTencentCLB',
  title: '腾讯云-部署到CLB',
  icon: 'svg:icon-tencentcloud',
  group: pluginGroups.tencent.key,
  desc: '暂时只支持单向认证证书，暂时只支持通用负载均衡',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToTencentCLB extends AbstractTaskPlugin {

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames, 'UploadCertToTencent'],
    },
    required: true,
  })
  cert!: string | CertInfo;



  @TaskInput({
    title: 'Access提供者',
    helper: 'access授权',
    component: {
      name: 'access-selector',
      type: 'tencent',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: '大区',
    component: {
      name: 'a-auto-complete',
      vModel: 'value',
      options: [
        { value: 'ap-guangzhou' },
        { value: 'ap-beijing' },
        { value: 'ap-chengdu' },
        { value: 'ap-chongqing' },
        { value: 'ap-hongkong' },
        { value: 'ap-jakarta' },
        { value: 'ap-mumbai' },
        { value: 'ap-nanjing' },
        { value: 'ap-seoul' },
        { value: 'ap-shanghai' },
        { value: 'ap-shanghai-fsi' },
        { value: 'ap-shenzhen-fsi' },
        { value: 'ap-singapore' },
        { value: 'ap-tokyo' },
        { value: 'eu-frankfurt' },
        { value: 'na-ashburn' },
        { value: 'na-siliconvalley' },
        { value: 'na-toronto' },
        { value: 'sa-saopaulo' },
        { value: 'ap-taipei' },
      ],
      helper: '如果列表中没有，您可以手动输入',
    },
    required: true,
  })
  region!: string;



  @TaskInput({
    title: '负载均衡ID',
    required: true,
  })
  loadBalancerId!: string;

  @TaskInput({
    title: '监听器ID',
    required: true,
  })
  listenerId!: string;

  @TaskInput({
    title: '域名',
    required: false,
    component: {
      name: 'a-select',
      vModel: 'value',
      open: false,
      mode: 'tags',
    },
    helper: '如果开启了sni，则此项必须填写，未开启，则不要填写',
  })
  domain!: string | string[];

  @TaskInput({
    title: '证书名称前缀',
  })
  certName!: string;


  client: any;
  async onInstance() {
    this.client = await this.getClient();
  }

  async getClient() {
    const sdk = await import('tencentcloud-sdk-nodejs/tencentcloud/services/clb/v20180317/index.js');
    const ClbClient = sdk.v20180317.Client;

    const accessProvider = (await this.getAccess(this.accessId)) as TencentAccess;

    const region = this.region;
    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region: region,
      profile: {
        httpProfile: {
          endpoint: `clb.${accessProvider.intlDomain()}tencentcloudapi.com`,
        },
      },
    };

    return new ClbClient(clientConfig);
  }

  async execute(): Promise<void> {
    const client = this.client;

    if (!this.domain || this.domain.length === 0) {
      await this.updateListener(client);
    } else {
      const domains = Array.isArray(this.domain) ? this.domain : [this.domain];
      for (const domain of domains) {
        this.logger.info(`开始更新域名证书:${domain},请确保已经开启了sni`);
        // const lastCertId = await this.getCertIdFromProps(client, domain);

        await this.updateByDomainAttr(client, domain);

        // 不要做检查，相同的证书，不会生成新的证书id
        // const checkDeployed = async (wait = 5) => {
        //   await this.ctx.utils.sleep(wait * 1000);
        //   this.logger.info(`等待${wait}秒`);
        //   const newCertId = await this.getCertIdFromProps(client, domain);
        //   this.logger.info(`oldCertId:${lastCertId} , newCertId:${newCertId}`);
        //   if ((lastCertId && newCertId === lastCertId) || (!lastCertId && !newCertId)) {
        //     return false;
        //   }
        //   this.logger.info('腾讯云证书ID:', newCertId);
        //   return true;
        // };
        // let count = 0;
        // while (true) {
        //   count++;
        //   const res = await checkDeployed(5);
        //   if (res) {
        //     break;
        //   }
        //   if (count > 6) {
        //     this.logger.warn('等待超时，可能证书未部署成功');
        //   }
        // }
      }
    }

    return;
  }

  async getCertIdFromProps(client: any, domain: string) {
    const listenerRet = await this.getListenerList(client, this.loadBalancerId, this.listenerId ? [this.listenerId] : null);
    return this.getCertIdFromListener(listenerRet[0], domain);
  }

  getCertIdFromListener(listener: any, domain: string) {
    let certId;
    if (!domain) {
      certId = listener.Certificate.CertId;
    } else {
      if (listener.Rules && listener.Rules.length > 0) {
        for (const rule of listener.Rules) {
          if (rule.Domain === domain) {
            if (rule.Certificate != null) {
              certId = rule.Certificate.CertId;
            }
            break;
          }
        }
      }
    }
    return certId;
  }

  async updateListener(client: any) {
    const params = this.buildProps();
    const ret = await client.ModifyListener(params);
    this.checkRet(ret);
    this.logger.info('设置腾讯云CLB证书成功:', ret.RequestId, '->loadBalancerId:', this.loadBalancerId, 'listenerId', this.listenerId);
    return ret;
  }

  async updateByDomainAttr(client: any, domain) {
    const params: any = this.buildProps();

    params.Domain = domain;
    const ret = await client.ModifyDomainAttributes(params);
    this.checkRet(ret);
    this.logger.info(
      `[${domain}] 设置腾讯云CLB证书(sni)任务已提交:taskId：${ret.RequestId}，loadBalancerId:${this.loadBalancerId}，listenerId:${this.listenerId}`
    );

    const requestId = ret.RequestId;
    while (true) {
      const statusRes = await client.DescribeTaskStatus({ TaskId: requestId });

      if (statusRes.Status === 0) {
        this.logger.info(`[${domain}] 腾讯云CLB证书(sni)设置成功`);
        break;
      } else if (statusRes.Status === 2) {
        this.logger.info(`[${domain}] 腾讯云CLB证书(sni)设置进行中，请耐心等待`);
      } else if (statusRes.Status === 1) {
        throw new Error(`[${domain}] 腾讯云CLB证书(sni)设置失败:` + statusRes.Message);
      }
      await this.ctx.utils.sleep(5000);
    }
    return ret;
  }
  appendTimeSuffix(name: string) {
    if (name == null) {
      name = 'certd';
    }
    return name + '-' + dayjs().format('YYYYMMDD-HHmmss');
  }
  buildProps() {
    const certId = this.cert as string;
    const certInfo = this.cert as CertInfo;
    if (typeof this.cert === 'string') {
      return {
        Certificate: {
          CertId: certId,
        },
        LoadBalancerId: this.loadBalancerId,
        ListenerId: this.listenerId,
      };
    }
    return {
      Certificate: {
        SSLMode: 'UNIDIRECTIONAL', // 单向认证
        CertName: this.appendTimeSuffix(this.certName || "certd"),
        CertKey: certInfo.key,
        CertContent: certInfo.crt,
      },
      LoadBalancerId: this.loadBalancerId,
      ListenerId: this.listenerId,
    };
  }

  async getCLBList(client: any) {
    const params = {
      Limit: 100, // 最大暂时只支持100个，暂时没做翻页
      OrderBy: 'CreateTime',
      OrderType: 0,
      // ...this.DescribeLoadBalancers,
    };
    const ret = await client.DescribeLoadBalancers(params);
    this.checkRet(ret);
    return ret.LoadBalancerSet;
  }

  async getListenerList(client: any, balancerId: any, listenerIds: any) {
    // HTTPS
    const params = {
      LoadBalancerId: balancerId,
      Protocol: 'HTTPS',
      ListenerIds: listenerIds,
    };
    const ret = await client.DescribeListeners(params);
    this.checkRet(ret);
    return ret.Listeners;
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error('执行失败：' + ret.Error.Code + ',' + ret.Error.Message);
    }
  }
}
