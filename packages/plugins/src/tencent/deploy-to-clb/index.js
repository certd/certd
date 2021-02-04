import { AbstractTencentPlugin } from '../../tencent/abstract-tencent.js'
import tencentcloud from 'tencentcloud-sdk-nodejs'
export class DeployCertToTencentCLB extends AbstractTencentPlugin {
  /**
   * 插件定义
   * 名称
   * 入参
   * 出参
   */
  static define () {
    return {
      name: 'deployCertToTencentCLB',
      label: '部署到腾讯云CLB',
      desc: '暂时只支持单向认证证书，暂时只支持通用负载均衡',
      input: {
        region: {
          label: '大区',
          default: 'ap-guangzhou',
          required: true
        },
        domain: {
          label: '域名',
          type: [String, Array],
          required: true,
          desc: '要更新的支持https的负载均衡的域名'
        },
        loadBalancerId: {
          label: '负载均衡ID',
          desc: '如果没有配置，则根据域名匹配负载均衡下的监听器（根据域名匹配时暂时只支持前100个）',
          required: true
        },
        listenerId: {
          label: '监听器ID',
          desc: '如果没有配置，则根据域名或负载均衡id匹配监听器'
        },
        certName: {
          label: '证书名称',
          desc: '如无uploadCertToTencent作为前置，则此项需要设置，默认为域名'
        },
        accessProvider: {
          label: 'Access提供者',
          type: [String, Object],
          desc: 'access授权',
          component: {
            name: 'access-provider-selector',
            filter: 'tencent'
          },
          required: true
        }
      },
      output: {

      }
    }
  }

  async execute ({ cert, props, context }) {
    const accessProvider = this.getAccessProvider(props.accessProvider)
    const { region } = props
    const client = this.getClient(accessProvider, region)

    const lastCertId = await this.getCertIdFromProps(client, props)
    if (!props.domain) {
      await this.updateListener(client, cert, props, context)
    } else {
      await this.updateByDomainAttr(client, cert, props, context)
    }

    try {
      await this.sleep(2000)
      let newCertId = await this.getCertIdFromProps(client, props)
      if ((lastCertId && newCertId === lastCertId) || (!lastCertId && !newCertId)) {
        await this.sleep(2000)
        newCertId = await this.getCertIdFromProps(client, props)
      }
      if (newCertId === lastCertId) {
        return {}
      }
      this.logger.info('腾讯云证书ID:', newCertId)
      if (!context.tencentCertId) {
        context.tencentCertId = newCertId
      }
      return { tencentCertId: newCertId }
    } catch (e) {
      this.logger.warn('查询腾讯云证书失败', e)
    }
  }

  async getCertIdFromProps (client, props) {
    const listenerRet = await this.getListenerList(client, props.loadBalancerId, [props.listenerId])
    return this.getCertIdFromListener(listenerRet[0], props.domain)
  }

  getCertIdFromListener (listener, domain) {
    let certId
    if (!domain) {
      certId = listener.Certificate.CertId
    } else {
      if (listener.Rules && listener.Rules.length > 0) {
        for (const rule of listener.Rules) {
          if (rule.Domain === domain) {
            if (rule.Certificate != null) {
              certId = rule.Certificate.CertId
            }
            break
          }
        }
      }
    }
    return certId
  }

  async rollback ({ cert, props, context }) {
    this.logger.warn('未实现rollback')
  }

  async updateListener (client, cert, props, context) {
    const params = this.buildProps(props, context, cert)
    const ret = await client.ModifyListener(params)
    this.checkRet(ret)
    this.logger.info('设置腾讯云CLB证书成功:', ret.RequestId, '->loadBalancerId:', props.loadBalancerId, 'listenerId', props.listenerId)
    return ret
  }

  async updateByDomainAttr (client, cert, props, context) {
    const params = this.buildProps(props, context, cert)
    params.Domain = props.domain
    const ret = await client.ModifyDomainAttributes(params)
    this.checkRet(ret)
    this.logger.info('设置腾讯云CLB证书(sni)成功:', ret.RequestId, '->loadBalancerId:', props.loadBalancerId, 'listenerId', props.listenerId, 'domain:', props.domain)
    return ret
  }

  buildProps (props, context, cert) {
    const { certName } = props
    const { tencentCertId } = context
    this.logger.info('部署腾讯云证书ID:', tencentCertId)
    const params = {
      Certificate: {
        SSLMode: 'UNIDIRECTIONAL', // 单向认证
        CertId: tencentCertId
      },
      LoadBalancerId: props.loadBalancerId,
      ListenerId: props.listenerId
    }

    if (tencentCertId == null) {
      params.Certificate.CertName = this.appendTimeSuffix(certName || cert.domain)
      params.Certificate.CertKey = cert.key
      params.Certificate.CertContent = cert.crt
    }
    return params
  }

  async getCLBList (client, props) {
    const params = {
      Limit: 100, // 最大暂时只支持100个，暂时没做翻页
      OrderBy: 'CreateTime',
      OrderType: 0,
      ...props.DescribeLoadBalancers
    }
    const ret = await client.DescribeLoadBalancers(params)
    this.checkRet(ret)
    return ret.LoadBalancerSet
  }

  async getListenerList (client, balancerId, listenerIds) {
    // HTTPS
    const params = {
      LoadBalancerId: balancerId,
      Protocol: 'HTTPS',
      ListenerIds: listenerIds
    }
    const ret = await client.DescribeListeners(params)
    this.checkRet(ret)
    return ret.Listeners
  }

  getClient (accessProvider, region) {
    const ClbClient = tencentcloud.clb.v20180317.Client

    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey
      },
      region: region,
      profile: {
        httpProfile: {
          endpoint: 'clb.tencentcloudapi.com'
        }
      }
    }

    return new ClbClient(clientConfig)
  }
}
