import { AbstractTencentPlugin } from '../abstract-tencent.js'
import dayjs from 'dayjs'
import tencentcloud from 'tencentcloud-sdk-nodejs'

export class DeployCertToTencentCDN extends AbstractTencentPlugin {
  /**
   * 插件定义
   * 名称
   * 入参
   * 出参
   */
  static define () {
    return {
      name: 'deployCertToTencentCDN',
      label: '部署到腾讯云CDN',
      input: {
        domainName: {
          label: 'cdn加速域名',
          required: true
        },
        certName: {
          label: '证书名称',
          desc: '证书上传后将以此参数作为名称前缀'
        },
        certType: {
          default: 'upload',
          label: '证书来源',
          options: [
            { value: 'upload', label: '直接上传' },
            { value: 'cloud', label: '从证书库', desc: '需要uploadCertToTencent作为前置任务' }
          ],
          desc: '如果选择‘从证书库’类型，则需要以《上传证书到腾讯云》作为前置任务',
          required: true
        },
        accessProvider: {
          label: 'Access提供者',
          type: [String, Object],
          desc: 'access 授权',
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
    const client = this.getClient(accessProvider)
    const params = this.buildParams(props, context, cert)
    await this.doRequest(client, params)
  }

  async rollback ({ cert, props, context }) {

  }

  getClient (accessProvider) {
    const CdnClient = tencentcloud.cdn.v20180606.Client

    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey
      },
      region: '',
      profile: {
        httpProfile: {
          endpoint: 'cdn.tencentcloudapi.com'
        }
      }
    }

    return new CdnClient(clientConfig)
  }

  buildParams (props, context, cert) {
    const { domainName, from } = props
    const { tencentCertId } = context
    this.logger.info('部署腾讯云证书ID:', tencentCertId)
    const params = {
      Https: {
        Switch: 'on',
        CertInfo: {
          CertId: tencentCertId
          // Certificate: '1231',
          // PrivateKey: '1231'
        }
      },
      Domain: domainName
    }
    if (from === 'upload' || tencentCertId == null) {
      params.Https.CertInfo = {
        Certificate: cert.crt,
        PrivateKey: cert.key
      }
    }
    return params
  }

  async doRequest (client, params) {
    const ret = await client.UpdateDomainConfig(params)
    this.checkRet(ret)
    this.logger.info('设置腾讯云CDN证书成功:', ret.RequestId)
    return ret.RequestId
  }
}
