import { AbstractTencentPlugin } from '../../tencent/abstract-tencent.js'
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
          label: '证书名称'
        },
        certType: {
          value: 'upload',
          label: '证书来源',
          options: [
            { value: 'upload', label: '直接上传' },
            { value: 'cloud', label: '从证书库', desc: '需要uploadCertToTencent作为前置任务' }
          ],
          required: true
        },
        // serverCertificateStatus: {
        //   label: '启用https',
        //   options: [
        //     { value: 'on', label: '开启HTTPS，并更新证书' },
        //     { value: 'auto', label: '若HTTPS开启则更新，未开启不更新' }
        //   ],
        //   required:true
        // },
        accessProvider: {
          label: 'Access提供者',
          type: [String, Object],
          desc: 'AccessProviders的key 或 一个包含accessKeyId与accessKeySecret的对象',
          options: 'accessProviders[type=aliyun]',
          required: true
        }
      },
      output: {

      }
    }
  }

  async execute ({ accessProviders, cert, props, context }) {
    const accessProvider = this.getAccessProvider(props.accessProvider, accessProviders)
    const client = this.getClient(accessProvider)
    const params = this.buildParams(props, context, cert)
    await this.doRequest(client, params)
  }

  async rollback ({ accessProviders, cert, props, context }) {

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
        Certificate: this.format(cert.crt.toString()),
        PrivateKey: this.format(cert.key.toString())
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
