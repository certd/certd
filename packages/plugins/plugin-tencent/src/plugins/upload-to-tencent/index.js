import tencentcloud from 'tencentcloud-sdk-nodejs'
import { AbstractTencentPlugin } from '../abstract-tencent.js'

export class UploadCertToTencent extends AbstractTencentPlugin {
  /**
   * 插件定义
   * 名称
   * 入参
   * 出参
   */
  static define () {
    return {
      name: 'uploadCertToTencent',
      title: '上传证书到腾讯云',
      desc: '成功后获取，tencentCertId',
      input: {
        name: {
          title: '证书名称'
        },
        accessProvider: {
          title: 'Access授权',
          helper: 'access授权',
          component: {
            name: 'access-selector',
            type: 'tencent'
          },
          required: true
        }
      },
      output: {
        tencentCertId: {
          type: String,
          desc: '上传成功后的腾讯云CertId'
        }
      }
    }
  }

  getClient (accessProvider) {
    const SslClient = tencentcloud.ssl.v20191205.Client

    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey
      },
      region: '',
      profile: {
        httpProfile: {
          endpoint: 'ssl.tencentcloudapi.com'
        }
      }
    }

    return new SslClient(clientConfig)
  }

  async execute ({ cert, props, context, logger }) {
    const { name, accessProvider } = props
    const certName = this.appendTimeSuffix(name || cert.domain)

    const provider = this.getAccessProvider(accessProvider)
    const client = this.getClient(provider)

    const params = {
      CertificatePublicKey: cert.crt,
      CertificatePrivateKey: cert.key,
      Alias: certName
    }
    const ret = await client.UploadCertificate(params)
    this.checkRet(ret)
    this.logger.info('证书上传成功：tencentCertId=', ret.CertificateId)
    context.tencentCertId = ret.CertificateId
  }

  async rollback ({ cert, props, context }) {
    const { accessProvider } = props
    const provider = super.getAccessProvider(accessProvider)
    const client = this.getClient(provider)

    const { tencentCertId } = context
    const params = {
      CertificateId: tencentCertId
    }
    const ret = await client.DeleteCertificate(params)
    this.checkRet(ret)
    this.logger.info('证书删除成功：DeleteResult=', ret.DeleteResult)
    delete context.tencentCertId
  }
}
