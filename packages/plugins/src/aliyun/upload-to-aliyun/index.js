import { AbstractPlugin } from '../../abstract-plugin/index.js'
import Core from '@alicloud/pop-core'
import dayjs from 'dayjs'
import { AbstractAliyunPlugin } from '../abstract-aliyun.js'
export class UploadToAliyunPlugin extends AbstractAliyunPlugin {
  /**
   * 插件定义
   * 名称
   * 入参
   * 出参
   */
  static define () {
    return {
      name: 'updateToAliyun',
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

  async execute ({ accessProviders, cert, args, context }) {
    const { name, provider } = args
    const certName = name + '-' + dayjs().format('YYYYMMDDHHmmss')
    const params = {
      RegionId: 'cn-hangzhou',
      Name: certName,
      Cert: this.format(cert.crt.toString()),
      Key: this.format(cert.key.toString())
    }

    const requestOption = {
      method: 'POST'
    }

    const accesseProvider = this.getAccessProvider(provider, accessProviders)
    const client = this.getClient(accesseProvider)
    const ret = await client.request('CreateUserCertificate', params, requestOption)
    this.checkRet(ret)
    context.aliyunCertId = ret.CertId
  }
}
