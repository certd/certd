import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, utils } from '@certd/pipeline';
import tencentcloud from 'tencentcloud-sdk-nodejs';
import { TencentAccess } from '../../access/index.js';
import dayjs from 'dayjs';

@IsTaskPlugin({
  name: 'DeployCertToTencentCLB',
  title: '部署到腾讯云CLB',
  group: pluginGroups.tencent.key,
  desc: '暂时只支持单向认证证书，暂时只支持通用负载均衡',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployToClbPlugin extends AbstractTaskPlugin {
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
      ],
    },
    required: true,
  })
  region!: string;

  @TaskInput({
    title: '证书名称前缀',
  })
  certName!: string;

  @TaskInput({
    title: '负载均衡ID',
    helper: '如果没有配置，则根据域名匹配负载均衡下的监听器（根据域名匹配时暂时只支持前100个）',
    required: true,
  })
  loadBalancerId!: string;

  @TaskInput({
    title: '监听器ID',
    helper: '如果没有配置，则根据域名或负载均衡id匹配监听器',
  })
  listenerId!: string;

  @TaskInput({
    title: '域名',
    required: true,
    helper: '要更新的支持https的负载均衡的域名',
  })
  domain!: string;

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'pi-output-selector',
    },
    required: true,
  })
  cert!: any;

  @TaskInput({
    title: 'Access提供者',
    helper: 'access授权',
    component: {
      name: 'pi-access-selector',
      type: 'tencent',
    },
    required: true,
  })
  accessId!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    const accessProvider = (await this.accessService.getById(this.accessId)) as TencentAccess;
    const client = this.getClient(accessProvider, this.region);

    const lastCertId = await this.getCertIdFromProps(client);
    if (!this.domain) {
      await this.updateListener(client);
    } else {
      await this.updateByDomainAttr(client);
    }

    try {
      await utils.sleep(2000);
      let newCertId = await this.getCertIdFromProps(client);
      if ((lastCertId && newCertId === lastCertId) || (!lastCertId && !newCertId)) {
        await utils.sleep(2000);
        newCertId = await this.getCertIdFromProps(client);
      }
      if (newCertId === lastCertId) {
        return;
      }
      this.logger.info('腾讯云证书ID:', newCertId);
    } catch (e) {
      this.logger.warn('查询腾讯云证书失败', e);
    }
    return;
  }

  async getCertIdFromProps(client: any) {
    const listenerRet = await this.getListenerList(client, this.loadBalancerId, [this.listenerId]);
    return this.getCertIdFromListener(listenerRet[0], this.domain);
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

  async updateByDomainAttr(client: any) {
    const params: any = this.buildProps();
    params.Domain = this.domain;
    const ret = await client.ModifyDomainAttributes(params);
    this.checkRet(ret);
    this.logger.info(
      '设置腾讯云CLB证书(sni)成功:',
      ret.RequestId,
      '->loadBalancerId:',
      this.loadBalancerId,
      'listenerId',
      this.listenerId,
      'domain:',
      this.domain
    );
    return ret;
  }
  appendTimeSuffix(name: string) {
    if (name == null) {
      name = 'certd';
    }
    return name + '-' + dayjs().format('YYYYMMDD-HHmmss');
  }
  buildProps() {
    return {
      Certificate: {
        SSLMode: 'UNIDIRECTIONAL', // 单向认证
        CertName: this.appendTimeSuffix(this.certName || this.cert.domain),
        CertKey: this.cert.key,
        CertContent: this.cert.crt,
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

  getClient(accessProvider: TencentAccess, region: string) {
    const ClbClient = tencentcloud.clb.v20180317.Client;

    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region: region,
      profile: {
        httpProfile: {
          endpoint: 'clb.tencentcloudapi.com',
        },
      },
    };

    return new ClbClient(clientConfig);
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error('执行失败：' + ret.Error.Code + ',' + ret.Error.Message);
    }
  }
}
