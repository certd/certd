import Core from '@alicloud/pop-core'
import dayjs from 'dayjs'
import { AbstractAliyunPlugin } from '../abstract-aliyun.js'
export class UploadCertToAliyun extends AbstractAliyunPlugin {
  /**
   * 插件定义
   * 名称
   * 入参
   * 出参
   */
  static define () {
    return {
      name: 'uploadCertToAliyun',
      label: '上传证书到阿里云',
      input: {
        name: {
          label: '证书名称'
        },
        accessProvider: {
          label: 'Access提供者',
          type: [String, Object],
          desc: 'AccessProviders的key 或 一个包含accessKeyId与accessKeySecret的对象',
          options: 'accessProviders[type=aliyun]'
        }
      },
      output: {
        aliyunCertId: {
          type: String,
          desc: '上传成功后的阿里云CertId'
        }
      }
    }
  }

  getClient (aliyunProvider) {
    return new Core({
      accessKeyId: aliyunProvider.accessKeyId,
      accessKeySecret: aliyunProvider.accessKeySecret,
      endpoint: 'https://cas.aliyuncs.com',
      apiVersion: '2018-07-13'
    })
  }

  async execute ({ accessProviders, cert, props, context, logger }) {
    const { name, accessProvider } = props
    const certName = name + '-' + dayjs().format('YYYYMMDD-HHmmss')
    const params = {
      RegionId: 'cn-hangzhou',
      Name: certName,
      Cert: this.format(cert.crt.toString()),
      Key: this.format(cert.key.toString())
    }

    const requestOption = {
      method: 'POST'
    }

    const provider = super.getAccessProvider(accessProvider, accessProviders)
    const client = this.getClient(provider)
    const ret = await client.request('CreateUserCertificate', params, requestOption)
    this.checkRet(ret)
    this.logger.info('证书上传成功：aliyunCertId=', ret.CertId)
    context.aliyunCertId = ret.CertId
  }
}
