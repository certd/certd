import dayjs from 'dayjs'
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
      label: '上传证书到腾讯云',
      input: {
        name: {
          label: '证书名称'
        },
        accessProvider: {
          label: 'Access提供者',
          type: [String, Object],
          desc: 'AccessProviders的key 或 一个包含accessKeyId与accessKeySecret的对象',
          options: 'accessProviders[type=tencent]'
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

  async execute ({ accessProviders, cert, props, context, logger }) {
    const { name, accessProvider } = props
    const certName = this.appendTimeSuffix(name)

    const provider = super.getAccessProvider(accessProvider, accessProviders)
    const client = this.getClient(provider)

    const params = {
      CertificatePublicKey: this.format(cert.crt.toString()),
      CertificatePrivateKey: this.format(cert.key.toString()),
      Alias: certName
    }
    const ret = await client.UploadCertificate(params)
    this.checkRet(ret)
    this.logger.info('证书上传成功：tencentCertId=', ret.CertificateId)
    context.tencentCertId = ret.CertificateId
  }

  async rollback ({ accessProviders, cert, props, context }) {
    const { accessProvider } = props
    const provider = super.getAccessProvider(accessProvider, accessProviders)
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
